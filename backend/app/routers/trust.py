"""Trust and Safety Router: Report and Block Functionality"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, ReportBlock
from app.schemas import ReportBlockCreate
from app.auth.deps import get_current_user

router = APIRouter(tags=["Trust & Safety"])


@router.post("/report", status_code=status.HTTP_201_CREATED)
def report_user(
    payload: ReportBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Submits a safety report against another user."""
    if payload.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot report yourself")
    
    target = db.query(User).filter(User.id == payload.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    record = ReportBlock(
        reporter_id=current_user.id,
        target_id=payload.target_id,
        action_type="report",
        reason=payload.reason.strip()
    )
    db.add(record)
    db.commit()
    return {"status": "success", "message": "Report submitted for review"}


@router.post("/block", status_code=status.HTTP_201_CREATED)
def block_user(
    payload: ReportBlockCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Blocks another user so they cannot see or match with each other."""
    if payload.target_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    target = db.query(User).filter(User.id == payload.target_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target user not found")

    existing = db.query(ReportBlock).filter(
        ReportBlock.reporter_id == current_user.id,
        ReportBlock.target_id == payload.target_id,
        ReportBlock.action_type == "block"
    ).first()
    if existing:
        return {"status": "success", "message": "User is already blocked"}

    record = ReportBlock(
        reporter_id=current_user.id,
        target_id=payload.target_id,
        action_type="block",
        reason=payload.reason.strip()
    )
    db.add(record)
    db.commit()
    return {"status": "success", "message": "User blocked successfully"}
