from pydantic import BaseModel
from typing import Optional


class ReportVerificationRequest(BaseModel):
    action: str  # "approve", "reject", "request_info"
    admin_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    escalate_to_police: Optional[bool] = False
