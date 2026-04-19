from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.crime_report import CrimeReport
from app.models.user import User
from app.schemas.crime_report import CrimeReportResponse
from app.utils.auth import get_current_user
from app.utils.report_serialization import serialize_report

router = APIRouter(prefix="/api/crimes", tags=["crimes"])

@router.get("", response_model=List[CrimeReportResponse])
@router.get("/", response_model=List[CrimeReportResponse])
def get_crimes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    crime_type: Optional[str] = None,
    severity: Optional[str] = None,
    days_ago: Optional[int] = None,
    time_of_day: Optional[str] = None,
    limit: int = Query(100, le=500)
):
    """
    Get all verified crime reports for the map. 
    Can be filtered by type, severity, time, and recency.
    """
    query = db.query(CrimeReport).options(joinedload(CrimeReport.user)).filter(CrimeReport.status == "verified")

    if crime_type and crime_type != "All":
        query = query.filter(CrimeReport.crime_type == crime_type)
        
    if severity and severity != "All":
        query = query.filter(CrimeReport.severity == severity)
        
    if time_of_day and time_of_day != "All":
        query = query.filter(CrimeReport.time_of_day == time_of_day)
        
    if days_ago:
        date_threshold = datetime.utcnow() - timedelta(days=days_ago)
        query = query.filter(CrimeReport.date_occurred >= date_threshold)

    reports = (
        query.options(joinedload(CrimeReport.confirmations))
        .order_by(CrimeReport.date_occurred.desc())
        .limit(limit)
        .all()
    )
    return [serialize_report(report, viewer_id=current_user.id) for report in reports]
