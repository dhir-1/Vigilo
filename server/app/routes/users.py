"""
User-facing public routes. No sensitive data (email, phone, password_hash) is ever returned.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User

router = APIRouter(prefix="/api/users", tags=["users"])

BADGE_RULES = [
    ("Safety Pioneer",   lambda r, c, s: True),
    ("Watchful Neighbor",lambda r, c, s: r >= 1),
    ("Top Reporter",     lambda r, c, s: r >= 5),
    ("Community Hero",   lambda r, c, s: c >= 3),
    ("Survivor",         lambda r, c, s: s > 0),
    ("City Guardian",    lambda r, c, s: r >= 10),
]


def _compute_badges(total_reports: int, contact_count: int, sos_count: int) -> list[str]:
    return [
        label for label, check in BADGE_RULES
        if check(total_reports, contact_count, sos_count)
    ]


@router.get("/public/{user_id}")
def get_public_profile(user_id: str, db: Session = Depends(get_db)):
    """
    Returns a user's public profile. Sensitive fields (email, phone,
    password_hash) are strictly omitted. Respects the privacy_profile flag.
    """
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_reports   = len(user.crime_reports)
    verified_reports = sum(1 for r in user.crime_reports if r.status == "verified")
    contact_count   = len(user.emergency_contacts)
    sos_count       = len(user.sos_alerts)

    badges = _compute_badges(total_reports, contact_count, sos_count)

    # Private profile — only reveal name + avatar
    if user.privacy_profile:
        return {
            "id":                user.id,
            "full_name":         user.full_name,
            "role":              user.role,
            "profile_photo_url": user.profile_photo_url,
            "banner_url":        None,
            "is_private":        True,
            "joined":            None,
            "total_reports":     None,
            "verified_reports":  None,
            "badges":            [],
            "recent_reports":    [],
        }

    # Recent verified reports (public contribution feed, max 20)
    recent = [
        {
            "id":          r.report_id or r.id,
            "crime_type":  r.crime_type,
            "severity":    r.severity,
            "area_name":   r.area_name,
            "status":      r.status,
            "trust_score": float(r.trust_score) if r.trust_score is not None else 0.0,
            "date_occurred": r.date_occurred.isoformat() if r.date_occurred else None,
            "created_at":  r.created_at.isoformat() if r.created_at else None,
        }
        for r in sorted(user.crime_reports, key=lambda x: x.created_at or "", reverse=True)
        if r.status == "verified"
    ][:20]

    return {
        "id":                user.id,
        "full_name":         user.full_name,
        "role":              user.role,
        "profile_photo_url": user.profile_photo_url,
        "banner_url":        user.banner_url,
        "is_private":        False,
        "joined":            user.created_at.isoformat() if user.created_at else None,
        "total_reports":     total_reports,
        "verified_reports":  verified_reports,
        "badges":            badges,
        "recent_reports":    recent,
    }
