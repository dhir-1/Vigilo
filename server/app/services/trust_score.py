import math
import os
import pickle
import re
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from typing import Any, Dict, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.crime_report import CrimeReport
from app.models.report_confirmation import ReportConfirmation
from app.models.user import User


TRUST_MODEL_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "trust_model.pkl")

CRIME_TYPE_MAP = {
    "Theft": 0,
    "Assault": 1,
    "Robbery": 2,
    "Vandalism": 3,
    "Burglary": 4,
    "Harassment": 5,
    "Fraud": 6,
    "Drug Related": 7,
    "Other": 8,
}

SEVERITY_MAP = {"Low": 0, "Medium": 1, "High": 2}
TIME_OF_DAY_MAP = {"Morning": 0, "Afternoon": 1, "Evening": 2, "Night": 3}

CRIME_KEYWORDS = {
    "theft": ["theft", "stolen", "steal", "snatch", "pickpocket", "wallet", "phone", "bike"],
    "assault": ["assault", "attacked", "hit", "beaten", "injured", "punch", "stab", "knife"],
    "robbery": ["robbery", "robbed", "gunpoint", "armed", "hold up", "loot"],
    "vandalism": ["vandal", "graffiti", "deface", "smashed", "broken", "damage", "shutter"],
    "harassment": ["harass", "catcall", "stalk", "followed", "threaten", "eve teasing"],
    "fraud": ["fraud", "scam", "phishing", "cheat", "fake", "identity", "otp", "upi"],
    "burglary": ["burglary", "break-in", "broke into", "forced entry", "house break"],
    "drug_related": ["drug", "narcotic", "cocaine", "heroin", "ganja", "weed", "dealer", "selling drugs"],
    "other": ["suspicious", "trespass", "noise", "disturbance", "unknown"],
}

LOCATION_CONTEXT_WORDS = {
    "near",
    "opposite",
    "behind",
    "beside",
    "outside",
    "inside",
    "towards",
    "signal",
    "junction",
    "market",
    "gate",
    "society",
    "apartment",
    "complex",
    "street",
    "road",
    "lane",
    "bridge",
}

SUBJECT_CONTEXT_WORDS = {
    "suspect",
    "person",
    "man",
    "woman",
    "boy",
    "girl",
    "group",
    "people",
    "bike",
    "car",
    "auto",
    "rickshaw",
    "witness",
    "hoodie",
    "number plate",
    "vehicle",
}

GENERIC_AREA_TOKENS = {
    "road",
    "street",
    "lane",
    "area",
    "place",
    "spot",
    "location",
    "surat",
    "gujarat",
    "india",
}

PLACEHOLDER_PATTERNS = [
    r"^test$",
    r"^dummy$",
    r"^na$",
    r"^n/a$",
    r"^none$",
    r"^unknown$",
    r"^someone robbed me\.?$",
    r"^someone assaulted me\.?$",
    r"^someone stole my phone\.?$",
]

TRUST_MODEL_BUNDLE = None


def _load_trust_model_bundle():
    if not os.path.exists(TRUST_MODEL_PATH):
        return None
    try:
        with open(TRUST_MODEL_PATH, "rb") as model_file:
            return pickle.load(model_file)
    except Exception as exc:
        print(f"TRUST MODEL: Failed to load trust model: {exc}")
        return None


TRUST_MODEL_BUNDLE = _load_trust_model_bundle()


def _normalize_text(text: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (text or "").strip().lower())


def _tokenize(text: str) -> list[str]:
    return re.findall(r"[a-zA-Z0-9']+", text.lower())


def _safe_ratio(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _count_structured_details(description: str) -> int:
    desc_lower = description.lower()
    markers = [
        "people involved:",
        "weapon involved:",
        "vehicle information:",
        "items stolen or affected:",
        "property damaged:",
        "money or account affected:",
        "suspect or witness notes:",
    ]
    count = sum(1 for marker in markers if marker in desc_lower)
    count += len(re.findall(r"^\s*-\s+", description, flags=re.MULTILINE))
    return min(count, 5)


def _contains_placeholder(description: str) -> bool:
    normalized = _normalize_text(description)
    return any(re.match(pattern, normalized) for pattern in PLACEHOLDER_PATTERNS)


def _has_noisy_text(description: str) -> bool:
    alpha_chars = [char for char in description if char.isalpha()]
    uppercase_ratio = _safe_ratio(sum(1 for char in alpha_chars if char.isupper()), len(alpha_chars))
    return bool(re.search(r"(.)\1{4,}", description)) or uppercase_ratio > 0.75


def _haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6_371_000
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lng2 - lng1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    return radius * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _score_description(crime_type: str, severity: str, description: str) -> Dict[str, Any]:
    notes = []
    score = 0.0

    desc_lower = description.lower()
    words = _tokenize(description)
    desc_len = len(description.strip())
    word_count = len(words)
    unique_ratio = _safe_ratio(len(set(words)), word_count)
    structured_detail_count = _count_structured_details(description)
    number_count = len(re.findall(r"\b\d+\b", description))
    location_context_hits = [word for word in LOCATION_CONTEXT_WORDS if word in desc_lower]
    subject_context_hits = [word for word in SUBJECT_CONTEXT_WORDS if word in desc_lower]

    if desc_len >= 180:
        score += 16
        notes.append("Very detailed narrative (+16)")
    elif desc_len >= 100:
        score += 12
        notes.append("Detailed narrative (+12)")
    elif desc_len >= 60:
        score += 7
        notes.append("Enough narrative detail (+7)")
    elif desc_len < 30:
        score -= 18
        notes.append("Description is too short (-18)")

    if word_count >= 25:
        score += 5
        notes.append("Rich word count (+5)")
    elif word_count >= 15:
        score += 2
        notes.append("Adequate word count (+2)")
    else:
        score -= 4
        notes.append("Very low word count (-4)")

    if unique_ratio >= 0.72:
        score += 3
        notes.append("Varied wording suggests a genuine account (+3)")
    elif unique_ratio < 0.45:
        score -= 6
        notes.append("Highly repetitive wording (-6)")

    if structured_detail_count:
        structured_bonus = min(9, structured_detail_count * 3)
        score += structured_bonus
        notes.append(f"Structured incident details provided (+{structured_bonus})")

    if location_context_hits:
        score += 3
        notes.append("Description includes location context (+3)")

    if subject_context_hits:
        score += 2
        notes.append("Description includes suspect or witness context (+2)")

    if number_count:
        score += 2
        notes.append("Specific numeric details provided (+2)")

    if _contains_placeholder(description):
        score -= 10
        notes.append("Placeholder-like or overly generic report wording (-10)")

    if _has_noisy_text(description):
        score -= 8
        notes.append("Noisy or spam-like formatting (-8)")

    normalized_severity = severity.strip().lower()
    if normalized_severity == "high" and desc_len < 60:
        score -= 6
        notes.append("High-severity report needs more detail (-6)")
    elif normalized_severity == "high" and (structured_detail_count >= 2 or subject_context_hits):
        score += 4
        notes.append("High-severity report includes strong supporting detail (+4)")
    elif normalized_severity == "medium" and structured_detail_count == 0:
        score -= 3
        notes.append("Medium-severity report is missing supporting detail (-3)")

    return {
        "score": score,
        "notes": notes,
        "desc_len": desc_len,
        "word_count": word_count,
        "unique_ratio": round(unique_ratio, 3),
        "structured_detail_count": structured_detail_count,
        "number_count": number_count,
    }


def _score_area_and_time(area_name: Optional[str], time_of_day: Optional[str], date_occurred: datetime) -> Dict[str, Any]:
    notes = []
    score = 0.0
    now = datetime.utcnow()

    if area_name and len(area_name.strip()) > 3:
        score += 4
        notes.append("Area name provided (+4)")

        area_tokens = [token for token in _tokenize(area_name) if token not in GENERIC_AREA_TOKENS]
        if len(area_tokens) >= 2:
            score += 2
            notes.append("Area name is reasonably specific (+2)")
    else:
        score -= 4
        notes.append("Vague or missing area name (-4)")

    if time_of_day and len(time_of_day.strip()) > 0:
        score += 3
        notes.append("Time-of-day context provided (+3)")
    else:
        score -= 1
        notes.append("Time-of-day context missing (-1)")

    if date_occurred > now + timedelta(minutes=5):
        score -= 35
        notes.append("Incident date appears to be in the future (-35)")
    elif date_occurred > now:
        score -= 20
        notes.append("Incident date is slightly ahead of current time (-20)")
    else:
        incident_age = now - date_occurred
        if incident_age <= timedelta(days=14):
            score += 2
            notes.append("Incident timing is recent (+2)")
        elif incident_age > timedelta(days=365):
            score -= 6
            notes.append("Incident is very old and harder to verify (-6)")

    return {"score": score, "notes": notes}


def _score_location(latitude: float, longitude: float) -> Dict[str, Any]:
    if 21.0 <= latitude <= 21.3 and 72.7 <= longitude <= 72.9:
        return {"score": 10.0, "notes": ["GPS is inside central Surat (+10)"], "gps_region": 2}
    if 20.9 <= latitude <= 21.4 and 72.6 <= longitude <= 73.0:
        return {"score": 6.0, "notes": ["GPS is inside greater Surat (+6)"], "gps_region": 1}
    return {"score": -24.0, "notes": ["GPS falls outside the supported city bounds (-24)"], "gps_region": 0}


def _score_crime_alignment(crime_type: str, description: str) -> Dict[str, Any]:
    notes = []
    score = 0.0
    desc_lower = description.lower()
    normalized_type = crime_type.strip().lower().replace(" ", "_")
    if normalized_type not in CRIME_KEYWORDS:
        return {"score": score, "notes": notes}

    matches = {}
    for other_type, keywords in CRIME_KEYWORDS.items():
        hits = [keyword for keyword in keywords if keyword in desc_lower]
        if hits:
            matches[other_type] = hits

    selected_hits = matches.get(normalized_type, [])
    if selected_hits:
        alignment_bonus = min(6, 2 + len(selected_hits))
        score += alignment_bonus
        notes.append(f"Description matches the selected crime type (+{alignment_bonus})")
        return {"score": score, "notes": notes}

    best_type = None
    best_hits = []
    for other_type, hits in matches.items():
        if other_type == normalized_type:
            continue
        if len(hits) > len(best_hits):
            best_type = other_type
            best_hits = hits

    if best_type and best_hits:
        score -= 16
        notes.append(
            f"Description appears closer to {best_type.replace('_', ' ').title()} than {crime_type} (-16)"
        )

    return {"score": score, "notes": notes}


def _score_reporter_history(db: Session, current_user: User) -> Dict[str, Any]:
    notes = []
    score = 0.0
    history = (
        db.query(CrimeReport.status, CrimeReport.created_at)
        .filter(CrimeReport.user_id == current_user.id)
        .all()
    )

    total_reports = len(history)
    verified_reports = sum(1 for status, _ in history if status in ("verified", "resolved"))
    rejected_reports = sum(1 for status, _ in history if status == "rejected")

    if total_reports >= 5 and _safe_ratio(verified_reports, total_reports) >= 0.7:
        score += 8
        notes.append("Reporter has a strong verified-report history (+8)")
    elif total_reports >= 2 and _safe_ratio(verified_reports, total_reports) >= 0.6:
        score += 5
        notes.append("Reporter has a decent verified-report history (+5)")

    if total_reports >= 2 and _safe_ratio(rejected_reports, total_reports) >= 0.5:
        score -= 10
        notes.append("Reporter has a high rejection rate (-10)")
    elif rejected_reports >= 1 and _safe_ratio(rejected_reports, total_reports) >= 0.25:
        score -= 4
        notes.append("Reporter has some rejected history (-4)")

    account_age_days = (datetime.utcnow() - current_user.created_at).days if current_user.created_at else 0
    if account_age_days >= 90:
        score += 3
        notes.append("Long-lived account (+3)")
    elif account_age_days >= 30:
        score += 2
        notes.append("Established account (+2)")
    elif account_age_days >= 7:
        score += 1
        notes.append("Account is not brand new (+1)")

    confirmations_received = (
        db.query(func.count(ReportConfirmation.id))
        .join(CrimeReport, ReportConfirmation.report_id == CrimeReport.id)
        .filter(CrimeReport.user_id == current_user.id)
        .scalar()
        or 0
    )
    if confirmations_received >= 5:
        score += 3
        notes.append("Past reports received community confirmations (+3)")
    elif confirmations_received >= 1:
        score += 1
        notes.append("Reporter has some community-backed history (+1)")

    return {
        "score": max(-12.0, min(14.0, score)),
        "notes": notes,
        "total_reports": total_reports,
        "verified_ratio": round(_safe_ratio(verified_reports, total_reports), 3),
        "rejected_ratio": round(_safe_ratio(rejected_reports, total_reports), 3),
        "account_age_days": account_age_days,
    }


def _score_duplicates_and_corroboration(
    db: Session,
    current_user: User,
    crime_type: str,
    description: str,
    area_name: Optional[str],
    latitude: float,
    longitude: float,
    date_occurred: datetime,
) -> Dict[str, Any]:
    notes = []
    score = 0.0
    normalized_description = _normalize_text(description)
    recent_history = (
        db.query(
            CrimeReport.description,
            CrimeReport.crime_type,
            CrimeReport.area_name,
            CrimeReport.latitude,
            CrimeReport.longitude,
            CrimeReport.date_occurred,
            CrimeReport.created_at,
            CrimeReport.status,
        )
        .filter(
            CrimeReport.user_id == current_user.id,
            CrimeReport.created_at >= datetime.utcnow() - timedelta(days=14),
        )
        .all()
    )

    same_day_burst = sum(
        1
        for _, _, _, _, _, _, created_at, _ in recent_history
        if created_at and created_at >= datetime.utcnow() - timedelta(hours=24)
    )
    if same_day_burst >= 4:
        score -= 8
        notes.append("High burst of recent submissions from the same user (-8)")

    strongest_duplicate_penalty = 0.0
    for old_description, old_type, old_area, old_lat, old_lng, old_date, _, old_status in recent_history:
        if (old_type or "").strip().lower() != crime_type.strip().lower():
            continue

        similarity = SequenceMatcher(None, normalized_description, _normalize_text(old_description)).ratio()
        same_area = (old_area or "").strip().lower() == (area_name or "").strip().lower()
        near_same_spot = (
            old_lat is not None
            and old_lng is not None
            and _haversine_meters(latitude, longitude, old_lat, old_lng) <= 700
        )
        close_in_time = old_date and abs((date_occurred - old_date).total_seconds()) <= 2 * 24 * 3600

        if similarity >= 0.88 and (same_area or near_same_spot or close_in_time):
            strongest_duplicate_penalty = min(strongest_duplicate_penalty, -18.0)
            if old_status in ("pending", "rejected"):
                strongest_duplicate_penalty = min(strongest_duplicate_penalty, -20.0)
        elif similarity >= 0.72 and (same_area or near_same_spot):
            strongest_duplicate_penalty = min(strongest_duplicate_penalty, -10.0)

    if strongest_duplicate_penalty:
        score += strongest_duplicate_penalty
        notes.append(f"Possible duplicate or recycled report text ({strongest_duplicate_penalty:.0f})")

    corroboration_candidates = (
        db.query(CrimeReport.latitude, CrimeReport.longitude)
        .filter(
            CrimeReport.status == "verified",
            CrimeReport.user_id != current_user.id,
            CrimeReport.crime_type == crime_type,
            CrimeReport.date_occurred >= date_occurred - timedelta(days=3),
            CrimeReport.date_occurred <= date_occurred + timedelta(days=1),
        )
        .all()
    )
    corroboration_count = sum(
        1
        for nearby_lat, nearby_lng in corroboration_candidates
        if nearby_lat is not None
        and nearby_lng is not None
        and _haversine_meters(latitude, longitude, nearby_lat, nearby_lng) <= 1200
    )
    if corroboration_count:
        corroboration_bonus = min(6, corroboration_count * 2)
        score += corroboration_bonus
        notes.append(f"Nearby verified reports support the incident pattern (+{corroboration_bonus})")

    return {"score": score, "notes": notes, "corroboration_count": corroboration_count}


def _encode_with_map(mapping: dict[str, int], value: Optional[str]) -> int:
    if not value:
        return -1
    return mapping.get(value, mapping.get(value.strip().title(), -1))


def _build_ml_features(
    crime_type: str,
    severity: str,
    description_stats: Dict[str, Any],
    area_name: Optional[str],
    time_of_day: Optional[str],
    latitude: float,
    longitude: float,
    date_occurred: datetime,
    has_media: bool,
    file_count: int,
    gps_region: int,
) -> Dict[str, Any]:
    bundle = TRUST_MODEL_BUNDLE or {}
    crime_type_map = bundle.get("crime_type_map", CRIME_TYPE_MAP)
    severity_map = bundle.get("severity_map", SEVERITY_MAP)
    time_of_day_map = bundle.get("time_of_day_map", TIME_OF_DAY_MAP)

    return {
        "latitude": latitude,
        "longitude": longitude,
        "hour": date_occurred.hour,
        "day_of_week": date_occurred.weekday(),
        "month": date_occurred.month,
        "desc_length": description_stats["desc_len"],
        "word_count": description_stats["word_count"],
        "unique_ratio": description_stats["unique_ratio"],
        "structured_detail_count": description_stats["structured_detail_count"],
        "number_count": description_stats["number_count"],
        "has_area_name": int(bool(area_name and area_name.strip())),
        "area_name_length": len((area_name or "").strip()),
        "has_time_of_day": int(bool(time_of_day and time_of_day.strip())),
        "has_media": int(has_media),
        "file_count": file_count,
        "gps_region": gps_region,
        "crime_type_encoded": _encode_with_map(crime_type_map, crime_type),
        "severity_encoded": _encode_with_map(severity_map, severity),
        "time_of_day_encoded": _encode_with_map(time_of_day_map, time_of_day),
    }


def _predict_ml_trust_score(features: Dict[str, Any]) -> Optional[float]:
    bundle = TRUST_MODEL_BUNDLE
    if not bundle:
        return None

    model = bundle.get("model")
    feature_columns = bundle.get("feature_columns", [])
    if not model or not feature_columns:
        return None

    try:
        ordered_values = [[features.get(column, 0) for column in feature_columns]]
        if hasattr(model, "predict_proba"):
            probability = float(model.predict_proba(ordered_values)[0][1])
            return round(probability * 100.0, 1)

        prediction = float(model.predict(ordered_values)[0])
        return round(max(0.0, min(100.0, prediction * 100.0)), 1)
    except Exception as exc:
        print(f"TRUST MODEL: Prediction failed: {exc}")
        return None


def calculate_submit_trust_score(
    *,
    db: Session,
    current_user: User,
    crime_type: str,
    severity: str,
    description: str,
    latitude: float,
    longitude: float,
    date_occurred: datetime,
    area_name: Optional[str] = None,
    time_of_day: Optional[str] = None,
    has_media: bool = False,
    file_count: int = 0,
) -> Dict[str, Any]:
    sections = []
    rule_score = 25.0

    description_result = _score_description(crime_type, severity, description)
    area_time_result = _score_area_and_time(area_name, time_of_day, date_occurred)
    location_result = _score_location(latitude, longitude)
    alignment_result = _score_crime_alignment(crime_type, description)
    history_result = _score_reporter_history(db, current_user)
    duplication_result = _score_duplicates_and_corroboration(
        db, current_user, crime_type, description, area_name, latitude, longitude, date_occurred
    )

    for title, result in (
        ("Content quality", description_result),
        ("Area and timing", area_time_result),
        ("GPS validation", location_result),
        ("Crime-type alignment", alignment_result),
        ("Reporter history", history_result),
        ("Duplicate and corroboration checks", duplication_result),
    ):
        rule_score += result["score"]
        sections.append((title, result["notes"]))

    if has_media:
        evidence_bonus = 3.0 + min(2.0, max(0, file_count - 1))
        rule_score += evidence_bonus
        sections.append(("Evidence attachment", [f"Media attached for verification (+{evidence_bonus:.0f})"]))

    rule_score = round(max(0.0, min(100.0, rule_score)), 1)

    ml_features = _build_ml_features(
        crime_type,
        severity,
        description_result,
        area_name,
        time_of_day,
        latitude,
        longitude,
        date_occurred,
        has_media,
        file_count,
        location_result["gps_region"],
    )
    ml_score = _predict_ml_trust_score(ml_features)

    final_score = rule_score
    blend_notes = []
    if ml_score is not None:
        final_score = round((rule_score * 0.7) + (ml_score * 0.3), 1)
        blend_notes.append(f"Rule-based trust score: {rule_score:.1f}/100")
        blend_notes.append(f"XGBoost trust signal: {ml_score:.1f}/100")
        blend_notes.append(f"Weighted submit-time score: {final_score:.1f}/100")
    else:
        blend_notes.append(f"Rule-based submit-time score: {rule_score:.1f}/100")
        blend_notes.append("No trained trust-model file found, so ML blending was skipped.")

    notes = ["--- Submit-time Trust Analysis ---"]
    for title, result_notes in sections:
        if not result_notes:
            continue
        notes.append(f"{title}:")
        for note in result_notes:
            notes.append(f"  - {note}")
    notes.append("")
    notes.extend(blend_notes)

    return {
        "trust_score": max(0.0, min(100.0, final_score)),
        "rule_score": rule_score,
        "ml_score": ml_score,
        "admin_notes": "\n".join(notes),
    }
