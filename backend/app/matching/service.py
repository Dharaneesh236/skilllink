"""Matching Service bridging SQLAlchemy Database Models and Pure-Python Engine"""

from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import httpx

from app.models import User, WorkerProfile, Job, Review, Application, ReportBlock
from app.matching.engine import (
    MatchCandidateWorker,
    MatchCandidateJob,
    EngineWeights,
    match_single_pair,
    rank_workers_for_job,
    rank_jobs_for_worker,
    compute_optimal_earning_plan
)
from app.config import settings


def get_blocked_user_ids(db: Session, user_id: int) -> set:
    """Returns set of user IDs that either blocked or were blocked by user_id."""
    records = db.query(ReportBlock).filter(
        (ReportBlock.reporter_id == user_id) | (ReportBlock.target_id == user_id),
        ReportBlock.action_type == "block"
    ).all()
    blocked = set()
    for r in records:
        if r.reporter_id == user_id:
            blocked.add(r.target_id)
        if r.target_id == user_id:
            blocked.add(r.reporter_id)
    return blocked


def build_candidate_worker(db: Session, user: User) -> MatchCandidateWorker:
    """Builds a MatchCandidateWorker from DB user and profile data, computing dynamic rating from reviews."""
    profile = user.worker_profile
    skills = profile.skills if profile and profile.skills else []
    location_text = profile.location_text if profile else ""
    lat = profile.lat if profile else None
    lng = profile.lng if profile else None
    avail_start = profile.availability_start if profile and profile.availability_start else "08:00"
    avail_end = profile.availability_end if profile and profile.availability_end else "18:00"
    available_days = profile.available_days if profile and profile.available_days else []
    expected_payment = profile.expected_payment if profile else 0.0
    daily_goal = profile.daily_goal if profile else 0.0
    max_dist = profile.max_distance_km if profile else 20.0

    # Dynamic rating computed from real reviews
    review_stats = db.query(
        func.avg(Review.stars).label("avg_rating"),
        func.count(Review.id).label("count")
    ).filter(Review.reviewee_id == user.id).first()

    avg_rating = round(float(review_stats.avg_rating), 1) if review_stats and review_stats.avg_rating else 0.0
    review_count = int(review_stats.count) if review_stats and review_stats.count else 0

    # Assigned slots to detect schedule conflicts
    active_jobs = db.query(Job).filter(
        Job.assigned_worker_id == user.id,
        Job.status.in_(["assigned", "in_progress"])
    ).all()

    assigned_slots = [
        {"date": j.date, "start_time": j.start_time, "end_time": j.end_time}
        for j in active_jobs
    ]

    return MatchCandidateWorker(
        id=user.id,
        name=user.name,
        skills=skills,
        location_text=location_text,
        lat=lat,
        lng=lng,
        availability_start=avail_start,
        availability_end=avail_end,
        available_days=available_days,
        expected_payment=expected_payment,
        daily_goal=daily_goal,
        max_distance_km=max_dist,
        average_rating=avg_rating,
        review_count=review_count,
        assigned_slots=assigned_slots
    )


def build_candidate_job(job: Job) -> MatchCandidateJob:
    """Builds MatchCandidateJob from Job DB model."""
    customer_name = job.customer.name if job.customer else None
    return MatchCandidateJob(
        id=job.id,
        title=job.title,
        required_skill=job.required_skill,
        location_text=job.location_text,
        lat=job.lat,
        lng=job.lng,
        date=job.date,
        start_time=job.start_time,
        end_time=job.end_time,
        budget=job.budget,
        customer_id=job.customer_id,
        customer_name=customer_name,
        status=job.status
    )


async def generate_optional_ai_explanation(
    required_skill: str,
    worker_skills: List[str],
    total_score: float,
    reasons: List[str]
) -> Optional[str]:
    """
    If GROQ_API_KEY is configured, requests a brief summary from Groq.
    Otherwise returns None (UI falls back to explainable deterministic reasons).
    """
    if not settings.GROQ_API_KEY:
        return None
    
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            prompt = (
                f"You are SkillLink's match summarizer. Briefly in 1-2 sentences explain why this match has score {total_score}/100. "
                f"Required skill: {required_skill}. Worker skills: {', '.join(worker_skills)}. "
                f"Breakdown points: {'; '.join(reasons)}. Keep it friendly and concise."
            )
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 100,
                    "temperature": 0.3
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
    except Exception:
        pass
    return None
