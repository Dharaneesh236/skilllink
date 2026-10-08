"""Workers and Profile Router"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import User, WorkerProfile, Review, ReportBlock
from app.schemas import WorkerProfileUpdate, WorkerProfileOut, UserOut
from app.auth.deps import get_current_user, require_worker
from app.matching.service import get_blocked_user_ids

router = APIRouter(tags=["Workers"])


def get_worker_rating_and_count(db: Session, user_id: int):
    review_stats = db.query(
        func.avg(Review.stars).label("avg_rating"),
        func.count(Review.id).label("count")
    ).filter(Review.reviewee_id == user_id).first()
    avg_rating = round(float(review_stats.avg_rating), 1) if review_stats and review_stats.avg_rating else 0.0
    review_count = int(review_stats.count) if review_stats and review_stats.count else 0
    return avg_rating, review_count


@router.get("/workers", response_model=List[WorkerProfileOut])
def list_workers(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user)
):
    """Lists registered workers. Contact details are masked for privacy."""
    blocked_ids = get_blocked_user_ids(db, current_user.id) if current_user else set()
    query = db.query(WorkerProfile).join(User, WorkerProfile.user_id == User.id)
    if blocked_ids:
        query = query.filter(~WorkerProfile.user_id.in_(blocked_ids))
    profiles = query.all()

    result = []
    for p in profiles:
        avg_rating, review_count = get_worker_rating_and_count(db, p.user_id)
        result.append(
            WorkerProfileOut(
                id=p.id,
                user_id=p.user_id,
                skills=p.skills or [],
                location_text=p.location_text or "",
                lat=p.lat,
                lng=p.lng,
                availability_start=p.availability_start or "08:00",
                availability_end=p.availability_end or "18:00",
                available_days=p.available_days or [],
                expected_payment=p.expected_payment or 0.0,
                daily_goal=p.daily_goal or 0.0,
                max_distance_km=p.max_distance_km or 20.0,
                bio=p.bio or "",
                user_name=p.user.name if p.user else None,
                average_rating=avg_rating,
                review_count=review_count
            )
        )
    return result


@router.get("/profile", response_model=WorkerProfileOut)
def get_my_profile(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Retrieves current logged-in worker's profile."""
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        profile = WorkerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    avg_rating, review_count = get_worker_rating_and_count(db, current_user.id)
    return WorkerProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        skills=profile.skills or [],
        location_text=profile.location_text or "",
        lat=profile.lat,
        lng=profile.lng,
        availability_start=profile.availability_start or "08:00",
        availability_end=profile.availability_end or "18:00",
        available_days=profile.available_days or [],
        expected_payment=profile.expected_payment or 0.0,
        daily_goal=profile.daily_goal or 0.0,
        max_distance_km=profile.max_distance_km or 20.0,
        bio=profile.bio or "",
        user_name=current_user.name,
        average_rating=avg_rating,
        review_count=review_count
    )


@router.put("/profile", response_model=WorkerProfileOut)
def update_my_profile(
    payload: WorkerProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Updates worker skills, location, availability window, daily goal, etc."""
    profile = db.query(WorkerProfile).filter(WorkerProfile.user_id == current_user.id).first()
    if not profile:
        profile = WorkerProfile(user_id=current_user.id)
        db.add(profile)

    profile.skills = [s.strip().lower() for s in payload.skills if s.strip()]
    profile.location_text = payload.location_text.strip()
    profile.lat = payload.lat
    profile.lng = payload.lng
    profile.availability_start = payload.availability_start
    profile.availability_end = payload.availability_end
    profile.available_days = payload.available_days
    profile.expected_payment = payload.expected_payment
    profile.daily_goal = payload.daily_goal
    profile.max_distance_km = payload.max_distance_km
    profile.bio = payload.bio.strip() if payload.bio else ""

    db.commit()
    db.refresh(profile)

    avg_rating, review_count = get_worker_rating_and_count(db, current_user.id)
    return WorkerProfileOut(
        id=profile.id,
        user_id=profile.user_id,
        skills=profile.skills or [],
        location_text=profile.location_text or "",
        lat=profile.lat,
        lng=profile.lng,
        availability_start=profile.availability_start or "08:00",
        availability_end=profile.availability_end or "18:00",
        available_days=profile.available_days or [],
        expected_payment=profile.expected_payment or 0.0,
        daily_goal=profile.daily_goal or 0.0,
        max_distance_km=profile.max_distance_km or 20.0,
        bio=profile.bio or "",
        user_name=current_user.name,
        average_rating=avg_rating,
        review_count=review_count
    )
