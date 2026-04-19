from typing import Optional


def serialize_report(report, viewer_id: Optional[str] = None, include_user: bool = False) -> dict:
    confirmations = list(getattr(report, "confirmations", []) or [])
    confirmation_count = len(confirmations)
    community_trust_boost = min(12.0, confirmation_count * 3.0)
    base_trust_score = float(report.trust_score) if report.trust_score is not None else 0.0
    effective_trust_score = round(min(100.0, base_trust_score + community_trust_boost), 1)
    viewer_has_confirmed = any(c.user_id == viewer_id for c in confirmations) if viewer_id else False

    return {
        "id": report.id,
        "report_id": report.report_id,
        "user_id": report.user_id,
        "reporter_name": report.reporter_name,
        "user": report.user if include_user else None,
        "crime_type": report.crime_type,
        "severity": report.severity,
        "description": report.description,
        "latitude": report.latitude,
        "longitude": report.longitude,
        "area_name": report.area_name,
        "date_occurred": report.date_occurred,
        "time_of_day": report.time_of_day,
        "status": report.status,
        "trust_score": effective_trust_score,
        "admin_notes": report.admin_notes,
        "rejection_reason": report.rejection_reason,
        "media_urls": report.media_urls or [],
        "is_sos": report.is_sos,
        "community_confirmation_count": confirmation_count,
        "viewer_has_confirmed": viewer_has_confirmed,
        "community_trust_boost": community_trust_boost,
        "created_at": report.created_at,
    }
