from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.saved_location import SavedLocation
from app.models.user import User
from app.utils.auth import get_current_user

router = APIRouter(prefix="/api/profile", tags=["profile"])

ALLOWED_LABELS = ("Home", "Work", "College", "Hostel")


class SavedLocationCreate(BaseModel):
    label: str
    latitude: float
    longitude: float
    address: Optional[str] = None


class SavedLocationResponse(BaseModel):
    id: str
    label: str
    latitude: float
    longitude: float
    address: Optional[str] = None

    class Config:
        from_attributes = True


def _normalize_label(label: str) -> str:
    normalized = (label or "").strip().title()
    if normalized not in ALLOWED_LABELS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Saved place label must be one of: {', '.join(ALLOWED_LABELS)}",
        )
    return normalized


@router.get("/saved-locations", response_model=List[SavedLocationResponse])
def list_saved_locations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = {label: index for index, label in enumerate(ALLOWED_LABELS)}
    locations = db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).all()
    return sorted(locations, key=lambda item: order.get(item.label, 999))


@router.post("/saved-locations", response_model=SavedLocationResponse, status_code=status.HTTP_201_CREATED)
def upsert_saved_location(
    data: SavedLocationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    label = _normalize_label(data.label)
    existing = db.query(SavedLocation).filter(
        SavedLocation.user_id == current_user.id,
        SavedLocation.label == label,
    ).first()

    if existing:
        existing.latitude = data.latitude
        existing.longitude = data.longitude
        existing.address = data.address
        db.commit()
        db.refresh(existing)
        return existing

    current_count = db.query(SavedLocation).filter(SavedLocation.user_id == current_user.id).count()
    if current_count >= len(ALLOWED_LABELS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You can save up to 4 places: Home, Work, College, Hostel",
        )

    saved_location = SavedLocation(
        user_id=current_user.id,
        label=label,
        latitude=data.latitude,
        longitude=data.longitude,
        address=data.address,
    )
    db.add(saved_location)
    db.commit()
    db.refresh(saved_location)
    return saved_location


@router.delete("/saved-locations/{location_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_saved_location(
    location_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    location = db.query(SavedLocation).filter(
        SavedLocation.id == location_id,
        SavedLocation.user_id == current_user.id,
    ).first()

    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Saved place not found")

    db.delete(location)
    db.commit()
