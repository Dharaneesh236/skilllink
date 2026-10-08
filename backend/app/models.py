"""SkillLink SQLAlchemy Data Models"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, JSON, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False)  # "worker" or "customer"
    phone = Column(String(30), nullable=True)  # Revealed only after acceptance
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    worker_profile = relationship("WorkerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    posted_jobs = relationship("Job", foreign_keys="Job.customer_id", back_populates="customer", cascade="all, delete-orphan")
    assigned_jobs = relationship("Job", foreign_keys="Job.assigned_worker_id", back_populates="assigned_worker")
    applications = relationship("Application", back_populates="worker", cascade="all, delete-orphan")
    reviews_given = relationship("Review", foreign_keys="Review.reviewer_id", back_populates="reviewer")
    reviews_received = relationship("Review", foreign_keys="Review.reviewee_id", back_populates="reviewee")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class WorkerProfile(Base):
    __tablename__ = "worker_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    skills = Column(JSON, default=list)  # e.g. ["cleaning", "gardening"]
    location_text = Column(String(255), default="")
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    availability_start = Column(String(10), default="08:00")  # HH:MM
    availability_end = Column(String(10), default="18:00")    # HH:MM
    available_days = Column(JSON, default=list)  # e.g. ["Monday", "Tuesday"]
    expected_payment = Column(Float, default=0.0)
    daily_goal = Column(Float, default=0.0)
    max_distance_km = Column(Float, default=20.0)
    bio = Column(Text, nullable=True, default="")

    user = relationship("User", back_populates="worker_profile")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=False)
    required_skill = Column(String(100), nullable=False)
    description = Column(Text, nullable=True, default="")
    location_text = Column(String(255), nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    date = Column(String(20), nullable=False)  # YYYY-MM-DD
    start_time = Column(String(10), nullable=False)  # HH:MM
    end_time = Column(String(10), nullable=False)    # HH:MM
    budget = Column(Float, nullable=False, default=0.0)
    status = Column(String(30), default="available")  # available | assigned | in_progress | completed | cancelled
    assigned_worker_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    start_code = Column(String(10), nullable=True)  # 4-digit OTP
    created_at = Column(DateTime, default=datetime.utcnow)

    customer = relationship("User", foreign_keys=[customer_id], back_populates="posted_jobs")
    assigned_worker = relationship("User", foreign_keys=[assigned_worker_id], back_populates="assigned_jobs")
    applications = relationship("Application", back_populates="job", cascade="all, delete-orphan")
    payment = relationship("Payment", back_populates="job", uselist=False, cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="job", cascade="all, delete-orphan")


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    worker_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    match_score = Column(Float, default=0.0)
    score_breakdown = Column(JSON, default=dict)
    status = Column(String(30), default="applied")  # applied | accepted | rejected | withdrawn
    applied_at = Column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("job_id", "worker_id", name="uq_job_worker_application"),
    )

    job = relationship("Job", back_populates="applications")
    worker = relationship("User", back_populates="applications")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    reviewer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reviewee_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    stars = Column(Integer, nullable=False)  # 1 to 5
    comment = Column(Text, nullable=True, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id], back_populates="reviews_given")
    reviewee = relationship("User", foreign_keys=[reviewee_id], back_populates="reviews_received")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)
    payload = Column(JSON, default=dict)
    read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="notifications")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), unique=True, nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(50), default="simulated")
    status = Column(String(50), default="recorded (simulated)")
    created_at = Column(DateTime, default=datetime.utcnow)

    job = relationship("Job", back_populates="payment")


class ReportBlock(Base):
    __tablename__ = "report_blocks"

    id = Column(Integer, primary_key=True, index=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    target_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    action_type = Column(String(20), nullable=False)  # "report" or "block"
    reason = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class GeocodeCache(Base):
    __tablename__ = "geocode_cache"

    id = Column(Integer, primary_key=True, index=True)
    query_key = Column(String(255), unique=True, index=True, nullable=False)
    result_json = Column(JSON, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
