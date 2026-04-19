from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    banner_url: Optional[str] = None
    role: str
    is_active: bool
    
    # Preferences / Settings
    privacy_location: bool = True
    privacy_profile: bool = False
    notif_alerts: bool = True
    notif_reports: bool = True
    notif_sos: bool = True
    notif_email: bool = False

    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
