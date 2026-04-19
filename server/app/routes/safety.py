"""
Safety Score API
- GET /api/safety/score       → Safety score for a point (with optional time)
- GET /api/safety/hourly-risk → Full 24-hour risk multiplier array for the time slider
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.services.safety_score import calculate_safety_score, get_all_hourly_multipliers

router = APIRouter(prefix="/api/safety", tags=["safety"])


@router.get("/score")
def get_safety_score(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    radius: float = Query(1000, description="Search radius in meters"),
    hour: Optional[int] = Query(None, ge=0, le=23, description="Hour of day (0-23) for time-based adjustment"),
    db: Session = Depends(get_db),
):
    """
    Calculate the safety score (0-100) for any map point.
    Optionally pass `hour` to get a time-adjusted score.
    """
    return calculate_safety_score(db, lat, lng, radius_m=radius, hour=hour)


@router.get("/hourly-risk")
def get_hourly_risk(db: Session = Depends(get_db)):
    """
    Returns the 24-hour risk multiplier array.
    Used by the frontend time slider to colorise the bar and adjust the heat map.
    """
    return get_all_hourly_multipliers(db)
