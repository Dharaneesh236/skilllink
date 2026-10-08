"""Simulated Payment Recording Router (Zero-Cost Compliant)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Job, Payment, Notification
from app.schemas import PaymentRecordCreate, PaymentOut
from app.auth.deps import require_customer, get_current_user

from app.websocket.manager import manager

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post("", response_model=PaymentOut, status_code=status.HTTP_201_CREATED)
async def record_simulated_payment(
    payload: PaymentRecordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_customer)
):
    """
    Records a payment for a completed job.
    Explicitly labeled 'recorded (simulated)' per Zero-Cost Rule and honesty policy.
    """
    job = db.query(Job).filter(Job.id == payload.job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.customer_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not own this job")
    
    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Payments can only be recorded for completed jobs")

    existing_payment = db.query(Payment).filter(Payment.job_id == job.id).first()
    if existing_payment:
        raise HTTPException(status_code=400, detail="Payment has already been recorded for this job")

    payment = Payment(
        job_id=job.id,
        amount=payload.amount,
        method=payload.method,
        status="recorded (simulated)"
    )
    db.add(payment)

    if job.assigned_worker_id:
        db.add(Notification(
            user_id=job.assigned_worker_id,
            type="payment_recorded",
            payload={
                "job_id": job.id,
                "amount": payload.amount,
                "note": "Payment recorded (simulated) by customer"
            }
        ))

    db.commit()
    db.refresh(payment)

    await manager.send_personal_event(job.customer_id, "PAYMENT_RECORDED", {"job_id": job.id, "amount": payload.amount})
    if job.assigned_worker_id:
        await manager.send_personal_event(job.assigned_worker_id, "PAYMENT_RECORDED", {"job_id": job.id, "amount": payload.amount})

    return payment


@router.get("/job/{job_id}", response_model=PaymentOut)
def get_payment_for_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves recorded payment details for a job."""
    payment = db.query(Payment).filter(Payment.job_id == job_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="No payment recorded for this job")
    return payment
