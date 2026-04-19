from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from app.database import get_db
from app.services.routing import calculate_safe_routes
from app.models.route_cache import RouteCache
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/api/navigation", tags=["Navigation"])

@router.get("/route")
def get_safe_route(
    start_lat: float = Query(...),
    start_lng: float = Query(...),
    end_lat: float = Query(...),
    end_lng: float = Query(...),
    time_of_day: Optional[str] = Query(None),
    use_cache: bool = Query(True),
    db: Session = Depends(get_db)
):
    # Check cache first for nearby coordinates (rounded to ~11 meters)
    s_lat = round(start_lat, 4)
    s_lng = round(start_lng, 4)
    e_lat = round(end_lat, 4)
    e_lng = round(end_lng, 4)

    if use_cache:
        cached = db.query(RouteCache).filter(
            RouteCache.start_lat == s_lat,
            RouteCache.start_lng == s_lng,
            RouteCache.end_lat == e_lat,
            RouteCache.end_lng == e_lng,
            RouteCache.expires_at > datetime.utcnow()
        ).first()

        if cached:
            return cached.route_data

    # Calculate routes
    try:
        data = calculate_safe_routes(db, start_lat, start_lng, end_lat, end_lng)
        
        # Save to cache if routes were successfully calculated
        if data.get("routes") and data["routes"].get("safest"):
            new_cache = RouteCache(
                start_lat=s_lat,
                start_lng=s_lng,
                end_lat=e_lat,
                end_lng=e_lng,
                route_data=data,
                expires_at=datetime.utcnow() + timedelta(hours=24)
            )
            db.add(new_cache)
            db.commit()
        
        return data

    except Exception as e:
        import traceback
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Route calculation failed: {str(e)}")
