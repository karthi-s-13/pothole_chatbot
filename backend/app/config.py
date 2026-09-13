import json
from pathlib import Path
from typing import Union

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent  # backend/


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://pothole_app:pothole_app@localhost:5432/pothole_db"

    # Chat conversations live in MongoDB (document-shaped: one doc per detection_id, messages
    # embedded in an array); detections stay in Postgres.
    mongodb_uri: str = ""
    mongodb_db_name: str = "pothole_detection"

    cloudinary_cloud_name: str = ""
    cloudinary_api_key: str = ""
    cloudinary_api_secret: str = ""

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    # Small/fast model for query classification; falls back to groq_model when unset.
    groq_classifier_model: str = ""

    weights_path: Path = BASE_DIR.parent / "model" / "pothole_rtdetr_best.pt"
    weights_url: str = ""

    upload_dir: Path = BASE_DIR / "static" / "uploads"
    max_upload_mb: int = 10
    confidence_threshold: float = 0.66

    cors_origins: Union[list[str], str] = ["http://localhost:5173"]

    @field_validator("database_url", mode="before")
    @classmethod
    def assemble_database_url(cls, v: str) -> str:
        if isinstance(v, str) and v:
            # Normalize postgres:// and postgresql:// to postgresql+psycopg:// for SQLAlchemy
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    @field_validator("cors_origins", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str):
            v_trimmed = v.strip()
            if v_trimmed == "*":
                return ["*"]
            if v_trimmed.startswith("[") and v_trimmed.endswith("]"):
                try:
                    return json.loads(v_trimmed)
                except Exception:
                    pass
            return [item.strip() for item in v_trimmed.split(",") if item.strip()]
        if isinstance(v, list):
            return v
        return ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
