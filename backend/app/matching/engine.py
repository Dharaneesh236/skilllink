"""
SkillLink Pure-Python Matching Engine (Core Component)
------------------------------------------------------
No database or network calls. Fully deterministic, unit-testable, and explainable.
Weights: Skill (40), Location (20), Availability (20), Rating (10), Payment (10)
"""

import math
from datetime import datetime, time
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field

# Configurable Related Skills Taxonomy (normalized lower-case)
RELATED_SKILLS_MAP: Dict[str, List[str]] = {
    "cleaning": ["household assistance", "cooking assistance", "packing"],
    "household assistance": ["cleaning", "cooking assistance", "elderly assistance", "grocery pickup"],
    "cooking assistance": ["household assistance", "cleaning"],
    "gardening": ["household assistance"],
    "packing": ["delivery", "grocery pickup", "household assistance"],
    "delivery": ["grocery pickup", "packing"],
    "grocery pickup": ["delivery", "household assistance"],
    "elderly assistance": ["household assistance", "cooking assistance", "grocery pickup"],
    "other": []
}

DEFAULT_WEIGHTS = {
    "skill": 40.0,
    "location": 20.0,
    "availability": 20.0,
    "rating": 10.0,
    "payment": 10.0,
}

DEFAULT_MAX_DISTANCE_KM = 20.0


@dataclass
class EngineWeights:
    skill: float = 40.0
    location: float = 20.0
    availability: float = 20.0
    rating: float = 10.0
    payment: float = 10.0

    def normalized(self) -> Dict[str, float]:
        total = self.skill + self.location + self.availability + self.rating + self.payment
        if total <= 0:
            return {k: 20.0 for k in ["skill", "location", "availability", "rating", "payment"]}
        factor = 100.0 / total
        return {
            "skill": round(self.skill * factor, 2),
            "location": round(self.location * factor, 2),
            "availability": round(self.availability * factor, 2),
            "rating": round(self.rating * factor, 2),
            "payment": round(self.payment * factor, 2),
        }


@dataclass
class MatchCandidateWorker:
    id: int
    name: str
    skills: List[str]
    location_text: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability_start: str = "00:00"  # HH:MM
    availability_end: str = "23:59"    # HH:MM
    available_days: List[str] = field(default_factory=list)  # e.g. ["Monday", "Tuesday"]
    expected_payment: float = 0.0
    daily_goal: float = 0.0
    max_distance_km: Optional[float] = None
    average_rating: float = 0.0
    review_count: int = 0
    assigned_slots: List[Dict[str, Any]] = field(default_factory=list)  # [{"date": "2026-10-10", "start_time": "09:00", "end_time": "12:00"}]


@dataclass
class MatchCandidateJob:
    id: int
    title: str
    required_skill: str
    location_text: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    date: str = ""  # YYYY-MM-DD
    start_time: str = "09:00"  # HH:MM
    end_time: str = "17:00"    # HH:MM
    budget: float = 0.0
    customer_id: Optional[int] = None
    customer_name: Optional[str] = None
    status: str = "available"


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Pure-Python Haversine distance calculation in kilometers."""
    R = 6371.0  # Earth's radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2)
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)


def parse_hhmm_to_minutes(time_str: str) -> int:
    """Parses 'HH:MM' string into minutes since midnight."""
    if not time_str:
        return 0
    parts = time_str.strip().split(":")
    hours = int(parts[0]) if len(parts) > 0 else 0
    minutes = int(parts[1]) if len(parts) > 1 else 0
    return hours * 60 + minutes


def compute_skill_factor(required_skill: str, worker_skills: List[str]) -> Tuple[float, str, bool]:
    """
    Computes skill score (0.0 to 1.0).
    Exact match = 1.0
    Related skill = 0.5
    None = 0.0
    Returns: (score, reason, is_exact)
    """
    if not required_skill:
        return (0.0, "No skill required specified", False)
    
    req_norm = required_skill.strip().lower()
    norm_worker_skills = [s.strip().lower() for s in worker_skills if s.strip()]

    # Exact match check
    if req_norm in norm_worker_skills:
        return (1.0, f"Exact match for required skill '{required_skill}'", True)
    
    # Related skill check
    related_list = RELATED_SKILLS_MAP.get(req_norm, [])
    for ws in norm_worker_skills:
        if ws in related_list or req_norm in RELATED_SKILLS_MAP.get(ws, []):
            return (0.5, f"Possesses related skill '{ws}' for '{required_skill}'", False)
        
    return (0.0, f"Missing required skill '{required_skill}' (has {', '.join(norm_worker_skills) if norm_worker_skills else 'none'})", False)


def compute_location_factor(
    job_lat: Optional[float], job_lng: Optional[float], job_loc_text: str,
    worker_lat: Optional[float], worker_lng: Optional[float], worker_loc_text: str,
    worker_max_distance_km: Optional[float]
) -> Tuple[float, Optional[float], bool, str]:
    """
    Computes location score (0.0 to 1.0).
    score = max(0, 1 - distance / R)
    Without coordinates: same normalized text = 1.0, else 0.0 (flagged approximate)
    Returns: (score, distance_km, is_approximate, reason)
    """
    R = worker_max_distance_km if (worker_max_distance_km and worker_max_distance_km > 0) else DEFAULT_MAX_DISTANCE_KM

    has_coords = (job_lat is not None and job_lng is not None and
                  worker_lat is not None and worker_lng is not None)

    if has_coords:
        dist = haversine_distance_km(job_lat, job_lng, worker_lat, worker_lng)
        if dist > R:
            score = 0.0
            reason = f"{dist:.1f} km away (exceeds {R:.0f} km max travel radius)"
        else:
            score = max(0.0, 1.0 - (dist / R))
            reason = f"{dist:.1f} km away (within {R:.0f} km radius)"
        return (round(score, 4), dist, False, reason)
    
    # Coordinates unavailable, fallback to normalized text comparison
    job_text_norm = (job_loc_text or "").strip().lower()
    worker_text_norm = (worker_loc_text or "").strip().lower()

    if job_text_norm and worker_text_norm and (job_text_norm in worker_text_norm or worker_text_norm in job_text_norm):
        return (1.0, None, True, "Approximate match based on matching location names")
    
    return (0.0, None, True, "Locations differ or coordinates unavailable (approximate)")


def compute_availability_factor(
    job_date_str: str, job_start: str, job_end: str,
    worker_start: str, worker_end: str,
    available_days: List[str],
    assigned_slots: List[Dict[str, Any]]
) -> Tuple[float, bool, str]:
    """
    Computes availability score (0.0 to 1.0).
    Checks weekday, window overlap, and existing assigned job conflicts.
    Returns: (score, has_schedule_conflict, reason)
    """
    # 1. Weekday check
    if job_date_str and available_days:
        try:
            job_dt = datetime.strptime(job_date_str, "%Y-%m-%d")
            weekday_name = job_dt.strftime("%A")  # "Monday", etc.
            norm_days = [d.strip().lower() for d in available_days]
            if weekday_name.lower() not in norm_days:
                return (0.0, False, f"Job falls on {weekday_name}, outside worker's available days")
        except ValueError:
            pass

    j_start_m = parse_hhmm_to_minutes(job_start)
    j_end_m = parse_hhmm_to_minutes(job_end)
    w_start_m = parse_hhmm_to_minutes(worker_start)
    w_end_m = parse_hhmm_to_minutes(worker_end)

    if j_end_m <= j_start_m:
        j_end_m = j_start_m + 60  # fallback 1h if invalid

    if w_end_m <= w_start_m:
        w_end_m = 24 * 60  # fallback full day

    # 2. Schedule conflict with assigned jobs
    for slot in assigned_slots:
        slot_date = slot.get("date")
        if slot_date and slot_date == job_date_str:
            s_start = parse_hhmm_to_minutes(slot.get("start_time", ""))
            s_end = parse_hhmm_to_minutes(slot.get("end_time", ""))
            # check intersection
            if max(j_start_m, s_start) < min(j_end_m, s_end):
                return (0.0, True, "Schedule conflict with an already assigned active job")

    # 3. Window overlap
    job_duration = j_end_m - j_start_m
    overlap_start = max(j_start_m, w_start_m)
    overlap_end = min(j_end_m, w_end_m)
    overlap = max(0, overlap_end - overlap_start)

    score = min(1.0, overlap / float(job_duration))
    if score >= 0.99:
        reason = f"Full time window match ({job_start}-{job_end})"
    elif score > 0.0:
        percent = int(score * 100)
        reason = f"Partial time window overlap ({percent}% of job duration covered)"
    else:
        reason = f"Job time ({job_start}-{job_end}) outside worker availability ({worker_start}-{worker_end})"

    return (round(score, 4), False, reason)


def compute_rating_factor(avg_stars: float, review_count: int) -> Tuple[float, bool, str]:
    """
    Computes rating factor (0.0 to 1.0).
    avg_stars / 5.0.
    If 0 reviews -> neutral 0.5 (labeled "New worker").
    Returns: (score, is_new_worker, reason)
    """
    if review_count <= 0 or avg_stars <= 0.0:
        return (0.5, True, "New worker baseline (neutral rating)")
    
    clamped_stars = min(5.0, max(1.0, avg_stars))
    score = clamped_stars / 5.0
    return (round(score, 4), False, f"Average rating {clamped_stars:.1f}/5.0 ({review_count} reviews)")


def compute_payment_factor(budget: float, expected_payment: float) -> Tuple[float, str]:
    """
    Computes payment factor (0.0 to 1.0).
    If budget >= expected_payment (or expected == 0) -> 1.0
    Else -> budget / expected_payment
    Returns: (score, reason)
    """
    if expected_payment <= 0.0:
        return (1.0, "Worker has no minimum expected payment constraint")
    
    if budget >= expected_payment:
        return (1.0, f"Budget (Rs {budget:.0f}) fully meets expected payment (Rs {expected_payment:.0f})")
    
    score = budget / expected_payment
    return (round(min(1.0, max(0.0, score)), 4),
            f"Budget (Rs {budget:.0f}) is {int(score * 100)}% of expected payment (Rs {expected_payment:.0f})")


def match_single_pair(
    worker: MatchCandidateWorker,
    job: MatchCandidateJob,
    weights: Optional[EngineWeights] = None
) -> Dict[str, Any]:
    """
    Evaluates a single Worker <-> Job pair and generates complete factor scores,
    breakdown, total score, flags, and plain-language deterministic reasons.
    """
    w = (weights or EngineWeights()).normalized()

    # 1. Skill
    skill_raw, skill_reason, is_exact = compute_skill_factor(job.required_skill, worker.skills)
    skill_pts = round(skill_raw * w["skill"], 1)

    # 2. Location
    loc_raw, dist_km, is_approx, loc_reason = compute_location_factor(
        job.lat, job.lng, job.location_text,
        worker.lat, worker.lng, worker.location_text,
        worker.max_distance_km
    )
    loc_pts = round(loc_raw * w["location"], 1)

    # 3. Availability
    avail_raw, has_conflict, avail_reason = compute_availability_factor(
        job.date, job.start_time, job.end_time,
        worker.availability_start, worker.availability_end,
        worker.available_days,
        worker.assigned_slots
    )
    avail_pts = round(avail_raw * w["availability"], 1)

    # 4. Rating
    rating_raw, is_new_worker, rating_reason = compute_rating_factor(worker.average_rating, worker.review_count)
    rating_pts = round(rating_raw * w["rating"], 1)

    # 5. Payment
    payment_raw, payment_reason = compute_payment_factor(job.budget, worker.expected_payment)
    payment_pts = round(payment_raw * w["payment"], 1)

    total_score = round(skill_pts + loc_pts + avail_pts + rating_pts + payment_pts, 1)

    # Eligibility check: 0 skill or schedule conflict -> not eligible
    not_eligible = (skill_raw == 0.0) or has_conflict

    # Build deterministic reason strings with exact point contributions
    reasons = [
        f"{skill_reason} (+{skill_pts:.1f} of {w['skill']:.1f} pts)",
        f"{loc_reason} (+{loc_pts:.1f} of {w['location']:.1f} pts)",
        f"{avail_reason} (+{avail_pts:.1f} of {w['availability']:.1f} pts)",
        f"{rating_reason} (+{rating_pts:.1f} of {w['rating']:.1f} pts)",
        f"{payment_reason} (+{payment_pts:.1f} of {w['payment']:.1f} pts)"
    ]

    breakdown = {
        "skill": {"raw": skill_raw, "weight": w["skill"], "points": skill_pts, "reason": skill_reason},
        "location": {"raw": loc_raw, "weight": w["location"], "points": loc_pts, "reason": loc_reason, "distance_km": dist_km},
        "availability": {"raw": avail_raw, "weight": w["availability"], "points": avail_pts, "reason": avail_reason},
        "rating": {"raw": rating_raw, "weight": w["rating"], "points": rating_pts, "reason": rating_reason},
        "payment": {"raw": payment_raw, "weight": w["payment"], "points": payment_pts, "reason": payment_reason},
    }

    flags = {
        "approximate_location": is_approx,
        "schedule_conflict": has_conflict,
        "new_worker": is_new_worker,
        "skill_mismatch": (skill_raw == 0.0),
        "not_eligible": not_eligible
    }

    return {
        "worker_id": worker.id,
        "job_id": job.id,
        "total_score": total_score,
        "breakdown": breakdown,
        "distance_km": dist_km,
        "flags": flags,
        "reasons": reasons,
        "not_eligible": not_eligible,
        "worker_summary": {
            "id": worker.id,
            "name": worker.name,
            "skills": worker.skills,
            "location_text": worker.location_text,
            "average_rating": worker.average_rating,
            "review_count": worker.review_count,
            "expected_payment": worker.expected_payment
        },
        "job_summary": {
            "id": job.id,
            "title": job.title,
            "required_skill": job.required_skill,
            "location_text": job.location_text,
            "date": job.date,
            "start_time": job.start_time,
            "end_time": job.end_time,
            "budget": job.budget,
            "status": job.status
        }
    }


def rank_workers_for_job(
    job: MatchCandidateJob,
    workers: List[MatchCandidateWorker],
    weights: Optional[EngineWeights] = None
) -> List[Dict[str, Any]]:
    """
    Ranks workers for a job.
    Sorted by: not_eligible (False first), total_score desc, distance_km asc, rating desc.
    """
    results = [match_single_pair(w, job, weights) for w in workers]

    def sort_key(item):
        is_ineligible = item["flags"]["not_eligible"]
        score = item["total_score"]
        dist = item["distance_km"] if item["distance_km"] is not None else 99999.0
        rating = item["worker_summary"]["average_rating"]
        # Ineligible goes last (1), higher score first (-score), lower dist first (+dist), higher rating first (-rating)
        return (1 if is_ineligible else 0, -score, dist, -rating)

    return sorted(results, key=sort_key)


def rank_jobs_for_worker(
    worker: MatchCandidateWorker,
    jobs: List[MatchCandidateJob],
    weights: Optional[EngineWeights] = None
) -> List[Dict[str, Any]]:
    """
    Ranks open jobs for a worker.
    Worker -> Opportunities core differentiator.
    """
    results = [match_single_pair(worker, j, weights) for j in jobs]

    def sort_key(item):
        is_ineligible = item["flags"]["not_eligible"]
        score = item["total_score"]
        dist = item["distance_km"] if item["distance_km"] is not None else 99999.0
        budget = item["job_summary"]["budget"]
        return (1 if is_ineligible else 0, -score, dist, -budget)

    return sorted(results, key=sort_key)


def compute_optimal_earning_plan(
    worker: MatchCandidateWorker,
    eligible_jobs: List[MatchCandidateJob],
    target_date: str,
    daily_goal: float
) -> Dict[str, Any]:
    """
    Weighted Interval Scheduling (Dynamic Programming) to select the optimal,
    non-overlapping set of jobs on a given date that maximizes total earnings.
    """
    # Filter jobs on target_date that are eligible
    jobs_on_date = []
    for job in eligible_jobs:
        if job.date == target_date:
            pair_eval = match_single_pair(worker, job)
            if not pair_eval["flags"]["not_eligible"]:
                start_m = parse_hhmm_to_minutes(job.start_time)
                end_m = parse_hhmm_to_minutes(job.end_time)
                if end_m > start_m:
                    jobs_on_date.append({
                        "job": job,
                        "eval": pair_eval,
                        "start_m": start_m,
                        "end_m": end_m,
                        "weight": job.budget
                    })

    if not jobs_on_date:
        return {
            "date": target_date,
            "daily_goal": daily_goal,
            "chosen_jobs": [],
            "total_earnings": 0.0,
            "goal_progress_percent": 0.0,
            "remaining_gap": max(0.0, daily_goal),
            "message": "No eligible non-conflicting jobs found for this date"
        }

    # Sort intervals by end time ascending
    jobs_on_date.sort(key=lambda x: x["end_m"])
    n = len(jobs_on_date)

    # p[i]: latest job j < i compatible with job i
    p = [-1] * n
    for i in range(n):
        for j in range(i - 1, -1, -1):
            if jobs_on_date[j]["end_m"] <= jobs_on_date[i]["start_m"]:
                p[i] = j
                break

    # DP table: dp[i] = max earnings considering jobs 0..i-1
    dp = [0.0] * (n + 1)
    take = [False] * (n + 1)

    for i in range(1, n + 1):
        weight = jobs_on_date[i - 1]["weight"]
        prev_idx = p[i - 1]
        include_val = weight + (dp[prev_idx + 1] if prev_idx != -1 else 0.0)
        exclude_val = dp[i - 1]

        if include_val > exclude_val:
            dp[i] = include_val
        else:
            dp[i] = exclude_val

    # Reconstruct optimal subset
    chosen = []
    curr = n
    while curr > 0:
        weight = jobs_on_date[curr - 1]["weight"]
        prev_idx = p[curr - 1]
        include_val = weight + (dp[prev_idx + 1] if prev_idx != -1 else 0.0)
        exclude_val = dp[curr - 1]

        if include_val > exclude_val:
            chosen.append(jobs_on_date[curr - 1])
            curr = prev_idx + 1 if prev_idx != -1 else 0
        else:
            curr = curr - 1

    chosen.reverse()

    total_earnings = round(sum(item["job"].budget for item in chosen), 2)
    progress_pct = round((total_earnings / daily_goal * 100.0) if daily_goal > 0 else 100.0, 1)
    remaining_gap = round(max(0.0, daily_goal - total_earnings), 2)

    return {
        "date": target_date,
        "daily_goal": daily_goal,
        "chosen_jobs": [
            {
                "job_id": item["job"].id,
                "title": item["job"].title,
                "required_skill": item["job"].required_skill,
                "location_text": item["job"].location_text,
                "start_time": item["job"].start_time,
                "end_time": item["job"].end_time,
                "budget": item["job"].budget,
                "match_score": item["eval"]["total_score"]
            }
            for item in chosen
        ],
        "total_earnings": total_earnings,
        "goal_progress_percent": progress_pct,
        "remaining_gap": remaining_gap,
        "message": f"Optimal plan with {len(chosen)} non-overlapping jobs"
    }
