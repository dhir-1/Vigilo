import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    status = Column(String(20), nullable=False, default="active")  # active, resolved, false_alarm
    contacts_notified = Column(JSON, nullable=True, default=list)  # List of contact IDs notified
    media_urls = Column(JSON, nullable=True, default=list)  # Emergency recordings
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="sos_alerts")

    def __repr__(self):
        return f"<SOSAlert by user {self.user_id} at {self.created_at}>"
