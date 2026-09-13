# Deployment Guide

This guide walks you through deploying the **Pothole Detection & Chatbot** application to production.

---

## Architecture Overview

- **Frontend**: Vite + React 19 + Tailwind CSS (Static SPA) → Recommended: **Vercel** or **Netlify**
- **Backend**: FastAPI + PyTorch / Ultralytics RT-DETR model → Recommended: **Render** (via Docker) or **Railway**
- **Database**:
  - **MongoDB** (e.g. MongoDB Atlas free tier): Stores both detection metadata and chat conversations
- **Storage / Cloud (Optional)**:
  - **Cloudinary**: For cloud storage of uploaded and annotated images (falls back to local filesystem if unset)
  - **Groq**: LLM inference (Llama 3.3) for the interactive assistant

---

## 1. Backend Deployment (Render)

### Option A: Using the `render.yaml` Blueprint (Automated)

1. Push your code to GitHub.
2. Log in to [Render Dashboard](https://dashboard.render.com/).
3. Click **Blueprints** → **New Blueprint Instance**.
4. Select your `pothole_chatbot` repository.
5. Render will detect `render.yaml` and automatically configure the Web Service (`pothole-detection-backend`).
6. Fill in the required environment variables:
   - `GROQ_API_KEY`: Your Groq API key
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - (Optional) `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
7. Click **Apply**.

---

### Option B: Manual Web Service Setup on Render

1. On Render, click **New +** → **Web Service**.
2. Connect your `karthi-s-13/pothole_chatbot` GitHub repository.
3. Configure the service:
   - **Name**: `pothole-detection-backend`
   - **Region**: Select your preferred region (e.g., Oregon or Frankfurt)
   - **Language**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Plan**: Standard or Starter (PyTorch RT-DETR model requires ~512MB–1GB RAM during inference)
4. Under **Environment Variables**, add:
   ```env
   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?appName=Cluster0
   MONGODB_DB_NAME=pothole_detection
   GROQ_API_KEY=gsk_...
   GROQ_MODEL=openai/gpt-oss-120b
   CORS_ORIGINS=["https://your-frontend.vercel.app","http://localhost:5173"]
   ```
   *(Optional Cloudinary keys if using Cloudinary for images)*
   ```env
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   ```
5. **CRITICAL MongoDB Atlas Configuration**:
   In **MongoDB Atlas** → **Security** → **Network Access** → **IP Access List**:
   - Click **Add IP Address**.
   - Choose **Allow Access from Anywhere** (`0.0.0.0/0`).
   - If not set to `0.0.0.0/0`, MongoDB Atlas firewall will drop Render's dynamic IP addresses with `[SSL: TLSV1_ALERT_INTERNAL_ERROR]`.
6. Click **Create Web Service**.
6. Once deployed, copy your backend service URL (e.g. `https://pothole-detection-backend.onrender.com`).

---

## 2. Frontend Deployment (Vercel)

1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import your `karthi-s-13/pothole_chatbot` repository.
4. Under **Root Directory**, click **Edit** and select `frontend`.
5. Framework preset will automatically detect **Vite**.
6. Under **Environment Variables**, add:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: Your Render backend URL (e.g., `https://pothole-detection-backend.onrender.com`)
7. Click **Deploy**.
8. Once finished, copy the production frontend URL (e.g., `https://pothole-detection.vercel.app`).
9. Update `CORS_ORIGINS` in your backend environment variables on Render to include your Vercel URL!

---

## 3. Local Production Run with Docker Compose

You can test the entire backend and database stack locally with Docker:

```bash
# 1. Provide your environment variables in backend/.env or export them
docker compose up --build
```

- Backend will be live at `http://localhost:8000`
- API documentation: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/api/health`

---

## 4. Health Checks and Verification

- **Backend Health Check**: `GET /api/health` returns `{"status": "ok"}`
- **Interactive OpenAPI Documentation**: `GET /docs`
