# Pothole Detection App

RT-DETR pothole detector behind a FastAPI backend, with a React chat UI where you upload a road
image, see the detected potholes, and ask a chatbot questions about the result.

```
model/      Kaggle-trained RT-DETR weights + training notebook
backend/    FastAPI + SQLAlchemy + Postgres + Groq-powered chatbot
frontend/   React + TypeScript + Tailwind (Vite)
```

## 1. Database (Postgres, already installed locally)

Create a dedicated app role + database (only needs the Postgres superuser password once):

```powershell
$env:PG_SUPERUSER_PASSWORD = "<your postgres superuser password>"
cd backend
python scripts/init_db.py
```

This creates role `pothole_app` / database `pothole_db`. Copy the `DATABASE_URL` it prints into
`backend/.env`.

## 2. Backend

```powershell
cd backend
python -m venv .venv        # optional but recommended
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then fill in DATABASE_URL and GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

- Get a free `GROQ_API_KEY` at https://console.groq.com/keys.
- The model weights path defaults to `../model/pothole_rtdetr_best.pt` (already in place).
- Tables are created automatically on startup (`Base.metadata.create_all`) — no migration step needed for this local setup.
- API docs: http://localhost:8000/docs

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. `frontend/.env` already points at `http://localhost:8000`.

## How it works

1. **Upload** a road image → `POST /api/detect` runs RT-DETR, saves the original + annotated image
   under `backend/static/uploads/`, stores the result in the `detections` table, and returns the
   annotated image URL + list of detected boxes.
2. **Chat** → `POST /api/chat` loads that detection's data plus prior chat history from Postgres,
   sends it to Groq as a system prompt, and stores both the user message and the reply in
   `chat_messages`. The system prompt instructs the model to reply with exactly
   *"This is not relevant information."* for anything unrelated to the detection or road safety.

## Error handling notes

- Upload: rejects non-image files, empty files, and anything over 10MB (both client- and
  server-side).
- Inference: missing/corrupt model weights return `503`; unreadable images return `400`.
- Chat: empty/over-length messages return `400`; missing `detection_id` returns `404`; Groq
  failures (bad key, rate limit, timeout, network) return `502` with a readable message instead of
  crashing.
- Frontend surfaces every backend error message inline instead of failing silently.

## Not done yet (by design, per your instructions)

- No Docker — everything above runs directly with local Python/Node/Postgres.
- No auth/multi-user support — this is a single-user local app for now.
