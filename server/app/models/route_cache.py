import uuid
from datetime import datetime

from sqlalchemy import Column, String, Float, DateTime, JSON
from app.database import Base


class RouteCache(Base):
    __tablename__ = "route_cache"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    start_lat = Column(Float, nullable=False)
    start_lng = Column(Float, nullable=False)
    end_lat = Column(Float, nullable=False)
    end_lng = Column(Float, nullable=False)
    route_data = Column(JSON, nullable=False)  # Contains safest, fastest, balanced route data
    calculated_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)  # 24-hour cache validity

    def __repr__(self):
        return f"<RouteCache ({self.start_lat},{self.start_lng}) -> ({self.end_lat},{self.end_lng})>"
