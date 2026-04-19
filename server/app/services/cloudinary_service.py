import cloudinary
import cloudinary.uploader
from app.config import get_settings

settings = get_settings()

cloudinary.config(
    cloud_name=settings.cloudinary_cloud_name,
    api_key=settings.cloudinary_api_key,
    api_secret=settings.cloudinary_api_secret,
    secure=True
)

async def upload_image(file_bytes: bytes, folder: str = "vigilo/reports") -> str:
    """
    Upload an image to Cloudinary and return the secure URL.
    """
    if not settings.cloudinary_api_key:
        # Fallback if no keys (shouldn't happen now but good for safety)
        return "placeholder_url"

    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="image"
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary upload error: {e}")
        return None

async def upload_video(file_bytes: bytes, folder: str = "vigilo/videos") -> str:
    """
    Upload a video to Cloudinary and return the secure URL.
    """
    try:
        result = cloudinary.uploader.upload(
            file_bytes,
            folder=folder,
            resource_type="video"
        )
        return result.get("secure_url")
    except Exception as e:
        print(f"Cloudinary video upload error: {e}")
        return None
