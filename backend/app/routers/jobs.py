"""Jobs Router for Job Lifecycle and Trust-Checked Execution"""

import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Job, WorkerProfile, Application, Notification
from app.schemas import JobCreate, JobOut
from app.auth.deps import get_current_user, require_customer, require_worker
from app.matching.service import get_blocked_user_ids, build_candidate_job, build_candidate_worker
from app.matching.engine import match_single_pair
from app.websocket.manager import manager

router = APIRouter(prefix="/jobs", tags=["Jobs"])


class StartJobPayload(BaseModel):
    start_code: str


def format_job_out(job: Job, current_user: Optional[User]) -> JobOut:
    app_count = len(job.applications) if job.applications else 0

    # Privacy checks
    customer_name = job.customer.name if job.customer else None
    assigned_name = job.assigned_worker.name if job.assigned_worker else None

    # Reveal phone and start code only after acceptance to authorized parties
    customer_phone = None
    assigned_worker_phone = None
    start_code_to_reveal = None

    if current_user:
        is_owner = (job.customer_id == current_user.id)
        is_assigned = (job.assigned_worker_id == current_user.id)

        if is_owner:
            customer_phone = job.customer.phone if job.customer else None
            start_code_to_reveal = job.start_code  # Owner always sees start code to share with worker
            if is_assigned or job.status in ["assigned", "in_progress", "completed"]:
                assigned_worker_phone = job.assigned_worker.phone if job.assigned_worker else None
        elif is_assigned:
            customer_phone = job.customer.phone if job.customer else None
            assigned_worker_phone = current_user.phone
            # Worker does not see the code upfront; customer shares it with them in person

    return JobOut(
        id=job.id,
        customer_id=job.customer_id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        title=job.title,
        required_skill=job.required_skill,
        description=job.description or "",
        location_text=job.location_text,
        lat=job.lat,
        lng=job.lng,
        date=job.date,
        start_time=job.start_time,
        end_time=job.end_time,
        budget=job.budget,
        status=job.status,
        assigned_worker_id=job.assigned_worker_id,
        assigned_worker_name=assigned_name,
        assigned_worker_phone=assigned_worker_phone,
        start_code=start_code_to_reveal,
        created_at=job.created_at,
        applications_count=app_count
    )


@router.get("", response_model=List[JobOut])
def list_available_jobs(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Lists all available open jobs."""
    blocked_ids = get_blocked_user_ids(db, current_user.id) if current_user else set()
    query = db.query(Job).filter(Job.status == "available")
    if blocked_ids:
        query = query.filter(~Job.customer_id.in_(blocked_ids))
    jobs = query.order_by(Job.created_at.desc()).all()
    return [format_job_out(j, current_user) for j in jobs]


@router.get("/my", response_model=List[JobOut])
def list_my_posted_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Lists all jobs posted by the logged-in customer."""
    jobs = db.query(Job).filter(Job.customer_id == current_user.id).order_by(Job.created_at.desc()).all()
    return [format_job_out(j, current_user) for j in jobs]


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Customer posts a new job. Eligible workers receive notifications and live WebSocket update."""
    job = Job(
        customer_id=current_user.id,
        title=payload.title.strip(),
        required_skill=payload.required_skill.strip().lower(),
        description=payload.description.strip() if payload.description else "",
        location_text=payload.location_text.strip(),
        lat=payload.lat,
        lng=payload.lng,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        budget=payload.budget,
        status="available"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Lifecycle: Find matching eligible workers and send realtime alerts + notifications
    blocked_ids = get_blocked_user_ids(db, current_user.id)
    worker_users = db.query(User).filter(
        User.role == "worker",
        ~User.id.in_(blocked_ids) if blocked_ids else True
    ).all()

    cand_job = build_candidate_job(job)
    notified_worker_ids = []

    for w_user in worker_users:
        cand_worker = build_candidate_worker(db, w_user)
        match_res = match_single_pair(cand_worker, cand_job)
        if not match_res["flags"]["not_eligible"]:
            notified_worker_ids.append(w_user.id)
            notif = Notification(
                user_id=w_user.id,
                type="job_posted",
                payload={
                    "job_id": job.id,
                    "title": job.title,
                    "skill": job.required_skill,
                    "budget": job.budget,
                    "location": job.location_text,
                    "match_score": match_res["total_score"]
                }
            )
            db.add(notif)
    
    db.commit()

    # Realtime WebSocket event push to matching workers
    job_data = {
        "job_id": job.id,
        "title": job.title,
        "required_skill": job.required_skill,
        "budget": job.budget,
        "location_text": job.location_text,
        "date": job.date
    }
    await manager.send_to_users(notified_worker_ids, "NEW_JOB_AVAILABLE", job_data)
    # Also broadcast for live dashboards
    await manager.broadcast("JOB_STATUS_UPDATED", {"job_id": job.id, "status": "available"})

    return format_job_out(job, current_user)


@router.get("/{job_id}", response_model=JobOut)
def get_job_by_id(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Retrieves a specific job's details."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if current_user:
        blocked_ids = get_blocked_user_ids(db, current_user.id)
        if job.customer_id in blocked_ids:
            raise HTTPException(status_code=403, detail="User is blocked")

    return format_job_out(job, current_user)


@router.post("/{job_id}/start")
async def start_job(
    job_id: int,
    payload: StartJobPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """
    Worker enters the 4-digit start code provided by customer upon physical arrival.
    Shifts job status to 'in_progress'.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.assigned_worker_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the assigned worker for this job")
    
    if job.status != "assigned":
        raise HTTPException(status_code=400, detail=f"Job cannot be started in status '{job.status}'")
    
    if not job.start_code or payload.start_code.strip() != job.start_code.strip():
        raise HTTPException(status_code=400, detail="Invalid start code. Ask the customer for the 4-digit code.")
    
    job.status = "in_progress"
    db.commit()

    # Notify customer
    notif = Notification(
        user_id=job.customer_id,
        type="job_started",
        payload={"job_id": job.id, "title": job.title, "worker_name": current_user.name}
    )
    db.add(notif)
    db.commit()

    await manager.send_personal_event(job.customer_id, "JOB_STARTED", {"job_id": job.id, "status": "in_progress"})
    await manager.send_personal_event(current_user.id, "JOB_STARTED", {"job_id": job.id, "status": "in_progress"})

    return {"message": "Job successfully started", "job_id": job.id, "status": "in_progress"}


@router.post("/{job_id}/complete")
async def complete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Customer marks the job as completed."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not authorized to complete this job")
    
    if job.status not in ["assigned", "in_progress"]:
        raise HTTPException(status_code=400, detail=f"Job cannot be completed in status '{job.status}'")
    
    job.status = "completed"
    db.commit()

    if job.assigned_worker_id:
        notif = Notification(
            user_id=job.assigned_worker_id,
            type="job_completed",
            payload={"job_id": job.id, "title": job.title, "budget": job.budget}
        )
        db.add(notif)
        db.commit()

        await manager.send_personal_event(
            job.assigned_worker_id,
            "JOB_COMPLETED",
            {"job_id": job.id, "status": "completed", "budget": job.budget}
        )

    await manager.send_personal_event(current_user.id, "JOB_COMPLETED", {"job_id": job.id, "status": "completed"})

    return {"message": "Job marked as completed", "job_id": job.id, "status": "completed"}
