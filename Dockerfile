# ===================================================
# Production Backend (FastAPI + RT-DETR Model + MongoDB)
# Optimized for Render and Cloud Deployments
# ===================================================
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    GROQ_MODEL="openai/gpt-oss-120b" \
    MONGODB_DB_NAME="pothole_detection"

WORKDIR /app

# Install system dependencies required by OpenCV, SSL CA certificates, and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pre-install CPU-optimized PyTorch and Python dependencies
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy model weights
COPY model/ /app/model/

# Copy backend application source
COPY backend/ /app/backend/

# Ensure static upload directory exists
RUN mkdir -p /app/backend/static/uploads

WORKDIR /app/backend

EXPOSE 8000

# Healthcheck probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

# Start FastAPI backend with dynamic port binding for Render/Cloud hosts
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
