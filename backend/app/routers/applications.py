"""Applications Router for Job Applications and Hiring Decisions"""

import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Job, Application, Notification, WorkerProfile, Review
from app.schemas import ApplicationCreate, ApplicationOut, JobOut
from app.auth.deps import get_current_user, require_worker, require_customer
from app.matching.service import build_candidate_worker, build_candidate_job, get_blocked_user_ids
from app.matching.engine import match_single_pair
from app.websocket.manager import manager

router = APIRouter(tags=["Applications"])


class DecisionPayload(BaseModel):
    application_id: int


def format_application_out(app: Application, db: Session, current_user: User) -> ApplicationOut:
    worker = app.worker
    profile = worker.worker_profile if worker else None

    # Compute worker ratings
    from app.routers.workers import get_worker_rating_and_count
    avg_rating, count = get_worker_rating_and_count(db, worker.id) if worker else (0.0, 0)

    # Phone revelation logic: only if accepted or customer owns job & status is accepted
    worker_phone = None
    if app.status == "accepted" and (current_user.id == app.job.customer_id or current_user.id == worker.id):
        worker_phone = worker.phone

    # Format nested job
    from app.routers.jobs import format_job_out
    job_out = format_job_out(app.job, current_user)

    return ApplicationOut(
        id=app.id,
        job_id=app.job_id,
        worker_id=app.worker_id,
        worker_name=worker.name if worker else None,
        worker_skills=profile.skills if profile else [],
        worker_rating=avg_rating,
        worker_review_count=count,
        worker_phone=worker_phone,
        match_score=app.match_score,
        score_breakdown=app.score_breakdown or {},
        status=app.status,
        applied_at=app.applied_at,
        job=job_out
    )


@router.post("/apply", response_model=ApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_for_job(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Worker applies for an open job."""
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "available":
        raise HTTPException(status_code=400, detail="Job is not available for applications")
    
    blocked_ids = get_blocked_user_ids(db, current_user.id)
    if job.customer_id in blocked_ids:
        raise HTTPException(status_code=403, detail="Cannot apply to this job")

    existing_app = db.query(Application).filter(
        Application.job_id == job.id,
        Application.worker_id == current_user.id
    ).first()
    if existing_app:
        raise HTTPException(status_code=400, detail="You have already applied for this job")

    # Evaluate dynamic match score & breakdown
    cand_worker = build_candidate_worker(db, current_user)
    cand_job = build_candidate_job(job)
    eval_result = match_single_pair(cand_worker, cand_job)

    # Create application with computed scores
    application = Application(
        job_id=job.id,
        worker_id=current_user.id,
        match_score=eval_result["total_score"],
        score_breakdown=eval_result["breakdown"],
        status="applied"
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    # Realtime notification to customer
    notif = Notification(
        user_id=job.customer_id,
        type="job_applied",
        payload={
            "job_id": job.id,
            "job_title": job.title,
            "application_id": application.id,
            "worker_name": current_user.name,
            "match_score": eval_result["total_score"]
        }
    )
    db.add(notif)
    db.commit()

    # WebSocket event push to customer
    await manager.send_personal_event(
        job.customer_id,
        "NEW_APPLICATION",
        {
            "job_id": job.id,
            "application_id": application.id,
            "worker_name": current_user.name,
            "match_score": eval_result["total_score"]
        }
    )

    return format_application_out(application, db, current_user)


@router.get("/applications", response_model=List[ApplicationOut])
def get_my_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Retrieves all applications submitted by the logged-in worker."""
    apps = db.query(Application).filter(Application.worker_id == current_user.id).order_by(Application.applied_at.desc()).all()
    return [format_application_out(a, db, current_user) for a in apps]


@router.get("/jobs/{job_id}/applications", response_model=List[ApplicationOut])
def get_job_applications(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Customer views applications received for one of their posted jobs."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view applications for this job")

    apps = db.query(Application).filter(Application.job_id == job_id).order_by(Application.match_score.desc()).all()
    return [format_application_out(a, db, current_user) for a in apps]


@router.post("/accept-job", response_model=ApplicationOut)
async def accept_application(
    payload: DecisionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """
    Customer accepts worker application.
    Generates 4-digit start code, assigns job, auto-rejects other applications with reason 'job filled'.
    """
    application = db.query(Application).filter(Application.id == payload.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = application.job
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to accept applications for this job")
    
    if job.status != "available":
        raise HTTPException(status_code=400, detail=f"Cannot accept application: job status is '{job.status}'")

    # Generate 4-digit trust start code
    start_code = f"{random.randint(1000, 9999)}"
    job.status = "assigned"
    job.assigned_worker_id = application.worker_id
    job.start_code = start_code

    application.status = "accepted"

    # Auto-reject competing applicants
    other_apps = db.query(Application).filter(
        Application.job_id == job.id,
        Application.id != application.id,
        Application.status == "applied"
    ).all()

    rejected_worker_ids = []
    for other in other_apps:
        other.status = "rejected"
        rejected_worker_ids.append(other.worker_id)
        db.add(Notification(
            user_id=other.worker_id,
            type="application_rejected",
            payload={"job_id": job.id, "job_title": job.title, "reason": "Job filled by another applicant"}
        ))

    # Notify accepted worker
    db.add(Notification(
        user_id=application.worker_id,
        type="application_accepted",
        payload={
            "job_id": job.id,
            "job_title": job.title,
            "customer_name": current_user.name,
            "customer_phone": current_user.phone
        }
    ))

    db.commit()
    db.refresh(application)

    # Realtime WebSocket broadcasts
    await manager.send_personal_event(
        application.worker_id,
        "APPLICATION_ACCEPTED",
        {"job_id": job.id, "job_title": job.title}
    )

    for rej_id in rejected_worker_ids:
        await manager.send_personal_event(
            rej_id,
            "APPLICATION_REJECTED",
            {"job_id": job.id, "job_title": job.title, "reason": "Job filled"}
        )

    await manager.broadcast("JOB_STATUS_UPDATED", {"job_id": job.id, "status": "assigned"})

    return format_application_out(application, db, current_user)


@router.post("/reject-job", response_model=ApplicationOut)
async def reject_application(
    payload: DecisionPayload,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Customer rejects a specific worker application."""
    application = db.query(Application).filter(Application.id == payload.application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")
    
    job = application.job
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to reject applications for this job")
    
    application.status = "rejected"

    db.add(Notification(
        user_id=application.worker_id,
        type="application_rejected",
        payload={"job_id": job.id, "job_title": job.title, "reason": "Customer did not select this profile"}
    ))

    db.commit()
    db.refresh(application)

    await manager.send_personal_event(
        application.worker_id,
        "APPLICATION_REJECTED",
        {"job_id": job.id, "job_title": job.title}
    )

    return format_application_out(application, db, current_user)
