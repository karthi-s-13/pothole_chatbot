from datetime import UTC, datetime
from typing import Any
import uuid
from pydantic import BaseModel, Field

from .mongo_client import get_detections_collection


class Detection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_filename: str
    image_path: str
    annotated_image_path: str
    num_potholes: int = 0
    detections: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def from_mongo(cls, doc: dict) -> "Detection":
        doc_copy = dict(doc)
        if "_id" in doc_copy:
            doc_copy["id"] = str(doc_copy.pop("_id"))
        return cls(**doc_copy)

    def to_mongo(self) -> dict:
        data = self.model_dump()
        data["_id"] = data.pop("id")
        return data


def save_detection(detection: Detection) -> Detection:
    collection = get_detections_collection()
    collection.insert_one(detection.to_mongo())
    return detection


def get_detection_by_id(detection_id: str) -> Detection | None:
    collection = get_detections_collection()
    doc = collection.find_one({"_id": detection_id})
    return Detection.from_mongo(doc) if doc else None


def get_recent_detections(limit: int = 50) -> list[Detection]:
    collection = get_detections_collection()
    cursor = collection.find().sort("created_at", -1).limit(limit)
    return [Detection.from_mongo(doc) for doc in cursor]


def delete_detection(detection_id: str) -> bool:
    collection = get_detections_collection()
    res = collection.delete_one({"_id": detection_id})
    return res.deleted_count > 0
