"""
Safety Score Service
Calculates safety scores for any lat/lng point in Surat,
with optional time-of-day risk multiplier.
"""
import math
import pickle
import os
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.crime_report import CrimeReport

# ── Load the trained XGBoost model ─────────────────────────────────────────

MODEL_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'ml_model.pkl')
MODEL = None

if os.path.exists(MODEL_PATH):
    try:
        with open(MODEL_PATH, 'rb') as f:
            MODEL = pickle.load(f)
        print("✅ XGBoost model loaded successfully.")
    except Exception as e:
        print(f"❌ Error loading XGBoost model: {e}")
else:
    print(f"❌ Model file not found at {MODEL_PATH}")

# ── Haversine helper (pure Python, no PostGIS needed) ──────────────────────

def batch_calculate_safety_scores(
    db: Session,
    points: list,  # list of (lat, lng) tuples
    radius_m: float = 200,
    hour: Optional[int] = None,
) -> list:
    """
    Batch version — fetches ALL nearby crimes once, then scores each point.
    Much faster than calling calculate_safety_score() per edge.
    """
    if not points:
        return []

    # Single DB query to get all verified crimes
    all_crimes = db.query(
        CrimeReport.latitude,
        CrimeReport.longitude,
        CrimeReport.severity,
        CrimeReport.date_occurred
    ).filter(CrimeReport.status == "verified").all()

    results = []
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=30)

    for lat, lng in points:
        nearby = []
        for c in all_crimes:
            if c.latitude and c.longitude:
                dist = haversine_meters(lat, lng, c.latitude, c.longitude)
                if dist <= radius_m:
                    nearby.append((c, dist))

        crime_count = len(nearby)
        if crime_count == 0:
            results.append(95.0)
            continue

        severity_total = sum(SEVERITY_WEIGHT.get(c.severity, 1.0) for c, _ in nearby)
        avg_severity = severity_total / crime_count
        recent_count = sum(1 for c, _ in nearby if c.date_occurred and c.date_occurred >= recent_cutoff)
        recency_ratio = recent_count / crime_count

        count_danger = min(crime_count / 20, 1.0)
        severity_danger = (avg_severity - 1.0) / 2.0
        danger = count_danger * 0.50 + severity_danger * 0.30 + recency_ratio * 0.20
        score = max(0.0, min(100.0, 100.0 * (1.0 - danger)))
        results.append(round(score, 1))

    return results
def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two lat/lng points in meters."""
    R = 6_371_000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)

    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


# ── Approximate bounding box for fast DB pre-filter ────────────────────────

def bounding_box(lat: float, lng: float, radius_m: float):
    """Return (min_lat, max_lat, min_lng, max_lng) for a given radius in meters."""
    # 1 degree latitude  ≈ 111,320 m
    # 1 degree longitude ≈ 111,320 m * cos(lat)
    d_lat = radius_m / 111_320
    d_lng = radius_m / (111_320 * math.cos(math.radians(lat)))
    return lat - d_lat, lat + d_lat, lng - d_lng, lng + d_lng


# ── Hourly risk multiplier (for UI) ────────────────────────────────────────

# ── Hourly risk multiplier cache ───────────────────────────────────────────
_HOURLY_CACHE = {
    "data": {},
    "timestamp": datetime.min
}

def get_hourly_risk_multipliers(db: Session) -> Dict[int, float]:
    """
    Analyse all verified crimes and return a risk multiplier for each hour (0-23).
    Multiplier = crimes_in_hour / average_crimes_per_hour.
    Hours with zero crimes still get a small baseline (0.3).
    Includes 10-minute caching to prevent redundant DB scans.
    """
    now = datetime.utcnow()
    if (_HOURLY_CACHE["data"] and 
        (now - _HOURLY_CACHE["timestamp"]) < timedelta(minutes=10)):
        return _HOURLY_CACHE["data"]

    crimes = (
        db.query(CrimeReport.date_occurred)
        .filter(CrimeReport.status == "verified", CrimeReport.date_occurred.isnot(None))
        .all()
    )

    hour_counts = {h: 0 for h in range(24)}
    for (dt,) in crimes:
        if dt:
            hour_counts[dt.hour] += 1

    total = sum(hour_counts.values())
    avg = total / 24 if total > 0 else 1.0

    multipliers = {}
    for h in range(24):
        if avg > 0 and hour_counts[h] > 0:
            multipliers[h] = round(hour_counts[h] / avg, 2)
        else:
            multipliers[h] = 0.3  # baseline for hours with no data
    
    _HOURLY_CACHE["data"] = multipliers
    _HOURLY_CACHE["timestamp"] = now
    return multipliers


def get_risk_multiplier_for_hour(db: Session, hour: int) -> float:
    """Get the risk multiplier for a specific hour."""
    mults = get_hourly_risk_multipliers(db)
    return mults.get(hour % 24, 1.0)


# ── Main safety-score calculation (Now powered by XGBoost) ─────────────────

def calculate_safety_score(
    db: Session,
    lat: float,
    lng: float,
    radius_m: float = 1000,
    hour: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Calculate a 0-100 safety score for a point using the XGBoost model.
    The model predicts the most likely crime severity (0=Low, 1=Medium, 2=High).
    The safety score is inversely related to the predicted severity and crime density.
    """
    if MODEL is None:
        # Fallback to old logic if model isn't loaded
        return _calculate_safety_score_statistical(db, lat, lng, radius_m, hour)

    now = datetime.utcnow()
    current_hour = hour if hour is not None else now.hour
    day_of_week = now.weekday()
    month = now.month

    # We need to simulate different crime types to get a full risk profile
    # These are hardcoded to match the training script's encoding
    crime_type_encodings = {
        'Theft': 0, 'Assault': 1, 'Robbery': 2, 'Vandalism': 3, 
        'Burglary': 4, 'Other': 5
    }
    time_of_day_encodings = {
        'Morning': 0, 'Afternoon': 1, 'Evening': 2, 'Night': 3
    }
    
    # Determine time_of_day from hour
    if 5 <= current_hour < 12:
        time_of_day_encoded = time_of_day_encodings['Morning']
    elif 12 <= current_hour < 17:
        time_of_day_encoded = time_of_day_encodings['Afternoon']
    elif 17 <= current_hour < 21:
        time_of_day_encoded = time_of_day_encodings['Evening']
    else:
        time_of_day_encoded = time_of_day_encodings['Night']

    # Create a DataFrame for prediction
    predictions = []
    for crime_code in crime_type_encodings.values():
        features = {
            'latitude': lat,
            'longitude': lng,
            'hour': current_hour,
            'day_of_week': day_of_week,
            'month': month,
            'crime_type_encoded': crime_code,
            'time_of_day_encoded': time_of_day_encoded
        }
        predictions.append(features)
    
    df_pred = pd.DataFrame(predictions)

    # Predict severity for each potential crime type
    predicted_severities = MODEL.predict(df_pred)
    
    # The risk is the average predicted severity (0, 1, or 2)
    # A higher average means the model thinks severe crimes are more likely here
    avg_predicted_severity = sum(predicted_severities) / len(predicted_severities)

    # Convert average severity (0-2) to a danger score (0-1)
    danger_from_model = avg_predicted_severity / 2.0

    # Also consider crime density from the old method for a blended score
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius_m)
    crime_count = db.query(CrimeReport).filter(
        CrimeReport.status == "verified",
        CrimeReport.latitude.between(min_lat, max_lat),
        CrimeReport.longitude.between(min_lng, max_lng),
    ).count()
    
    density_danger = min(crime_count / 20, 1.0) # Normalize density

    # Blended danger score
    total_danger = (danger_from_model * 0.7) + (density_danger * 0.3)

    base_score = max(0.0, min(100.0, 100.0 * (1.0 - total_danger)))

    # Determine risk level from score
    if base_score >= 70:
        risk_level = "Low"
        description = "safe"
    elif base_score >= 40:
        risk_level = "Medium"
        description = "moderate"
    else:
        risk_level = "High"
        description = "dangerous"

    return _build_result(
        base_score, crime_count, avg_predicted_severity, 
        risk_level, description, [], hour, db
    )


# ── Statistical Fallback (Old Logic) ───────────────────────────────────────

SEVERITY_WEIGHT = {"High": 3.0, "Medium": 2.0, "Low": 1.0}

def _calculate_safety_score_statistical(
    db: Session,
    lat: float,
    lng: float,
    radius_m: float = 1000,
    hour: Optional[int] = None,
) -> Dict[str, Any]:
    """
    The original statistical safety score logic, kept as a fallback.
    """
    print("⚠️ Using statistical fallback for safety score calculation.")
    # 1. Fast bounding-box pre-filter
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius_m)

    crimes: List[CrimeReport] = (
        db.query(CrimeReport)
        .filter(
            CrimeReport.status == "verified",
            CrimeReport.latitude.between(min_lat, max_lat),
            CrimeReport.longitude.between(min_lng, max_lng),
        )
        .all()
    )

    # 2. Refine with true haversine distance
    nearby = []
    for c in crimes:
        dist = haversine_meters(lat, lng, c.latitude, c.longitude)
        if dist <= radius_m:
            nearby.append((c, dist))

    crime_count = len(nearby)

    # ── If no crimes at all, the area is perfectly safe ──
    if crime_count == 0:
        base_score = 95.0
        result = _build_result(base_score, 0, 0.0, "Low", "safe", [], hour, db)
        return result

    # 3. Severity component
    severity_total = sum(SEVERITY_WEIGHT.get(c.severity, 1.0) for c, _ in nearby)
    avg_severity = severity_total / crime_count  # 1.0 – 3.0

    # 4. Recency component
    now = datetime.utcnow()
    recent_cutoff = now - timedelta(days=30)
    recent_count = sum(
        1 for c, _ in nearby
        if c.date_occurred and c.date_occurred >= recent_cutoff
    )
    recency_ratio = recent_count / crime_count

    # 5. Normalise each factor to a 0-1 "danger" value
    count_danger = min(crime_count / 20, 1.0)
    severity_danger = (avg_severity - 1.0) / 2.0
    recency_danger = recency_ratio

    # 6. Weighted danger
    danger = (
        count_danger * 0.50 +
        severity_danger * 0.30 +
        recency_danger * 0.20
    )

    base_score = max(0.0, min(100.0, 100.0 * (1.0 - danger)))

    # 7. Determine risk level
    if base_score >= 70:
        risk_level = "Low"
        description = "safe"
    elif base_score >= 40:
        risk_level = "Medium"
        description = "moderate"
    else:
        risk_level = "High"
        description = "dangerous"

    # 8. Nearest crime
    nearest = min(nearby, key=lambda x: x[1])
    nearest_info = {
        "type": nearest[0].crime_type,
        "distance_m": round(nearest[1]),
        "severity": nearest[0].severity,
    }

    return _build_result(
        base_score, crime_count, avg_severity,
        risk_level, description,
        [nearest_info],
        hour, db,
    )


def _build_result(
    base_score: float,
    crime_count: int,
    avg_severity: float,
    risk_level: str,
    description: str,
    nearest_crimes: list,
    hour: Optional[int],
    db: Session,
) -> Dict[str, Any]:
    """Assemble the response dict, optionally applying time multiplier."""

    adjusted_score = base_score
    time_message = None
    multiplier = 1.0

    if hour is not None:
        multiplier = get_risk_multiplier_for_hour(db, hour)
        if multiplier > 0:
            adjusted_score = max(0, min(100, base_score / multiplier))
        if multiplier > 1.3:
            pct = round((multiplier - 1.0) * 100)
            time_message = f"{pct}% more dangerous at this hour"
        elif multiplier < 0.7:
            pct = round((1.0 - multiplier) * 100)
            time_message = f"{pct}% safer at this hour"

    if adjusted_score >= 70:
        adj_risk = "Low"
        adj_desc = "safe"
    elif adjusted_score >= 40:
        adj_risk = "Medium"
        adj_desc = "moderate"
    else:
        adj_risk = "High"
        adj_desc = "dangerous"

    return {
        "safety_score": round(adjusted_score, 1),
        "base_score": round(base_score, 1),
        "crime_count": crime_count,
        "avg_severity": round(avg_severity, 2),
        "risk_level": adj_risk,
        "description": adj_desc,
        "nearest_crimes": nearest_crimes,
        "time_multiplier": round(multiplier, 2),
        "time_message": time_message,
    }


def get_all_hourly_multipliers(db: Session) -> List[Dict[str, Any]]:
    """Return the full 24-hour risk array for the UI slider."""
    mults = get_hourly_risk_multipliers(db)

    crimes = (
        db.query(CrimeReport.date_occurred)
        .filter(CrimeReport.status == "verified", CrimeReport.date_occurred.isnot(None))
        .all()
    )
    hour_counts = {h: 0 for h in range(24)}
    for (dt,) in crimes:
        if dt:
            hour_counts[dt.hour] += 1

    hourly = []
    for h in range(24):
        m = mults[h]
        if m > 1.3:
            level = "High"
        elif m > 0.7:
            level = "Medium"
        else:
            level = "Low"
        hourly.append({
            "hour": h,
            "multiplier": m,
            "risk_level": level,
            "crime_count": hour_counts[h],
        })

    return hourly

