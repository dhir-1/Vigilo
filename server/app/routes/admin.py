"""
Admin routes — analytics, report management, PDF generation, police escalation.
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, or_
from datetime import datetime, timedelta
from typing import List, Optional

from app.database import get_db
from app.models.crime_report import CrimeReport
from app.models.user import User
from app.schemas.crime_report import CrimeReportResponse
from app.schemas.auth import UserResponse
from app.schemas.admin import ReportVerificationRequest
from app.utils.auth import get_current_admin
from app.services.pdf_service import generate_report_pdf
from app.services.email_service import send_email
import urllib.parse
from app.routes.ws_alerts import manager
import asyncio

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Analytics ────────────────────────────────────────────

@router.get("/analytics")
def get_analytics(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Get dashboard analytics — counts, breakdowns, trends."""
    total = db.query(CrimeReport).count()
    verified = db.query(CrimeReport).filter(CrimeReport.status == "verified").count()
    pending = db.query(CrimeReport).filter(CrimeReport.status == "pending").count()
    rejected = db.query(CrimeReport).filter(CrimeReport.status == "rejected").count()
    sos_count = db.query(CrimeReport).filter(CrimeReport.is_sos == True).count()

    # Crime type breakdown
    type_rows = db.query(
        CrimeReport.crime_type, func.count(CrimeReport.id)
    ).group_by(CrimeReport.crime_type).all()
    crime_types = {row[0]: row[1] for row in type_rows}

    # Severity breakdown
    sev_rows = db.query(
        CrimeReport.severity, func.count(CrimeReport.id)
    ).group_by(CrimeReport.severity).all()
    severities = {row[0]: row[1] for row in sev_rows}

    # Daily trend (last 30 days)
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    trend_rows = db.query(
        func.date(CrimeReport.date_occurred), func.count(CrimeReport.id)
    ).filter(
        CrimeReport.date_occurred >= thirty_days_ago
    ).group_by(func.date(CrimeReport.date_occurred)).order_by(func.date(CrimeReport.date_occurred)).all()
    daily_trend = [{"date": str(row[0]), "count": row[1]} for row in trend_rows]

    # Total users
    total_users = db.query(User).count()

    return {
        "total_reports": total,
        "verified": verified,
        "pending": pending,
        "rejected": rejected,
        "sos_alerts": sos_count,
        "total_users": total_users,
        "crime_types": crime_types,
        "severities": severities,
        "daily_trend": daily_trend
    }


# ── Report Management ────────────────────────────────────

@router.get("/reports/pending", response_model=List[CrimeReportResponse])
def get_pending_reports(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Get all pending reports sorted by trust score (lowest first)."""
    return db.query(CrimeReport).options(joinedload(CrimeReport.user)).filter(CrimeReport.status == "pending").order_by(CrimeReport.trust_score.asc()).all()


@router.get("/reports/all", response_model=List[CrimeReportResponse])
def get_all_reports(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Get all reports sorted by newest first."""
    return db.query(CrimeReport).options(joinedload(CrimeReport.user)).order_by(CrimeReport.created_at.desc()).limit(100).all()


@router.post("/reports/{report_id}/verify", response_model=CrimeReportResponse)
async def verify_report(
    report_id: str,
    action_data: ReportVerificationRequest,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Approve, reject, or request more info on a pending report."""
    report = db.query(CrimeReport).options(joinedload(CrimeReport.user)).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()

    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status not in ("pending", "info_requested"):
        raise HTTPException(status_code=400, detail=f"Report is already {report.status}")

    if action_data.action == "approve":
        report.status = "verified"
        report.verified_at = datetime.utcnow()
        report.verified_by = admin.id
        report.admin_notes = action_data.admin_notes
        
    elif action_data.action == "reject":
        if not action_data.rejection_reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        report.status = "rejected"
        report.rejection_reason = action_data.rejection_reason
        report.admin_notes = action_data.admin_notes
        report.verified_by = admin.id
        
    elif action_data.action == "request_info":
        report.status = "info_requested"
        report.admin_notes = action_data.admin_notes
        
    else:
        raise HTTPException(status_code=400, detail="Invalid action")

    db.commit()
    db.refresh(report)

    # Broadcast proximity alert AFTER commit, only for approved reports
    if action_data.action == "approve":
        try:
            report_data = {
                "id": report.id,
                "report_id": report.report_id,
                "crime_type": report.crime_type,
                "severity": report.severity,
                "latitude": report.latitude,
                "longitude": report.longitude,
                "area_name": report.area_name
            }
            print(f"[WS Alert] Broadcasting proximity alert for {report.report_id}...")
            await manager.broadcast_proximity_alert(report_data, radius_km=5.0, broadcast_all=True)
            print(f"[WS Alert] ✅ Broadcast complete for {report.report_id}")
        except Exception as e:
            print(f"[WS Alert] ❌ Failed to broadcast: {e}")

    return report


@router.post("/reports/{report_id}/resolve", response_model=CrimeReportResponse)
def resolve_report(
    report_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Mark a verified report as resolved."""
    report = db.query(CrimeReport).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    if report.status != "verified":
        raise HTTPException(status_code=400, detail=f"Only verified reports can be resolved. This report is {report.status}.")

    report.status = "resolved"
    report.resolved_at = datetime.utcnow()
    report.resolved_by = admin.id

    db.commit()
    db.refresh(report)
    return report


# ── PDF Generation ───────────────────────────────────────

@router.get("/reports/{report_id}/pdf")
@router.get("/reports/{report_id}/pdf/{filename}")
def download_report_pdf(
    report_id: str,
    filename: Optional[str] = None,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Download a crime report as a formatted PDF."""
    report = db.query(CrimeReport).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    pdf_bytes = generate_report_pdf(report)
    
    # Use the human-readable report_id for the filename
    report_name = report.report_id or report.id
    pdf_filename = f"Vigilo_Report_{report_name}.pdf"
    
    # URL encode for filename* (RFC 5987)
    encoded_filename = urllib.parse.quote(pdf_filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{pdf_filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
        }
    )


@router.delete("/reports/{report_id}")
def delete_report(
    report_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Permanently remove a crime report."""
    report = db.query(CrimeReport).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    db.delete(report)
    db.commit()
    return {"message": "Report deleted successfully"}


# ── Police Escalation ────────────────────────────────────

@router.post("/reports/{report_id}/escalate")
def escalate_to_police(
    report_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Escalate a verified report to police via email with PDF attachment."""
    report = db.query(CrimeReport).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    # Generate PDF
    pdf_bytes = generate_report_pdf(report)

    # Build escalation email
    subject = f"[VIGILO ESCALATION] Crime Report {report.report_id} — {report.crime_type} ({report.severity} Severity)"
    
    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🚨 Vigilo Police Escalation</h1>
            <p style="color: rgba(255,255,255,0.7); margin: 8px 0 0;">Report #{report.report_id}</p>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none;">
            <h2 style="color: #1e293b; margin-top: 0;">Crime Report Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Crime Type:</td><td style="padding: 8px 0;">{report.crime_type}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Severity:</td><td style="padding: 8px 0;">{report.severity}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Location:</td><td style="padding: 8px 0;">{report.area_name or 'Surat'} ({report.latitude:.4f}, {report.longitude:.4f})</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Date:</td><td style="padding: 8px 0;">{report.date_occurred.strftime('%B %d, %Y %I:%M %p') if report.date_occurred else 'Unknown'}</td></tr>
                <tr><td style="padding: 8px 0; color: #64748b; font-weight: bold;">Trust Score:</td><td style="padding: 8px 0;">{report.trust_score:.1f}%</td></tr>
            </table>
            <div style="margin-top: 16px; padding: 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h3 style="color: #1e293b; margin-top: 0;">Description</h3>
                <p style="color: #475569;">{report.description}</p>
            </div>
            <p style="margin-top: 20px; color: #94a3b8; font-size: 13px;">A full PDF report is attached to this email. Map link: 
                <a href="https://maps.google.com/?q={report.latitude},{report.longitude}">View on Google Maps</a>
            </p>
        </div>
        <div style="background: #1e293b; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #94a3b8; margin: 0; font-size: 12px;">Sent via Vigilo CrimeSafe AI Platform</p>
        </div>
    </div>
    """

    # Send email (logs to console if no API key)
    send_email(
        to_email="police@surat.gov.in",
        subject=subject,
        html_body=html_body
    )

    # Mark as escalated in admin notes
    escalation_note = f"\n\n🚔 ESCALATED TO POLICE on {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} by admin {admin.email}"
    report.admin_notes = (report.admin_notes or "") + escalation_note
    db.commit()

    return {"status": "escalated", "message": f"Report {report.report_id} has been escalated to authorities."}

# ── User Management ──────────────────────────────────────

@router.get("/users", response_model=List[UserResponse])
def get_users(
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Get all registered users."""
    return db.query(User).order_by(User.created_at.desc()).all()

@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Delete a user."""
    
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Prevent deleting another admin
    if user.role == "admin":
        raise HTTPException(
            status_code=403,
            detail="Admins cannot delete other admins"
        )

    db.delete(user)
    db.commit()

    return {"message": "User deleted successfully"}


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    data: dict,
    admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin-only: Update user information."""

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if "full_name" in data:
        user.full_name = data["full_name"]

    if "role" in data:
        user.role = data["role"]

    db.commit()
    db.refresh(user)

    return user
