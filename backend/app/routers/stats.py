"""Dynamic Computed Statistics Router (Never Hardcoded)"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, Job, Application, Payment, WorkerProfile
from app.auth.deps import require_worker, require_customer
from app.matching.service import get_blocked_user_ids

router = APIRouter(prefix="/stats", tags=["Statistics"])


@router.get("/worker")
def get_worker_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Dynamically computes all worker statistics strictly from active database records."""
    blocked_ids = get_blocked_user_ids(db, current_user.id)

    # 1. Available jobs
    available_jobs_query = db.query(func.count(Job.id)).filter(Job.status == "available")
    if blocked_ids:
        available_jobs_query = available_jobs_query.filter(~Job.customer_id.in_(blocked_ids))
    jobs_available = available_jobs_query.scalar() or 0

    # 2. Applications applied
    jobs_applied = db.query(func.count(Application.id)).filter(
        Application.worker_id == current_user.id
    ).scalar() or 0

    # 3. Accepted applications
    jobs_accepted = db.query(func.count(Application.id)).filter(
        Application.worker_id == current_user.id,
        Application.status == "accepted"
    ).scalar() or 0

    # 4. Completed jobs
    jobs_completed = db.query(func.count(Job.id)).filter(
        Job.assigned_worker_id == current_user.id,
        Job.status == "completed"
    ).scalar() or 0

    # 5. Earnings from completed jobs
    completed_earnings = db.query(func.sum(Job.budget)).filter(
        Job.assigned_worker_id == current_user.id,
        Job.status == "completed"
    ).scalar() or 0.0

    # 6. Potential earnings from currently assigned / in-progress jobs
    active_potential = db.query(func.sum(Job.budget)).filter(
        Job.assigned_worker_id == current_user.id,
        Job.status.in_(["assigned", "in_progress"])
    ).scalar() or 0.0

    profile = current_user.worker_profile
    daily_goal = profile.daily_goal if profile else 0.0

    goal_progress = round((completed_earnings / daily_goal * 100.0) if daily_goal > 0 else 0.0, 1)

    return {
        "jobs_available": jobs_available,
        "jobs_applied": jobs_applied,
        "jobs_accepted": jobs_accepted,
        "jobs_completed": jobs_completed,
        "total_earned": round(float(completed_earnings), 2),
        "potential_earnings": round(float(active_potential), 2),
        "daily_goal": round(float(daily_goal), 2),
        "goal_progress_percent": goal_progress
    }


@router.get("/customer")
def get_customer_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """Dynamically computes all customer statistics strictly from active database records."""
    jobs_posted = db.query(func.count(Job.id)).filter(
        Job.customer_id == current_user.id
    ).scalar() or 0

    # Applications received across all customer's jobs
    apps_received = db.query(func.count(Application.id)).join(
        Job, Application.job_id == Job.id
    ).filter(Job.customer_id == current_user.id).scalar() or 0

    jobs_assigned = db.query(func.count(Job.id)).filter(
        Job.customer_id == current_user.id,
        Job.status.in_(["assigned", "in_progress"])
    ).scalar() or 0

    jobs_completed = db.query(func.count(Job.id)).filter(
        Job.customer_id == current_user.id,
        Job.status == "completed"
    ).scalar() or 0

    total_spent = db.query(func.sum(Job.budget)).filter(
        Job.customer_id == current_user.id,
        Job.status == "completed"
    ).scalar() or 0.0

    return {
        "jobs_posted": jobs_posted,
        "applications_received": apps_received,
        "jobs_assigned": jobs_assigned,
        "jobs_completed": jobs_completed,
        "total_spent": round(float(total_spent), 2)
    }
