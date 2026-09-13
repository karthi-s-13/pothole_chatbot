from pathlib import Path

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

    upload_dir: Path = BASE_DIR / "static" / "uploads"
    max_upload_mb: int = 10
    confidence_threshold: float = 0.66

    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
