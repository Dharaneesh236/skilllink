"""Reviews and Ratings Router"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Job, Review, Notification
from app.schemas import ReviewCreate, ReviewOut
from app.auth.deps import get_current_user

router = APIRouter(prefix="/reviews", tags=["Reviews"])


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    payload: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a rating and review for a completed job."""
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Reviews can only be submitted for completed jobs")
    
    # Authorized reviewer check
    is_customer = (job.customer_id == current_user.id)
    is_worker = (job.assigned_worker_id == current_user.id)
    if not is_customer and not is_worker:
        raise HTTPException(status_code=403, detail="You are not a participant in this job")
    
    # Check already reviewed
    existing = db.query(Review).filter(
        Review.job_id == job.id,
        Review.reviewer_id == current_user.id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already submitted a review for this job")
    
    target_id = job.assigned_worker_id if is_customer else job.customer_id
    if payload.reviewee_id != target_id:
        raise HTTPException(status_code=400, detail="Reviewee must be the other job participant")

    review = Review(
        job_id=job.id,
        reviewer_id=current_user.id,
        reviewee_id=target_id,
        stars=payload.stars,
        comment=payload.comment.strip() if payload.comment else ""
    )
    db.add(review)

    # Notification to recipient
    db.add(Notification(
        user_id=target_id,
        type="review_received",
        payload={
            "job_id": job.id,
            "reviewer_name": current_user.name,
            "stars": payload.stars,
            "comment": review.comment
        }
    ))

    db.commit()
    db.refresh(review)

    return ReviewOut(
        id=review.id,
        job_id=review.job_id,
        reviewer_id=review.reviewer_id,
        reviewer_name=current_user.name,
        reviewee_id=review.reviewee_id,
        stars=review.stars,
        comment=review.comment,
        created_at=review.created_at
    )


@router.get("/user/{user_id}", response_model=List[ReviewOut])
def get_user_reviews(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Retrieves all reviews received by a user."""
    reviews = db.query(Review).filter(Review.reviewee_id == user_id).order_by(Review.created_at.desc()).all()
    return [
        ReviewOut(
            id=r.id,
            job_id=r.job_id,
            reviewer_id=r.reviewer_id,
            reviewer_name=r.reviewer.name if r.reviewer else "Anonymous",
            reviewee_id=r.reviewee_id,
            stars=r.stars,
            comment=r.comment,
            created_at=r.created_at
        )
        for r in reviews
    ]
