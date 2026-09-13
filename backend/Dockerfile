# ===================================================
# Production Backend (FastAPI + RT-DETR-L Model + MongoDB)
# Built with context: . (repo root)
# ===================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    GROQ_MODEL="openai/gpt-oss-120b" \
    MONGODB_DB_NAME="pothole_detection"

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

COPY model/pothole_rtdetr_best.pt /app/model/pothole_rtdetr_best.pt
COPY backend/ /app/backend/

RUN mkdir -p /app/backend/static/uploads /tmp/Ultralytics

WORKDIR /app/backend

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=25s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
