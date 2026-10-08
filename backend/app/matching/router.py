"""Matching Router Endpoints"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Job, WorkerProfile
from app.schemas import (
    MatchEvaluationOut,
    MatchPreviewInput,
    ReverseMatchPreviewInput,
    WeightsInput
)
from app.auth.deps import get_current_user, require_worker, require_customer
from app.matching.engine import (
    EngineWeights,
    MatchCandidateWorker,
    MatchCandidateJob,
    match_single_pair,
    rank_workers_for_job,
    rank_jobs_for_worker,
    compute_optimal_earning_plan
)
from app.matching.service import (
    build_candidate_worker,
    build_candidate_job,
    get_blocked_user_ids,
    generate_optional_ai_explanation
)

router = APIRouter(tags=["Matching"])


class MatchPairRequest(BaseModel):
    worker_id: int
    job_id: int
    weights: Optional[WeightsInput] = None


@router.post("/match", response_model=MatchEvaluationOut)
async def match_pair(payload: MatchPairRequest, db: Session = Depends(get_db)):
    """Computes exact match breakdown between a specific worker and job."""
    worker_user = db.query(User).filter(User.id == payload.worker_id, User.role == "worker").first()
    if not worker_user:
        raise HTTPException(status_code=404, detail="Worker not found")
    
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    cand_worker = build_candidate_worker(db, worker_user)
    cand_job = build_candidate_job(job)

    weights = None
    if payload.weights:
        weights = EngineWeights(
            skill=payload.weights.skill,
            location=payload.weights.location,
            availability=payload.weights.availability,
            rating=payload.weights.rating,
            payment=payload.weights.payment
        )

    result = match_single_pair(cand_worker, cand_job, weights)

    # Optional Groq summary
    ai_expl = await generate_optional_ai_explanation(
        job.required_skill,
        cand_worker.skills,
        result["total_score"],
        result["reasons"]
    )
    result["ai_explanation"] = ai_expl

    return result


@router.get("/match/job/{job_id}", response_model=List[MatchEvaluationOut])
def get_ranked_workers_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ranks all eligible workers for a given job posted by current customer."""
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if current_user.role == "customer" and job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view candidates for this job")

    blocked_ids = get_blocked_user_ids(db, job.customer_id)
    cand_job = build_candidate_job(job)

    # Query all workers who have a profile and are not blocked
    worker_users = db.query(User).filter(
        User.role == "worker",
        ~User.id.in_(blocked_ids) if blocked_ids else True
    ).all()

    candidates = [build_candidate_worker(db, u) for u in worker_users]
    ranked = rank_workers_for_job(cand_job, candidates)
    return ranked


@router.get("/recommend-jobs", response_model=List[MatchEvaluationOut])
@router.post("/recommend-jobs", response_model=List[MatchEvaluationOut])
def recommend_jobs_for_worker(
    weights: Optional[WeightsInput] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Worker -> Opportunities: Ranks all available open jobs for the logged-in worker."""
    blocked_ids = get_blocked_user_ids(db, current_user.id)
    cand_worker = build_candidate_worker(db, current_user)

    # Query all available jobs not posted by blocked customers
    query = db.query(Job).filter(Job.status == "available")
    if blocked_ids:
        query = query.filter(~Job.customer_id.in_(blocked_ids))
    jobs = query.all()

    candidate_jobs = [build_candidate_job(j) for j in jobs]

    engine_weights = None
    if weights:
        engine_weights = EngineWeights(
            skill=weights.skill,
            location=weights.location,
            availability=weights.availability,
            rating=weights.rating,
            payment=weights.payment
        )

    ranked = rank_jobs_for_worker(cand_worker, candidate_jobs, engine_weights)
    return ranked


@router.get("/earning-plan")
def get_earning_plan(
    date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_worker)
):
    """Computes optimal non-overlapping daily job schedule using weighted interval scheduling."""
    cand_worker = build_candidate_worker(db, current_user)
    daily_goal = cand_worker.daily_goal

    blocked_ids = get_blocked_user_ids(db, current_user.id)
    query = db.query(Job).filter(Job.status == "available", Job.date == date)
    if blocked_ids:
        query = query.filter(~Job.customer_id.in_(blocked_ids))
    jobs = query.all()

    candidate_jobs = [build_candidate_job(j) for j in jobs]
    plan = compute_optimal_earning_plan(cand_worker, candidate_jobs, date, daily_goal)
    return plan


@router.post("/match/preview", response_model=List[MatchEvaluationOut])
def match_preview(payload: MatchPreviewInput, db: Session = Depends(get_db)):
    """Ad-hoc interactive matching for Live Engine page with real registered workers."""
    cand_job = MatchCandidateJob(
        id=0,
        title=payload.title,
        required_skill=payload.required_skill,
        location_text=payload.location_text,
        lat=payload.lat,
        lng=payload.lng,
        date=payload.date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        budget=payload.budget,
        customer_id=0,
        customer_name="Demo Customer",
        status="available"
    )

    worker_users = db.query(User).filter(User.role == "worker").all()
    candidates = [build_candidate_worker(db, u) for u in worker_users]

    engine_weights = None
    if payload.weights:
        engine_weights = EngineWeights(
            skill=payload.weights.skill,
            location=payload.weights.location,
            availability=payload.weights.availability,
            rating=payload.weights.rating,
            payment=payload.weights.payment
        )

    ranked = rank_workers_for_job(cand_job, candidates, engine_weights)
    return ranked


@router.post("/match/reverse-preview", response_model=List[MatchEvaluationOut])
def reverse_match_preview(payload: ReverseMatchPreviewInput, db: Session = Depends(get_db)):
    """Reverse matching for Live Engine page: evaluates open jobs against ad-hoc worker details."""
    cand_worker = MatchCandidateWorker(
        id=0,
        name="Demo Worker",
        skills=payload.skills,
        location_text=payload.location_text,
        lat=payload.lat,
        lng=payload.lng,
        availability_start=payload.availability_start,
        availability_end=payload.availability_end,
        available_days=payload.available_days,
        expected_payment=payload.expected_payment,
        daily_goal=0.0,
        max_distance_km=payload.max_distance_km,
        average_rating=0.0,
        review_count=0
    )

    open_jobs = db.query(Job).filter(Job.status == "available").all()
    candidate_jobs = [build_candidate_job(j) for j in open_jobs]

    engine_weights = None
    if payload.weights:
        engine_weights = EngineWeights(
            skill=payload.weights.skill,
            location=payload.weights.location,
            availability=payload.weights.availability,
            rating=payload.weights.rating,
            payment=payload.weights.payment
        )

    ranked = rank_jobs_for_worker(cand_worker, candidate_jobs, engine_weights)
    return ranked
