"""
Comprehensive Unit Tests for SkillLink Pure-Python Matching Engine
Verifying factor sensitivities, weight normalization, ranking, and non-overlapping earning plan.
"""

import pytest
from app.matching.engine import (
    MatchCandidateWorker,
    MatchCandidateJob,
    EngineWeights,
    compute_skill_factor,
    compute_location_factor,
    compute_availability_factor,
    compute_rating_factor,
    compute_payment_factor,
    match_single_pair,
    rank_workers_for_job,
    rank_jobs_for_worker,
    compute_optimal_earning_plan,
    haversine_distance_km
)


def test_skill_factor_sensitivity():
    # Exact match
    score, reason, is_exact = compute_skill_factor("cleaning", ["cleaning", "gardening"])
    assert score == 1.0
    assert is_exact is True

    # Related match ("household assistance" is related to "cleaning")
    score_rel, _, is_exact_rel = compute_skill_factor("cleaning", ["household assistance"])
    assert score_rel == 0.5
    assert is_exact_rel is False

    # Mismatch
    score_none, _, _ = compute_skill_factor("delivery", ["cleaning"])
    assert score_none == 0.0


def test_location_factor_sensitivity():
    # Coords: Bangalore center (12.9716, 77.5946) to Indiranagar (12.9784, 77.6408) ~ 5 km
    dist = haversine_distance_km(12.9716, 77.5946, 12.9784, 77.6408)
    assert 4.0 <= dist <= 6.0

    # Closer distance yields higher score
    score_close, dist_close, _, _ = compute_location_factor(
        12.9716, 77.5946, "Center",
        12.9750, 77.6000, "Near",
        worker_max_distance_km=15.0
    )

    score_far, dist_far, _, _ = compute_location_factor(
        12.9716, 77.5946, "Center",
        13.0500, 77.7000, "Far",
        worker_max_distance_km=15.0
    )

    assert score_close > score_far
    assert dist_close < dist_far


def test_availability_factor_and_conflicts():
    # Full overlap
    score_full, conflict, _ = compute_availability_factor(
        "2026-10-15", "09:00", "13:00",
        "08:00", "17:00",
        [], []
    )
    assert score_full == 1.0
    assert not conflict

    # Partial overlap (job 09:00-13:00 (4h), worker available 11:00-17:00 -> 2h overlap = 0.5)
    score_partial, _, _ = compute_availability_factor(
        "2026-10-15", "09:00", "13:00",
        "11:00", "17:00",
        [], []
    )
    assert abs(score_partial - 0.5) < 0.05

    # Schedule conflict with active job on same day
    active_slots = [{"date": "2026-10-15", "start_time": "10:00", "end_time": "12:00"}]
    score_conf, conflict, _ = compute_availability_factor(
        "2026-10-15", "09:00", "13:00",
        "08:00", "17:00",
        [], active_slots
    )
    assert score_conf == 0.0
    assert conflict is True


def test_rating_factor_sensitivity():
    # New worker neutral baseline
    score_new, is_new, _ = compute_rating_factor(0.0, 0)
    assert score_new == 0.5
    assert is_new is True

    # High rating worker
    score_high, is_new_h, _ = compute_rating_factor(5.0, 10)
    assert score_high == 1.0
    assert not is_new_h

    # Lower rating worker
    score_low, _, _ = compute_rating_factor(3.0, 5)
    assert abs(score_low - 0.6) < 0.01
    assert score_high > score_low


def test_payment_factor_sensitivity():
    # Budget exceeds expected payment
    score_full, _ = compute_payment_factor(budget=500.0, expected_payment=400.0)
    assert score_full == 1.0

    # Budget below expected payment
    score_ratio, _ = compute_payment_factor(budget=300.0, expected_payment=600.0)
    assert score_ratio == 0.5


def test_custom_weights_change_total_score():
    worker = MatchCandidateWorker(
        id=1, name="Worker Alpha", skills=["cleaning"],
        lat=12.97, lng=77.59, availability_start="08:00", availability_end="18:00",
        expected_payment=300.0, average_rating=4.0, review_count=3
    )
    job = MatchCandidateJob(
        id=10, title="Home Cleaning", required_skill="cleaning",
        lat=12.97, lng=77.59, date="2026-10-15", start_time="09:00", end_time="12:00",
        budget=350.0
    )

    # Standard weights
    eval_std = match_single_pair(worker, job, EngineWeights(skill=40, location=20, availability=20, rating=10, payment=10))

    # Weight emphasizing rating only
    eval_custom = match_single_pair(worker, job, EngineWeights(skill=10, location=10, availability=10, rating=60, payment=10))

    assert eval_std["total_score"] != eval_custom["total_score"]


def test_candidate_ranking_order():
    job = MatchCandidateJob(
        id=101, title="Delivery Assistant", required_skill="delivery",
        lat=12.97, lng=77.59, date="2026-10-15", start_time="09:00", end_time="12:00",
        budget=400.0
    )

    # Worker 1: Exact skill, close by
    w1 = MatchCandidateWorker(
        id=1, name="Worker 1", skills=["delivery"],
        lat=12.971, lng=77.591, expected_payment=350.0, average_rating=4.8, review_count=5
    )

    # Worker 2: Related skill (packing), farther
    w2 = MatchCandidateWorker(
        id=2, name="Worker 2", skills=["packing"],
        lat=13.05, lng=77.70, expected_payment=350.0, average_rating=4.0, review_count=2
    )

    # Worker 3: Ineligible (gardening, completely unrelated)
    w3 = MatchCandidateWorker(
        id=3, name="Worker 3", skills=["gardening"],
        lat=12.971, lng=77.591, expected_payment=350.0, average_rating=5.0, review_count=10
    )

    ranked = rank_workers_for_job(job, [w2, w3, w1])

    assert len(ranked) == 3
    # Top candidate must be w1
    assert ranked[0]["worker_id"] == 1
    # Second candidate is w2
    assert ranked[1]["worker_id"] == 2
    # Ineligible worker is ranked last
    assert ranked[2]["worker_id"] == 3
    assert ranked[2]["flags"]["not_eligible"] is True


def test_optimal_earning_plan_weighted_interval():
    worker = MatchCandidateWorker(
        id=1, name="Worker 1", skills=["cleaning", "delivery"],
        lat=12.97, lng=77.59, availability_start="08:00", availability_end="20:00",
        expected_payment=300.0
    )

    target_date = "2026-10-20"

    # Three overlapping/non-overlapping jobs on that date:
    # J1: 09:00 - 12:00, budget 400
    # J2: 11:00 - 14:00, budget 700 (overlaps with J1 and J3)
    # J3: 13:00 - 16:00, budget 500 (does not overlap with J1)
    #
    # Option A: J1 + J3 = 400 + 500 = 900
    # Option B: J2 = 700
    # Optimal should pick J1 and J3 for total 900
    j1 = MatchCandidateJob(id=1, title="Clean A", required_skill="cleaning", date=target_date, start_time="09:00", end_time="12:00", budget=400.0)
    j2 = MatchCandidateJob(id=2, title="Clean B", required_skill="cleaning", date=target_date, start_time="11:00", end_time="14:00", budget=700.0)
    j3 = MatchCandidateJob(id=3, title="Delivery C", required_skill="delivery", date=target_date, start_time="13:00", end_time="16:00", budget=500.0)

    plan = compute_optimal_earning_plan(worker, [j1, j2, j3], target_date, daily_goal=1000.0)

    assert plan["total_earnings"] == 900.0
    chosen_ids = [j["job_id"] for j in plan["chosen_jobs"]]
    assert chosen_ids == [1, 3]
    assert plan["goal_progress_percent"] == 90.0
    assert plan["remaining_gap"] == 100.0
