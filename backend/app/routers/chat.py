import logging
from datetime import UTC, datetime

from fastapi import APIRouter, HTTPException

from .. import conversations, models, schemas
from ..chatbot import ChatbotError, ask_chatbot
from ..mongo_client import MongoNotConfiguredError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["chat"])


@router.post("/chat", response_model=schemas.ChatResponse)
def chat(payload: schemas.ChatRequest):
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message is too long (max 2000 characters).")

    detection = models.get_detection_by_id(payload.detection_id)
    if detection is None:
        raise HTTPException(status_code=404, detail="Detection not found. Upload an image first.")

    try:
        history = conversations.get_history(payload.detection_id)
    except MongoNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))

    history_for_model = [{"role": m["role"], "content": m["content"]} for m in history]

    try:
        reply = ask_chatbot(detection, history_for_model, message)
    except ChatbotError as e:
        logger.warning("Chatbot error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))

    now = datetime.now(UTC)
    updated_history = conversations.append_messages(
        payload.detection_id,
        [
            {"role": "user", "content": message, "created_at": now},
            {"role": "assistant", "content": reply, "created_at": datetime.now(UTC)},
        ],
    )

    return schemas.ChatResponse(
        reply=reply,
        history=[schemas.ChatMessageOut.model_validate(m) for m in updated_history],
    )


@router.get("/chat/{detection_id}", response_model=list[schemas.ChatMessageOut])
def get_chat_history(detection_id: str):
    detection = models.get_detection_by_id(detection_id)
    if detection is None:
        raise HTTPException(status_code=404, detail="Detection not found.")
    try:
        history = conversations.get_history(detection_id)
    except MongoNotConfiguredError as e:
        raise HTTPException(status_code=503, detail=str(e))
    return [schemas.ChatMessageOut.model_validate(m) for m in history]
