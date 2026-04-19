import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Column, String, Float, Text, DateTime, Integer, Boolean, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base


class CrimeReport(Base):
    __tablename__ = "crime_reports"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(10), unique=True, nullable=False, index=True)  # e.g. "CR12345"
    user_id = Column(String(36), ForeignKey("users.id"), nullable=True)  # nullable for seed data

    # Crime details
    crime_type = Column(String(50), nullable=False)  # Theft, Assault, Robbery, Vandalism, Burglary, Other
    severity = Column(String(10), nullable=False)     # Low, Medium, High
    description = Column(Text, nullable=False)

    # Location
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    area_name = Column(String(200), nullable=True)

    # Timing
    date_occurred = Column(DateTime, nullable=False)
    time_of_day = Column(String(20), nullable=True)  # Morning, Afternoon, Evening, Night

    # Status & verification
    status = Column(String(20), nullable=False, default="pending")  # pending, verified, rejected, info_requested, resolved
    trust_score = Column(Float, nullable=True)  # 0-100
    admin_notes = Column(Text, nullable=True)
    rejection_reason = Column(String(100), nullable=True)

    # Media
    media_urls = Column(JSON, nullable=True, default=list)  # List of Cloudinary URLs

    # Architecture
    data_source = Column(String(50), nullable=True, default="community_report") # official_centroid, community_report
    precision_level = Column(String(50), nullable=True, default="exact") # exact, ward_centroid

    # Flags
    is_sos = Column(Boolean, default=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    verified_by = Column(String(36), ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    resolved_by = Column(String(36), ForeignKey("users.id"), nullable=True)

    # Relationships
    user = relationship("User", back_populates="crime_reports", foreign_keys=[user_id])
    confirmations = relationship("ReportConfirmation", back_populates="report", cascade="all, delete-orphan")

    @property
    def reporter_name(self) -> Optional[str]:
        """Safely return the reporter's name for public display."""
        try:
            if self.user:
                return self.user.full_name
        except Exception:
            pass
        return None

    def __repr__(self):
        return f"<CrimeReport {self.report_id} - {self.crime_type}>"
