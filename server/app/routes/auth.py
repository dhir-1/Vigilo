from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import Response
import json
from sqlalchemy.orm import Session
from datetime import timedelta
from pydantic import BaseModel
from typing import Optional
import uuid

from app.database import get_db
from app.models.user import User
from app.models.crime_report import CrimeReport
from app.models.emergency_contact import EmergencyContact
from app.models.saved_location import SavedLocation
from app.models.sos_alert import SOSAlert
from app.schemas.auth import UserCreate, UserResponse, Token, LoginRequest
from app.utils.auth import hash_password, verify_password, create_access_token, get_current_user
from app.services.cloudinary_service import upload_image

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Create new user
    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        full_name=user_data.full_name,
        phone=user_data.phone,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email).first()
    if not user or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate token
    access_token = create_access_token(data={"sub": user.id})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user)):
    return current_user


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo_url: Optional[str] = None
    banner_url: Optional[str] = None
    
    # Preferences / Settings
    privacy_location: Optional[bool] = None
    privacy_profile: Optional[bool] = None
    notif_alerts: Optional[bool] = None
    notif_reports: Optional[bool] = None
    notif_sos: Optional[bool] = None
    notif_email: Optional[bool] = None


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class DeleteAccountRequest(BaseModel):
    current_password: str


class ResetPasswordRequest(BaseModel):
    email: str
    phone: str
    new_password: str


@router.put("/profile", response_model=UserResponse)
def update_profile(
    updates: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user's profile fields."""
    if updates.full_name is not None:
        current_user.full_name = updates.full_name
    if updates.phone is not None:
        current_user.phone = updates.phone
    if updates.profile_photo_url is not None:
        current_user.profile_photo_url = updates.profile_photo_url
    if updates.banner_url is not None:
        current_user.banner_url = updates.banner_url

    # Settings
    if updates.privacy_location is not None:
        current_user.privacy_location = updates.privacy_location
    if updates.privacy_profile is not None:
        current_user.privacy_profile = updates.privacy_profile
    if updates.notif_alerts is not None:
        current_user.notif_alerts = updates.notif_alerts
    if updates.notif_reports is not None:
        current_user.notif_reports = updates.notif_reports
    if updates.notif_sos is not None:
        current_user.notif_sos = updates.notif_sos
    if updates.notif_email is not None:
        current_user.notif_email = updates.notif_email

    db.commit()
    db.refresh(current_user)
    return current_user


@router.post("/change-password")
def change_password(
    data: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change the current user's password after verifying the existing password."""
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from the current password")

    if len(data.new_password) < 8 or not any(ch.isdigit() for ch in data.new_password):
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters and include a number")

    current_user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    """
    Prototype self-service password reset.
    Uses registered email + phone verification because email delivery is not configured yet.
    """
    user = (
        db.query(User)
        .filter(User.email == data.email, User.phone == data.phone, User.is_active.is_(True))
        .first()
    )

    if not user:
        raise HTTPException(status_code=400, detail="No active account matches that email and phone number")

    if len(data.new_password) < 8 or not any(ch.isdigit() for ch in data.new_password):
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters and include a number")

    if verify_password(data.new_password, user.password_hash):
        raise HTTPException(status_code=400, detail="New password must be different from the current password")

    user.password_hash = hash_password(data.new_password)
    db.commit()

    return {"message": "Password reset successfully. You can sign in with your new password."}


@router.delete("/account")
def delete_account(
    data: DeleteAccountRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove personal data and deactivate the account.
    Verified community reports are anonymized instead of deleted so the map can retain safety data.
    """
    if not verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    db.query(CrimeReport).filter(CrimeReport.user_id == current_user.id).update(
        {CrimeReport.user_id: None},
        synchronize_session=False,
    )
    db.query(EmergencyContact).filter(EmergencyContact.user_id == current_user.id).delete(synchronize_session=False)
    db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).delete(synchronize_session=False)
    db.query(SOSAlert).filter(SOSAlert.user_id == current_user.id).delete(synchronize_session=False)

    current_user.email = f"deleted+{current_user.id}@vigilo.local"
    current_user.full_name = "Deleted User"
    current_user.phone = None
    current_user.profile_photo_url = None
    current_user.banner_url = None
    current_user.password_hash = hash_password(str(uuid.uuid4()))
    current_user.is_active = False
    current_user.privacy_location = True
    current_user.privacy_profile = True
    current_user.notif_alerts = False
    current_user.notif_reports = False
    current_user.notif_sos = False
    current_user.notif_email = False

    db.commit()

    return {"message": "Account deleted successfully"}


@router.post("/profile/upload", response_model=UserResponse)
async def upload_profile_image(
    type: str = Form(...),  # "photo" or "banner"
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile picture or banner image using Cloudinary."""
    if type not in ["photo", "banner"]:
        raise HTTPException(status_code=400, detail="Invalid image type.")

    file_bytes = await file.read()
    url = await upload_image(file_bytes, folder=f"vigilo/users/{current_user.id}")
    
    if not url:
        raise HTTPException(status_code=500, detail="Image upload failed.")

    if type == "photo":
        current_user.profile_photo_url = url
    else:
        current_user.banner_url = url

    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/export")
def export_user_data(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Export all user data as a JSON file."""
    
    # Compile the data
    data = {
        "profile": {
            "id": current_user.id,
            "email": current_user.email,
            "full_name": current_user.full_name,
            "phone": current_user.phone,
            "role": current_user.role,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "crime_reports": [
            {
                "report_id": r.report_id or r.id,
                "crime_type": r.crime_type,
                "severity": r.severity,
                "description": r.description,
                "location": {"lat": r.latitude, "lng": r.longitude},
                "area_name": r.area_name,
                "date_occurred": r.date_occurred.isoformat() if r.date_occurred else None,
                "status": r.status,
                "trust_score": float(r.trust_score) if r.trust_score is not None else 0.0,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            } for r in current_user.crime_reports
        ],
        "emergency_contacts": [
            {
                "name": c.name,
                "phone": c.phone,
                "relation": c.relation,
            } for c in current_user.emergency_contacts
        ],
        "sos_alerts": [
            {
                "latitude": a.latitude,
                "longitude": a.longitude,
                "status": a.status,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
            } for a in current_user.sos_alerts
        ],
        "saved_locations": [
            {
                "label": loc.label,
                "latitude": loc.latitude,
                "longitude": loc.longitude,
                "address": loc.address,
                "created_at": loc.created_at.isoformat() if loc.created_at else None,
            } for loc in current_user.saved_locations
        ]
    }

    # Dump to JSON bytes
    json_bytes = json.dumps(data, indent=2).encode('utf-8')

    return Response(
        content=json_bytes,
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="vigilo_data_export.json"'
        }
    )
