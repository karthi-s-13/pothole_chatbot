# Pothole Detection & AI Assistant

An intelligent full-stack system featuring an RT-DETR pothole detector served via a FastAPI backend, paired with an interactive React chat UI where users can upload road imagery, inspect detected potholes with confidence scoring, and discuss road safety insights with a Groq-powered AI assistant.

---

## 🌐 Live Deployments

- **Frontend (Vercel)**: [https://pothole-chatbot.vercel.app/](https://pothole-chatbot.vercel.app/)
- **Backend (Render)**: [https://pothole-chatbot.onrender.com/](https://pothole-chatbot.onrender.com/)
- **API Health Check**: [https://pothole-chatbot.onrender.com/api/health](https://pothole-chatbot.onrender.com/api/health)
- **Interactive OpenAPI Documentation**: [https://pothole-chatbot.onrender.com/docs](https://pothole-chatbot.onrender.com/docs)

---

## 📁 Repository Structure

```
├── Dockerfile              # Root Dockerfile for Render / Cloud deployments (build context: .)
├── docker-compose.yml      # Multi-container orchestration (MongoDB + Backend + Frontend)
├── render.yaml             # Render Blueprint specification
├── DEPLOYMENT.md           # Production deployment instructions
├── model/                  # Kaggle-trained RT-DETR model weights (pothole_rtdetr_best.pt)
├── backend/                # FastAPI + Ultralytics RT-DETR + MongoDB + Groq LLM
│   ├── Dockerfile          # Backend Dockerfile
│   ├── requirements.txt    # Python dependencies (CPU-optimized PyTorch)
│   └── app/                # Application routes, models, and inference logic
└── frontend/               # React 19 + TypeScript + Vite + Tailwind CSS
    ├── Dockerfile          # Multi-stage Dockerfile (Node builder + Nginx production)
    ├── .env                # Local development environment configuration
    ├── .env.production     # Production environment configuration (Render URL)
    └── src/                # UI components, state management, and API client
```

---

## 🚀 Running Locally with Docker

You can launch the entire stack (MongoDB, FastAPI backend, and Nginx frontend) with Docker Compose:

```powershell
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **Swagger Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

---

## 🛠️ Manual Local Development

### 1. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install --upgrade pip
pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```

The frontend will run at `http://localhost:5173` and automatically proxy requests to the configured backend.
