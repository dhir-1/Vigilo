import uuid
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class ReportConfirmation(Base):
    __tablename__ = "report_confirmations"
    __table_args__ = (
        UniqueConstraint("report_id", "user_id", name="uq_report_confirmation_report_user"),
    )

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    report_id = Column(String(36), ForeignKey("crime_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    report = relationship("CrimeReport", back_populates="confirmations")
    user = relationship("User", back_populates="report_confirmations")

    def __repr__(self):
        return f"<ReportConfirmation report={self.report_id} user={self.user_id}>"
