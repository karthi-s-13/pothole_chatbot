"""Optional Cloudinary storage for annotated detection images.

Inert until all three of CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET are
set -- until then, detect.py keeps serving annotated images from local disk exactly as before, so
this integration can ship disabled and switch on the moment credentials are added, with no other
code changes.
"""

import logging
from pathlib import Path

from .config import settings

logger = logging.getLogger(__name__)

_configured = False


def is_enabled() -> bool:
    return bool(
        settings.cloudinary_url
        or (settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret)
    )


def _ensure_configured() -> None:
    global _configured
    if _configured:
        return
    import os
    import cloudinary

    if settings.cloudinary_cloud_name and settings.cloudinary_api_key and settings.cloudinary_api_secret:
        cloudinary.config(
            cloud_name=settings.cloudinary_cloud_name,
            api_key=settings.cloudinary_api_key,
            api_secret=settings.cloudinary_api_secret,
            secure=True,
        )
    elif settings.cloudinary_url:
        os.environ["CLOUDINARY_URL"] = settings.cloudinary_url
        cloudinary.reset_config()

    _configured = True


def upload_annotated_image(local_path: Path, public_id: str) -> str | None:
    """Upload one annotated image to Cloudinary and return its secure URL, or None on failure
    (caller should fall back to serving the local file instead of failing the whole request)."""
    if not is_enabled():
        return None

    import cloudinary.uploader
    import cloudinary.exceptions

    try:
        _ensure_configured()
        result = cloudinary.uploader.upload(
            str(local_path),
            public_id=public_id,
            folder="pothole-detection",
            overwrite=True,
            timeout=15,
        )
        return result["secure_url"]
    except Exception as e:
        logger.warning("Cloudinary upload failed or timed out (%s). Falling back to local storage.", e)
        return None
