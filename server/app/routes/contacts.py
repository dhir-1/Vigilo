"""
Emergency Contacts CRUD endpoints for user profile management.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional, List

from app.database import get_db
from app.models.user import User
from app.models.emergency_contact import EmergencyContact
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])


# ── Schemas ──────────────────────────────────────────────

class ContactCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = None
    is_primary: bool = False


class ContactResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: Optional[str] = None
    is_primary: bool

    class Config:
        from_attributes = True


# ── Routes ───────────────────────────────────────────────

@router.get("/emergency-contacts", response_model=List[ContactResponse])
def list_contacts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all emergency contacts for the logged-in user."""
    return db.query(EmergencyContact).filter(
        EmergencyContact.user_id == current_user.id
    ).all()


@router.post("/emergency-contacts", response_model=ContactResponse, status_code=status.HTTP_201_CREATED)
def add_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new emergency contact."""
    # Limit to 5 contacts per user
    count = db.query(EmergencyContact).filter(
        EmergencyContact.user_id == current_user.id
    ).count()
    if count >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 emergency contacts allowed")

    contact = EmergencyContact(
        user_id=current_user.id,
        name=data.name,
        phone=data.phone,
        email=data.email,
        is_primary=data.is_primary
    )
    db.add(contact)
    db.commit()
    db.refresh(contact)
    return contact


@router.delete("/emergency-contacts/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_contact(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an emergency contact by ID."""
    contact = db.query(EmergencyContact).filter(
        EmergencyContact.id == contact_id,
        EmergencyContact.user_id == current_user.id
    ).first()

    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    db.delete(contact)
    db.commit()
