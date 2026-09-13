import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from .. import models, schemas
from ..cloud_storage import upload_annotated_image
from ..config import settings
from ..database import get_db
from ..inference import ModelNotLoadedError, run_inference

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["detection"])

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/jpg", "image/webp"}


@router.post("/detect", response_model=schemas.DetectionOut)
async def detect_pothole(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Upload a JPEG, PNG, or WEBP image.",
        )

    contents = await file.read()
    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    max_bytes = settings.max_upload_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=400, detail=f"File too large. Max size is {settings.max_upload_mb}MB."
        )

    detection_id = str(uuid.uuid4())
    ext = Path(file.filename or "upload.jpg").suffix or ".jpg"
    original_path = settings.upload_dir / f"{detection_id}_original{ext}"
    annotated_path = settings.upload_dir / f"{detection_id}_annotated.jpg"

    try:
        original_path.write_bytes(contents)
    except OSError as e:
        logger.exception("Failed to save uploaded file")
        raise HTTPException(status_code=500, detail=f"Could not save uploaded file: {e}")

    try:
        boxes = run_inference(original_path, annotated_path)
    except ModelNotLoadedError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception("Inference failed")
        raise HTTPException(status_code=500, detail=f"Inference failed: {e}")

    # If Cloudinary is configured, the annotated image is served from there instead of local
    # disk; the local file (written above, needed for the model/cv2 to produce it) is kept either
    # way as a fallback -- upload_annotated_image() returns None if Cloudinary isn't configured
    # or the upload fails, in which case we just keep serving the local path as before.
    cloud_url = upload_annotated_image(annotated_path, public_id=f"{detection_id}_annotated")

    record = models.Detection(
        id=detection_id,
        original_filename=file.filename or "upload.jpg",
        image_path=str(original_path),
        annotated_image_path=cloud_url or str(annotated_path),
        num_potholes=len(boxes),
        detections=boxes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)

    return _to_detection_out(record)


@router.get("/detections/{detection_id}", response_model=schemas.DetectionOut)
def get_detection(detection_id: str, db: Session = Depends(get_db)):
    record = db.get(models.Detection, detection_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Detection not found.")
    return _to_detection_out(record)


def _to_detection_out(record: models.Detection) -> schemas.DetectionOut:
    return schemas.DetectionOut(
        id=record.id,
        original_filename=record.original_filename,
        annotated_image_url=resolve_annotated_image_url(record.annotated_image_path),
        num_potholes=record.num_potholes,
        detections=[schemas.BoxOut(**d) for d in record.detections],
        created_at=record.created_at,
    )


def resolve_annotated_image_url(annotated_image_path: str) -> str:
    """annotated_image_path holds either a Cloudinary URL or a local disk path, depending on
    whether Cloudinary was configured when that detection was created."""
    if annotated_image_path.startswith("http://") or annotated_image_path.startswith("https://"):
        return annotated_image_path
    return f"/static/uploads/{Path(annotated_image_path).name}"
