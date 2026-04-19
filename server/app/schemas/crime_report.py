from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.auth import UserResponse


class CrimeReportCreate(BaseModel):
    crime_type: str
    severity: str
    description: str
    latitude: float
    longitude: float
    area_name: Optional[str] = None
    date_occurred: datetime
    time_of_day: Optional[str] = None
    data_source: Optional[str] = "community_report"
    precision_level: Optional[str] = "exact"
    media_urls: Optional[List[str]] = []


class CrimeReportResponse(BaseModel):
    id: str
    report_id: str
    user_id: Optional[str] = None
    reporter_name: Optional[str] = None  # safe public name of the reporter
    user: Optional[UserResponse] = None # Full reporter info for admin
    crime_type: str
    severity: str
    description: str
    latitude: float
    longitude: float
    area_name: Optional[str] = None
    date_occurred: datetime
    time_of_day: Optional[str] = None
    data_source: Optional[str] = "community_report"
    precision_level: Optional[str] = "exact"
    status: str
    trust_score: Optional[float] = None
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    media_urls: Optional[List[str]] = []
    is_sos: bool
    community_confirmation_count: int = 0
    viewer_has_confirmed: bool = False
    community_trust_boost: float = 0.0
    created_at: datetime

    class Config:
        from_attributes = True
