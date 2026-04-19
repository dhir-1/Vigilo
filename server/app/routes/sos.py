"""
SOS Alert API
- POST /api/sos/trigger   — Fire an SOS alert, notify contacts, auto-create crime report
- POST /api/sos/resolve   — Mark alert resolved, notify contacts
- GET  /api/sos/history    — User's past SOS alerts
"""
import asyncio
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.models.user import User
from app.models.sos_alert import SOSAlert
from app.models.crime_report import CrimeReport
from app.models.emergency_contact import EmergencyContact
from app.utils.auth import get_current_user
from app.services.email_service import send_email, build_sos_alert_email, build_sos_resolved_email

router = APIRouter(prefix="/api/sos", tags=["SOS"])


# ── Schemas ──────────────────────────────────────────────────

class SOSTriggerRequest(BaseModel):
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class SOSResolveRequest(BaseModel):
    alert_id: str


class SOSAlertResponse(BaseModel):
    id: str
    user_id: str
    latitude: Optional[float]
    longitude: Optional[float]
    status: str
    contacts_notified: list
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# ── Helper to generate report IDs ────────────────────────────

def _gen_report_id(db: Session) -> str:
    while True:
        candidate = f"SOS{random.randint(10000, 99999)}"
        exists = db.query(CrimeReport).filter(CrimeReport.report_id == candidate).first()
        if not exists:
            return candidate


# ── Endpoints ────────────────────────────────────────────────

@router.post("/trigger", response_model=SOSAlertResponse)
async def trigger_sos(
    req: SOSTriggerRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Trigger an SOS alert:
    1. Create SOSAlert record
    2. Auto-create a verified CrimeReport (is_sos=True)
    3. Email all emergency contacts
    """

    # 1. Fetch user's emergency contacts
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.user_id == current_user.id
    ).all()

    contact_ids = [c.id for c in contacts]

    # 2. Create SOSAlert
    alert = SOSAlert(
        user_id=current_user.id,
        latitude=req.latitude,
        longitude=req.longitude,
        status="active",
        contacts_notified=contact_ids,
    )
    db.add(alert)

    # 3. Auto-create a verified CrimeReport
    report = CrimeReport(
        report_id=_gen_report_id(db),
        user_id=current_user.id,
        crime_type="Emergency SOS",
        severity="High",
        description=f"Emergency SOS triggered by {current_user.full_name}. Immediate assistance required.",
        latitude=req.latitude or 21.1702,  # default to Surat center if no GPS
        longitude=req.longitude or 72.8311,
        area_name="SOS Location",
        date_occurred=datetime.utcnow(),
        time_of_day=_time_of_day(),
        status="verified",
        trust_score=100.0,
        is_sos=True,
    )
    db.add(report)

    db.commit()
    db.refresh(alert)

    # 4. Email emergency contacts (async, non-blocking)
    email_data = build_sos_alert_email(
        user_name=current_user.full_name,
        latitude=req.latitude,
        longitude=req.longitude,
    )

    contact_emails = [c.email for c in contacts if c.email]
    if contact_emails:
        # Fire and forget — don't block the response
        background_tasks.add_task(
            send_email,
            to_emails=contact_emails,
            subject=email_data["subject"],
            html_body=email_data["html"],
        )
        print(f"SOS: Dispatching emails to {len(contact_emails)} contacts")
    else:
        print("SOS: No emergency contacts with email addresses found")

    return alert


@router.post("/resolve", response_model=SOSAlertResponse)
async def resolve_sos(
    req: SOSResolveRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark an SOS alert as resolved and notify contacts."""
    alert = db.query(SOSAlert).filter(
        SOSAlert.id == req.alert_id,
        SOSAlert.user_id == current_user.id,
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="SOS alert not found")
    if alert.status == "resolved":
        raise HTTPException(status_code=400, detail="Alert is already resolved")

    alert.status = "resolved"
    alert.resolved_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    # Notify contacts that it's resolved
    contacts = db.query(EmergencyContact).filter(
        EmergencyContact.user_id == current_user.id
    ).all()

    contact_emails = [c.email for c in contacts if c.email]
    if contact_emails:
        email_data = build_sos_resolved_email(current_user.full_name)
        background_tasks.add_task(
            send_email,
            to_emails=contact_emails,
            subject=email_data["subject"],
            html_body=email_data["html"],
        )

    return alert


@router.get("/history", response_model=list[SOSAlertResponse])
def get_sos_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get the current user's SOS alert history."""
    return db.query(SOSAlert).filter(
        SOSAlert.user_id == current_user.id
    ).order_by(SOSAlert.created_at.desc()).all()


def _time_of_day() -> str:
    hour = datetime.utcnow().hour
    if 5 <= hour < 12:
        return "Morning"
    elif 12 <= hour < 17:
        return "Afternoon"
    elif 17 <= hour < 21:
        return "Evening"
    return "Night"
