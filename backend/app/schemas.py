"""Pydantic v2 Validation Schemas for SkillLink API"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ---------------- Auth Schemas ----------------
class UserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(worker|customer)$")
    phone: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: int
    name: str
    email: EmailStr
    role: str
    phone: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------- Worker Profile Schemas ----------------
class WorkerProfileUpdate(BaseModel):
    skills: List[str] = Field(default_factory=list)
    location_text: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability_start: str = "08:00"
    availability_end: str = "18:00"
    available_days: List[str] = Field(default_factory=list)
    expected_payment: float = 0.0
    daily_goal: float = 0.0
    max_distance_km: float = 20.0
    bio: Optional[str] = ""


class WorkerProfileOut(BaseModel):
    id: int
    user_id: int
    skills: List[str]
    location_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability_start: str
    availability_end: str
    available_days: List[str]
    expected_payment: float
    daily_goal: float
    max_distance_km: float
    bio: Optional[str] = ""
    user_name: Optional[str] = None
    average_rating: float = 0.0
    review_count: int = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------- Job Schemas ----------------
class JobCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=150)
    required_skill: str = Field(..., min_length=2)
    description: Optional[str] = ""
    location_text: str = Field(..., min_length=2)
    lat: Optional[float] = None
    lng: Optional[float] = None
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")  # YYYY-MM-DD
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")  # HH:MM
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")    # HH:MM
    budget: float = Field(..., ge=0.0)


class JobOut(BaseModel):
    id: int
    customer_id: int
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None  # Revealed only when assigned to current worker
    title: str
    required_skill: str
    description: Optional[str] = ""
    location_text: str
    lat: Optional[float] = None
    lng: Optional[float] = None
    date: str
    start_time: str
    end_time: str
    budget: float
    status: str
    assigned_worker_id: Optional[int] = None
    assigned_worker_name: Optional[str] = None
    assigned_worker_phone: Optional[str] = None
    start_code: Optional[str] = None  # Revealed only to customer or when active
    created_at: datetime
    applications_count: Optional[int] = 0

    model_config = ConfigDict(from_attributes=True)


# ---------------- Application Schemas ----------------
class ApplicationCreate(BaseModel):
    job_id: int


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    worker_id: int
    worker_name: Optional[str] = None
    worker_skills: Optional[List[str]] = None
    worker_rating: Optional[float] = 0.0
    worker_review_count: Optional[int] = 0
    worker_phone: Optional[str] = None
    match_score: float
    score_breakdown: Dict[str, Any]
    status: str
    applied_at: datetime
    job: Optional[JobOut] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------- Matching & Engine Schemas ----------------
class WeightsInput(BaseModel):
    skill: float = 40.0
    location: float = 20.0
    availability: float = 20.0
    rating: float = 10.0
    payment: float = 10.0


class MatchScoreBreakdownItem(BaseModel):
    raw: float
    weight: float
    points: float
    reason: str
    distance_km: Optional[float] = None


class MatchEvaluationOut(BaseModel):
    worker_id: int
    job_id: int
    total_score: float
    breakdown: Dict[str, MatchScoreBreakdownItem]
    distance_km: Optional[float] = None
    flags: Dict[str, bool]
    reasons: List[str]
    not_eligible: bool
    worker_summary: Optional[Dict[str, Any]] = None
    job_summary: Optional[Dict[str, Any]] = None
    ai_explanation: Optional[str] = None


class MatchPreviewInput(BaseModel):
    # Job details entered on the Live Engine demo page
    title: str = "Demo Job"
    required_skill: str
    location_text: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    date: str
    start_time: str
    end_time: str
    budget: float
    weights: Optional[WeightsInput] = None


class ReverseMatchPreviewInput(BaseModel):
    # Worker details entered on the Live Engine demo page
    skills: List[str]
    location_text: str = ""
    lat: Optional[float] = None
    lng: Optional[float] = None
    availability_start: str = "08:00"
    availability_end: str = "18:00"
    available_days: List[str] = Field(default_factory=list)
    expected_payment: float = 0.0
    max_distance_km: float = 20.0
    weights: Optional[WeightsInput] = None


# ---------------- Review Schemas ----------------
class ReviewCreate(BaseModel):
    job_id: int
    reviewee_id: int
    stars: int = Field(..., ge=1, le=5)
    comment: Optional[str] = ""


class ReviewOut(BaseModel):
    id: int
    job_id: int
    reviewer_id: int
    reviewer_name: Optional[str] = None
    reviewee_id: int
    stars: int
    comment: Optional[str] = ""
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------- Notification Schemas ----------------
class NotificationOut(BaseModel):
    id: int
    user_id: int
    type: str
    payload: Dict[str, Any]
    read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------- Payment Schemas ----------------
class PaymentRecordCreate(BaseModel):
    job_id: int
    amount: float
    method: str = "simulated"


class PaymentOut(BaseModel):
    id: int
    job_id: int
    amount: float
    method: str
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------- Trust & Safety Schemas ----------------
class ReportBlockCreate(BaseModel):
    target_id: int
    action_type: str = Field(..., pattern="^(report|block)$")
    reason: str = Field(..., min_length=3)


# ---------------- Geocode Schemas ----------------
class GeocodeSuggestion(BaseModel):
    name: str
    formatted: str
    lat: float
    lng: float


# Forward ref resolution for TokenResponse
TokenResponse.model_rebuild()
