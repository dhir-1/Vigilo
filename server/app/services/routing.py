import requests
import math
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.crime_report import CrimeReport

OSRM_BASE_URL = "http://router.project-osrm.org/route/v1/driving"

def calculate_safe_routes(
    db: Session,
    start_lat: float, start_lng: float,
    end_lat: float, end_lng: float,
    travel_time_str: Optional[str] = None
) -> Dict[str, Any]:

    print(f"Calculating route via OSRM: {start_lat},{start_lng} → {end_lat},{end_lng}")

    # Call OSRM public API
    url = f"{OSRM_BASE_URL}/{start_lng},{start_lat};{end_lng},{end_lat}"
    params = {
        "overview": "full",
        "geometries": "geojson",
        "steps": "false"
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        raise Exception(f"OSRM routing failed: {e}")

    if data.get("code") != "Ok" or not data.get("routes"):
        raise Exception("OSRM returned no routes.")

    route = data["routes"][0]
    geometry = route["geometry"]["coordinates"]  # [[lng, lat], ...]

    # Convert to [lat, lng] for Leaflet
    coords = [[pt[1], pt[0]] for pt in geometry]

    distance_km = round(route["distance"] / 1000, 1)
    duration_min = round(route["duration"] / 60, 1)

    # Calculate safety score along the route
    print("Calculating safety score along route...")
    all_crimes = db.query(
        CrimeReport.latitude,
        CrimeReport.longitude,
        CrimeReport.severity
    ).filter(CrimeReport.status == "verified").all()

    crime_points = [
        (c.latitude, c.longitude)
        for c in all_crimes
        if c.latitude and c.longitude
    ]

    # Sample every 5th coordinate for performance
    sampled_coords = coords[::5] or coords
    segment_risks = []

    for lat, lng in sampled_coords:
        nearby_count = sum(
            1 for clat, clng in crime_points
            if abs(clat - lat) < 0.002 and abs(clng - lng) < 0.002
        )
        risk = min(nearby_count / 5.0, 1.0) * 100
        segment_risks.append(risk)

    avg_risk = sum(segment_risks) / len(segment_risks) if segment_risks else 0
    safety_score = round(100 - avg_risk, 1)
    risk_score = round(avg_risk, 1)

    print(f"✅ Route calculated. Distance={distance_km}km, Duration={duration_min}min, Safety={safety_score}")

    route_stats = {
        "distance_km": distance_km,
        "duration_min": duration_min,
        "risk_score": risk_score,
        "safety_score": safety_score,
    }

    return {
        "routes": {
            "safest":   coords,
            "balanced": coords,
            "fastest":  coords,
        },
        "stats": {
            "safest":   route_stats,
            "balanced": route_stats,
            "fastest":  route_stats,
        },
        "summary": {
            "safety_score": safety_score,
            "warnings": [{
                "area": None,
                "message": "Route calculated using OSRM with crime density analysis."
            }]
        },
    }