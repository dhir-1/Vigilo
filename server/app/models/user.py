import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Boolean, DateTime, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    profile_photo_url = Column(String(500), nullable=True)
    banner_url = Column(String(500), nullable=True)
    role = Column(String(10), nullable=False, default="user")  # "user" or "admin"
    is_active = Column(Boolean, default=True)
    
    # Preferences / Settings
    privacy_location = Column(Boolean, default=True)
    privacy_profile = Column(Boolean, default=False)
    notif_alerts = Column(Boolean, default=True)
    notif_reports = Column(Boolean, default=True)
    notif_sos = Column(Boolean, default=True)
    notif_email = Column(Boolean, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    crime_reports = relationship("CrimeReport", back_populates="user", foreign_keys="CrimeReport.user_id")
    emergency_contacts = relationship("EmergencyContact", back_populates="user")
    saved_locations = relationship("SavedLocation", back_populates="user")
    sos_alerts = relationship("SOSAlert", back_populates="user")
    report_confirmations = relationship("ReportConfirmation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User {self.email}>"
