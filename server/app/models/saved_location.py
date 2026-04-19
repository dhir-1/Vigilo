import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class SavedLocation(Base):
    __tablename__ = "saved_locations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id"), nullable=False)
    label = Column(String(50), nullable=False)  # "Home", "Office", etc.
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    address = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="saved_locations")

    def __repr__(self):
        return f"<SavedLocation {self.label} for user {self.user_id}>"
