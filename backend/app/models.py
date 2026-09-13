import uuid
from datetime import datetime

from sqlalchemy import DateTime, Integer, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class Detection(Base):
    __tablename__ = "detections"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    original_filename: Mapped[str] = mapped_column(String(255))
    image_path: Mapped[str] = mapped_column(String(500))
    annotated_image_path: Mapped[str] = mapped_column(String(500))
    num_potholes: Mapped[int] = mapped_column(Integer, default=0)
    detections: Mapped[list] = mapped_column(JSON, default=list)  # [{class_name, confidence, bbox:[x1,y1,x2,y2], ...}]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Chat messages for this detection live in MongoDB (see conversations.py), not here.
