# ===================================================
# Stage 1: Build Frontend (Vite + React 19 + Tailwind)
# ===================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies manifest and install
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend with relative API path so it works seamlessly on any domain/port
ENV VITE_API_BASE_URL=""
RUN npm run build

# ===================================================
# Stage 2: Production Backend (FastAPI + RT-DETR Model)
# ===================================================
FROM python:3.11-slim AS production

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    GROQ_MODEL="openai/gpt-oss-120b" \
    MONGODB_DB_NAME="pothole_detection"

WORKDIR /app

# Install system dependencies required by OpenCV, SSL CA certificates, and curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Pre-install CPU-optimized PyTorch (drastically reduces image size from ~4GB to ~750MB)
COPY backend/requirements.txt /app/backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r /app/backend/requirements.txt

# Copy model weights
COPY model/ /app/model/

# Copy backend application
COPY backend/ /app/backend/

# Copy built frontend assets from Stage 1 into the container
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Ensure static upload directory exists
RUN mkdir -p /app/backend/static/uploads

WORKDIR /app/backend

EXPOSE 8000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Start the full-stack FastAPI application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
