"""API Lifecycle and Authorization Integration Tests"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import Base, get_db
from app.main import app

from sqlalchemy.pool import StaticPool

# In-memory test SQLite engine
TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


def test_full_platform_lifecycle():
    # 1. Register Customer
    res_c = client.post("/auth/register", json={
        "name": "Ananya Sharma",
        "email": "ananya@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "customer",
        "phone": "+91 9876543210"
    })
    assert res_c.status_code == 201
    token_c = res_c.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # 2. Register Worker
    res_w = client.post("/auth/register", json={
        "name": "Karthik Raj",
        "email": "karthik@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "worker",
        "phone": "+91 9123456789"
    })
    assert res_w.status_code == 201
    token_w = res_w.json()["access_token"]
    headers_w = {"Authorization": f"Bearer {token_w}"}
    worker_id = res_w.json()["user"]["id"]

    # 3. Check Initial Worker Profile: Initial values empty (Rule #7)
    res_prof_init = client.get("/profile", headers=headers_w)
    assert res_prof_init.status_code == 200
    prof_data = res_prof_init.json()
    assert prof_data["skills"] == []
    assert prof_data["expected_payment"] == 0.0
    assert prof_data["daily_goal"] == 0.0

    # 4. Check Initial Dashboards show zeros (Rule #2 & #7)
    w_stats_init = client.get("/stats/worker", headers=headers_w).json()
    assert w_stats_init["jobs_applied"] == 0
    assert w_stats_init["jobs_completed"] == 0
    assert w_stats_init["total_earned"] == 0.0

    # 5. Worker completes profile onboarding
    res_prof_update = client.put("/profile", headers=headers_w, json={
        "skills": ["cleaning", "cooking assistance"],
        "location_text": "Indiranagar, Bengaluru",
        "lat": 12.9784,
        "lng": 77.6408,
        "availability_start": "08:00",
        "availability_end": "18:00",
        "available_days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "expected_payment": 400.0,
        "daily_goal": 800.0,
        "max_distance_km": 15.0,
        "bio": "Experienced home care and cleaning assistant."
    })
    assert res_prof_update.status_code == 200
    assert "cleaning" in res_prof_update.json()["skills"]

    # 6. Customer posts a job
    res_job = client.post("/jobs", headers=headers_c, json={
        "title": "Apartment Deep Cleaning",
        "required_skill": "cleaning",
        "description": "Thorough cleaning of living room and kitchen.",
        "location_text": "Domlur, Bengaluru",
        "lat": 12.9609,
        "lng": 77.6387,
        "date": "2026-10-15",
        "start_time": "09:00",
        "end_time": "12:00",
        "budget": 500.0
    })
    assert res_job.status_code == 201
    job_id = res_job.json()["id"]

    # 7. Worker receives recommended jobs (Worker -> Opportunities core)
    res_recom = client.post("/recommend-jobs", headers=headers_w)
    assert res_recom.status_code == 200
    recommended_list = res_recom.json()
    assert len(recommended_list) >= 1
    top_match = recommended_list[0]
    assert top_match["job_id"] == job_id
    # Exact skill match gives high score
    assert top_match["total_score"] > 80.0
    assert top_match["breakdown"]["skill"]["raw"] == 1.0

    # 8. Worker applies for the job
    res_app = client.post("/apply", headers=headers_w, json={"job_id": job_id})
    assert res_app.status_code == 201
    app_id = res_app.json()["id"]
    assert res_app.json()["match_score"] == top_match["total_score"]

    # 8b. Worker cannot apply twice
    res_dup = client.post("/apply", headers=headers_w, json={"job_id": job_id})
    assert res_dup.status_code == 400

    # 9. Customer views applications for the job
    res_job_apps = client.get(f"/jobs/{job_id}/applications", headers=headers_c)
    assert res_job_apps.status_code == 200
    assert len(res_job_apps.json()) == 1

    # 10. Customer accepts the application -> Generates start code
    res_accept = client.post("/accept-job", headers=headers_c, json={"application_id": app_id})
    assert res_accept.status_code == 200
    assert res_accept.json()["status"] == "accepted"

    # Verify job status is assigned and customer can see the start code
    res_job_details = client.get(f"/jobs/{job_id}", headers=headers_c)
    assert res_job_details.status_code == 200
    job_info = res_job_details.json()
    assert job_info["status"] == "assigned"
    start_code = job_info["start_code"]
    assert start_code is not None
    assert len(start_code) == 4

    # 11. Worker starts the job using start code
    res_start = client.post(f"/jobs/{job_id}/start", headers=headers_w, json={"start_code": start_code})
    assert res_start.status_code == 200
    assert res_start.json()["status"] == "in_progress"

    # 12. Customer marks job completed
    res_comp = client.post(f"/jobs/{job_id}/complete", headers=headers_c)
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "completed"

    # 13. Customer records simulated payment
    res_pay = client.post("/payments", headers=headers_c, json={
        "job_id": job_id,
        "amount": 500.0,
        "method": "upi"
    })
    assert res_pay.status_code == 201
    assert "recorded (simulated)" in res_pay.json()["status"]

    # 14. Customer leaves a 5-star review
    res_rev = client.post("/reviews", headers=headers_c, json={
        "job_id": job_id,
        "reviewee_id": worker_id,
        "stars": 5,
        "comment": "Punctual, thorough, and highly professional work!"
    })
    assert res_rev.status_code == 201

    # 15. Check worker's dynamic stats & rating
    worker_prof = client.get("/profile", headers=headers_w).json()
    assert worker_prof["average_rating"] == 5.0
    assert worker_prof["review_count"] == 1

    worker_stats = client.get("/stats/worker", headers=headers_w).json()
    assert worker_stats["jobs_completed"] == 1
    assert worker_stats["total_earned"] == 500.0
    assert worker_stats["goal_progress_percent"] == 62.5  # 500 / 800 * 100


def test_authorization_and_security():
    # Customer cannot call worker endpoints
    res_c = client.post("/auth/register", json={
        "name": "Sec Customer",
        "email": "seccustomer@example.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "customer"
    })
    token_c = res_c.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_c}"}

    # Calling /recommend-jobs as customer should fail with 403 Forbidden
    res_forbidden = client.post("/recommend-jobs", headers=headers_c)
    assert res_forbidden.status_code == 403

    # Calling /earning-plan as customer should fail with 403 Forbidden
    res_plan_forbidden = client.get("/earning-plan?date=2026-10-15", headers=headers_c)
    assert res_plan_forbidden.status_code == 403


def test_live_engine_preview():
    # Live Engine ad-hoc preview without saving a job
    res_prev = client.post("/match/preview", json={
        "title": "Ad-hoc Gardening",
        "required_skill": "gardening",
        "location_text": "Indiranagar",
        "lat": 12.9784,
        "lng": 77.6408,
        "date": "2026-10-18",
        "start_time": "10:00",
        "end_time": "13:00",
        "budget": 450.0,
        "weights": {"skill": 40, "location": 20, "availability": 20, "rating": 10, "payment": 10}
    })
    assert res_prev.status_code == 200
    results = res_prev.json()
    assert isinstance(results, list)


def test_report_and_block():
    # Register user A and B
    res_a = client.post("/auth/register", json={
        "name": "User A", "email": "usera@example.com",
        "password": "Password123!", "confirm_password": "Password123!",
        "role": "customer"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    res_b = client.post("/auth/register", json={
        "name": "User B", "email": "userb@example.com",
        "password": "Password123!", "confirm_password": "Password123!",
        "role": "worker"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}
    user_b_id = res_b.json()["user"]["id"]

    # Block user B
    res_block = client.post("/block", headers=headers_a, json={
        "target_id": user_b_id,
        "action_type": "block",
        "reason": "Inappropriate communication"
    })
    assert res_block.status_code == 201

    # User A posts a job
    res_job = client.post("/jobs", headers=headers_a, json={
        "title": "Private Job",
        "required_skill": "cleaning",
        "location_text": "Bangalore",
        "date": "2026-10-25",
        "start_time": "09:00",
        "end_time": "12:00",
        "budget": 300.0
    })
    assert res_job.status_code == 201
    job_id = res_job.json()["id"]

    # Blocked User B cannot see the job in available list
    res_jobs_b = client.get("/jobs", headers=headers_b)
    job_ids = [j["id"] for j in res_jobs_b.json()]
    assert job_id not in job_ids
