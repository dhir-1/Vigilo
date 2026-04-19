"""
Public endpoints that don't require authentication.
Used by the landing page to display real-time platform statistics.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.crime_report import CrimeReport
from app.models.user import User

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/stats")
def get_public_stats(db: Session = Depends(get_db)):
    """
    Returns aggregated platform statistics for the landing page.
    No authentication required.
    """
    total_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_reports = db.query(func.count(CrimeReport.id)).scalar() or 0
    verified_reports = db.query(func.count(CrimeReport.id)).filter(
        CrimeReport.status == "verified"
    ).scalar() or 0

    # Accuracy rate = verified / total (avoid division by zero)
    accuracy = round((verified_reports / total_reports) * 100) if total_reports > 0 else 0

    # Active zones = distinct area names with verified reports
    active_zones = db.query(func.count(func.distinct(CrimeReport.area_name))).filter(
        CrimeReport.status == "verified",
        CrimeReport.area_name.isnot(None),
    ).scalar() or 0

    return {
        "active_users": total_users,
        "reports_verified": verified_reports,
        "total_reports": total_reports,
        "accuracy_rate": accuracy,
        "active_zones": active_zones,
    }
