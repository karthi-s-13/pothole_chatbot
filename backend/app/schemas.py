from datetime import datetime

from pydantic import BaseModel, ConfigDict


class BoxOut(BaseModel):
    class_name: str
    confidence: float
    bbox: list[float]  # [x1, y1, x2, y2] in pixel coordinates
    position: str  # e.g. "top-left", "center", "bottom-right" -- from bbox center vs image thirds
    relative_area_pct: float  # bbox area as a percentage of the full image area
    confidence_label: str  # "high" | "moderate"
    size_rank: str  # "largest" | "smallest" | "medium" | "only" (relative to other boxes in this image)


class DetectionOut(BaseModel):
    id: str
    original_filename: str
    annotated_image_url: str
    num_potholes: int
    detections: list[BoxOut]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    detection_id: str
    message: str


class ChatMessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ChatResponse(BaseModel):
    reply: str
    history: list[ChatMessageOut]


class HistoryItemOut(BaseModel):
    id: str
    original_filename: str
    annotated_image_url: str
    num_potholes: int
    created_at: datetime
    message_count: int
    last_message: str | None = None
    last_activity_at: datetime
