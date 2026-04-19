from datetime import datetime, timedelta, timezone
import random
import urllib.parse
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import Response
from sqlalchemy import or_
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.crime_report import CrimeReport
from app.models.report_confirmation import ReportConfirmation
from app.models.saved_location import SavedLocation
from app.models.user import User
from app.routes.ws_alerts import manager
from app.schemas.crime_report import CrimeReportResponse
from app.services.ai_verification import verify_report_media
from app.services.cloudinary_service import upload_image
from app.services.pdf_service import generate_report_pdf
from app.services.trust_score import calculate_submit_trust_score
from app.utils.auth import get_current_user
from app.utils.report_serialization import serialize_report


router = APIRouter(prefix="/api/reports", tags=["reports"])


def generate_report_id(db: Session) -> str:
    """Generate a random user-facing report id like CR12345."""
    while True:
        candidate = f"CR{random.randint(10000, 99999)}"
        exists = db.query(CrimeReport).filter(CrimeReport.report_id == candidate).first()
        if not exists:
            return candidate


def _parse_report_datetime(date_occurred: str) -> datetime:
    parsed = datetime.fromisoformat(date_occurred.replace("Z", "+00:00"))
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


@router.post("/", response_model=CrimeReportResponse, status_code=status.HTTP_201_CREATED)
async def submit_report(
    crime_type: str = Form(...),
    severity: str = Form(...),
    description: str = Form(...),
    latitude: float = Form(...),
    longitude: float = Form(...),
    date_occurred: str = Form(...),
    area_name: Optional[str] = Form(None),
    time_of_day: Optional[str] = Form(None),
    files: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a new crime report with optional files for AI verification.
    Admin users cannot submit reports; they can only verify them.
    """
    if current_user.role == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin users cannot submit reports. Use the Admin Panel to verify reports submitted by citizens.",
        )

    parsed_date_occurred = _parse_report_datetime(date_occurred)
    has_real_files = bool(files and any(upload.filename for upload in files))
    file_count = sum(1 for upload in files if upload.filename)

    scoring_result = calculate_submit_trust_score(
        db=db,
        current_user=current_user,
        crime_type=crime_type,
        severity=severity,
        description=description,
        latitude=latitude,
        longitude=longitude,
        date_occurred=parsed_date_occurred,
        area_name=area_name,
        time_of_day=time_of_day,
        has_media=has_real_files,
        file_count=file_count,
    )
    trust_score = scoring_result["trust_score"]
    admin_notes = scoring_result["admin_notes"]

    media_urls = []
    first_file_bytes = None

    if has_real_files:
        for upload in files:
            if not upload.filename:
                continue

            file_bytes = await upload.read()
            if first_file_bytes is None:
                first_file_bytes = file_bytes

            url = await upload_image(file_bytes)
            if url:
                media_urls.append(url)

        if first_file_bytes:
            verification_result = await verify_report_media(
                file_bytes=first_file_bytes,
                reported_lat=latitude,
                reported_lng=longitude,
                description=description,
                text_baseline_score=trust_score,
            )
            trust_score = verification_result["trust_score"]
            admin_notes = f"{admin_notes}\n\n{verification_result['admin_notes']}"
        else:
            admin_notes += "\n\nMedia upload was requested, but no readable file bytes were available."
    else:
        admin_notes += f"\n\nNo image attached. Final pre-review trust score: {trust_score:.1f}/100"

    trust_score = max(0.0, min(100.0, trust_score))

    report_status = "pending"
    if trust_score < 50.0:
        report_status = "rejected"
        admin_notes += (
            "\n\nAUTO-REJECTED: Trust score is below the 50% threshold. "
            "This report will not be shown on the public map."
        )
    else:
        admin_notes += (
            "\n\nPENDING REVIEW: Trust score is above the minimum threshold and awaits admin verification."
        )

    new_report = CrimeReport(
        report_id=generate_report_id(db),
        user_id=current_user.id,
        crime_type=crime_type,
        severity=severity,
        description=description,
        latitude=latitude,
        longitude=longitude,
        area_name=area_name,
        date_occurred=parsed_date_occurred,
        time_of_day=time_of_day,
        media_urls=media_urls,
        status=report_status,
        trust_score=round(trust_score, 1),
        admin_notes=admin_notes,
    )

    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    return serialize_report(new_report, viewer_id=current_user.id)


@router.get("/my", response_model=list[CrimeReportResponse])
def get_my_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get all reports submitted by the logged-in user."""
    reports = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(CrimeReport.user_id == current_user.id)
        .order_by(CrimeReport.created_at.desc())
        .all()
    )
    return [serialize_report(report, viewer_id=current_user.id) for report in reports]


@router.get("/recent-nearby", response_model=list[CrimeReportResponse])
def get_recent_nearby_reports(
    lat: float,
    lng: float,
    radius_km: float = 5.0,
    db: Session = Depends(get_db),
):
    """Fetch reports verified in the last 24 hours within the given radius."""
    twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)

    recent_reports = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(
            CrimeReport.status == "verified",
            CrimeReport.verified_at >= twenty_four_hours_ago,
        )
        .all()
    )

    nearby_reports = []
    for report in recent_reports:
        if report.latitude is None or report.longitude is None:
            continue

        distance = manager._calculate_distance(lat, lng, report.latitude, report.longitude)
        if distance <= radius_km:
            nearby_reports.append(report)

    nearby_reports.sort(key=lambda item: item.verified_at, reverse=True)
    return [serialize_report(report) for report in nearby_reports]


@router.get("/recent-saved-location-alerts")
def get_recent_saved_location_alerts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch recent verified reports near any of the current user's saved places."""
    saved_locations = (
        db.query(SavedLocation)
        .filter(SavedLocation.user_id == current_user.id)
        .all()
    )
    if not saved_locations:
        return []

    recent_reports = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(
            CrimeReport.status == "verified",
            CrimeReport.verified_at >= datetime.utcnow() - timedelta(hours=24),
        )
        .all()
    )

    alerts = []
    seen_ids = set()
    for report in recent_reports:
        if report.latitude is None or report.longitude is None:
            continue

        matched_place = None
        for place in saved_locations:
            distance = manager._calculate_distance(
                report.latitude,
                report.longitude,
                place.latitude,
                place.longitude,
            )
            if distance <= 2.5 and (matched_place is None or distance < matched_place["distance_km"]):
                matched_place = {
                    "label": place.label,
                    "distance_km": round(distance, 2),
                }

        if not matched_place or report.id in seen_ids:
            continue

        seen_ids.add(report.id)
        payload = serialize_report(report, viewer_id=current_user.id)
        payload["matched_place_label"] = matched_place["label"]
        payload["matched_place_distance"] = matched_place["distance_km"]
        alerts.append(payload)

    alerts.sort(key=lambda item: item["created_at"], reverse=True)
    return alerts


@router.get("/{report_id}", response_model=CrimeReportResponse)
def get_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single report by id or report_id. User must be the owner or an admin."""
    report = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id))
        .first()
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to view this report")

    return serialize_report(report, viewer_id=current_user.id, include_user=current_user.role == "admin")


@router.get("/{report_id}/pdf")
def download_my_report_pdf(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Download a user's own crime report as a formatted PDF."""
    report = db.query(CrimeReport).filter(
        or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id)
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.user_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to download this report")

    pdf_bytes = generate_report_pdf(report)
    report_name = report.report_id or report.id
    pdf_filename = f"Vigilo_Report_{report_name}.pdf"
    encoded_filename = urllib.parse.quote(pdf_filename)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{pdf_filename}"; '
                f"filename*=UTF-8''{encoded_filename}"
            ),
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
        },
    )


@router.put("/{report_id}", response_model=CrimeReportResponse)
def update_report(
    report_id: str,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update a report's description. Only allowed if owner and status is info_requested or pending."""
    report = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id))
        .first()
    )

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this report")

    if report.status not in ("info_requested", "pending"):
        raise HTTPException(status_code=400, detail="Cannot update report in current status")

    if "description" in data:
        report.description = data["description"]
        if report.status == "info_requested":
            report.status = "pending"
            report.admin_notes = (
                (report.admin_notes or "")
                + f"\n\n[User Update {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}] {data['description']}"
            )

    db.commit()
    db.refresh(report)
    return serialize_report(report, viewer_id=current_user.id)


@router.post("/{report_id}/confirm")
def confirm_report(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark that the current user witnessed the same verified incident."""
    report = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id))
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report.status != "verified":
        raise HTTPException(status_code=400, detail="Only verified reports can be community-confirmed")
    if report.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot confirm your own report")

    existing = db.query(ReportConfirmation).filter(
        ReportConfirmation.report_id == report.id,
        ReportConfirmation.user_id == current_user.id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You already confirmed this report")

    confirmation = ReportConfirmation(report_id=report.id, user_id=current_user.id)
    db.add(confirmation)
    db.commit()
    db.refresh(report)
    return serialize_report(report, viewer_id=current_user.id)


@router.delete("/{report_id}/confirm")
def remove_report_confirmation(
    report_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove the current user's witness confirmation from a verified report."""
    report = (
        db.query(CrimeReport)
        .options(joinedload(CrimeReport.confirmations))
        .filter(or_(CrimeReport.id == report_id, CrimeReport.report_id == report_id))
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    confirmation = db.query(ReportConfirmation).filter(
        ReportConfirmation.report_id == report.id,
        ReportConfirmation.user_id == current_user.id,
    ).first()
    if not confirmation:
        raise HTTPException(status_code=404, detail="Confirmation not found")

    db.delete(confirmation)
    db.commit()
    db.refresh(report)
    return serialize_report(report, viewer_id=current_user.id)
