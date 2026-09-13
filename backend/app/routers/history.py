from pathlib import Path

from fastapi import APIRouter, HTTPException

from .. import conversations, models, schemas
from ..mongo_client import MongoNotConfiguredError
from .detect import resolve_annotated_image_url

router = APIRouter(prefix="/api", tags=["history"])


@router.get("/history", response_model=list[schemas.HistoryItemOut])
def get_history(limit: int = 50):
    limit = max(1, min(limit, 200))

    records = models.get_recent_detections(limit)

    try:
        summaries = conversations.get_summaries([r.id for r in records])
    except MongoNotConfiguredError:
        summaries = {}

    items = []
    for r in records:
        summary = summaries.get(r.id, {})
        items.append(
            schemas.HistoryItemOut(
                id=r.id,
                original_filename=r.original_filename,
                annotated_image_url=resolve_annotated_image_url(r.annotated_image_path),
                num_potholes=r.num_potholes,
                created_at=r.created_at,
                message_count=summary.get("message_count", 0),
                last_message=summary.get("last_message"),
                last_activity_at=summary.get("updated_at") or r.created_at,
            )
        )

    items.sort(key=lambda i: i.last_activity_at, reverse=True)
    return items


@router.delete("/history/{detection_id}", status_code=204)
def delete_history_item(detection_id: str):
    record = models.get_detection_by_id(detection_id)
    if record is None:
        raise HTTPException(status_code=404, detail="Detection not found.")

    # annotated_image_path may hold a Cloudinary URL instead of a local path (see detect.py) --
    # only unlink local files; a Cloudinary-hosted image is simply left in place.
    Path(record.image_path).unlink(missing_ok=True)
    if not record.annotated_image_path.startswith("http"):
        Path(record.annotated_image_path).unlink(missing_ok=True)

    models.delete_detection(detection_id)

    try:
        conversations.delete_conversation(detection_id)
    except MongoNotConfiguredError:
        pass
