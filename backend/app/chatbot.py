"""Chatbot orchestration: classify the query, then answer it with a category-focused prompt.

See query_classifier.py for the classification stage and prompts.py for the per-category system
prompts. Splitting these into a classify-then-respond pipeline (rather than one prompt trying to
cover every question type) keeps each stage's instructions short and single-purpose, which models
follow more reliably -- especially prompts.QueryCategory.UNCERTAIN, where making something up
(a depth, a cost, a safety verdict) would be actively harmful.
"""

import logging

import groq

from .groq_client import ChatbotError, get_client
from .models import Detection
from .prompts import REFUSAL_MESSAGE, build_category_prompt, build_general_prompt
from .query_classifier import QueryCategory, classify_query
from .config import settings

logger = logging.getLogger(__name__)

__all__ = ["ChatbotError", "ask_chatbot"]


def _call_model(system_prompt: str, history: list[dict], user_message: str) -> str:
    client = get_client()

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    messages.append({"role": "user", "content": user_message})

    try:
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            temperature=0.3,
            max_tokens=500,
        )
    except groq.APIError as e:
        logger.exception("Groq API call failed")
        raise ChatbotError(f"Chatbot service error: {e}") from e
    except Exception as e:  # network errors, timeouts, unexpected SDK issues
        logger.exception("Unexpected error calling Groq")
        raise ChatbotError(f"Chatbot service is unavailable: {e}") from e

    reply = completion.choices[0].message.content
    if not reply or not reply.strip():
        raise ChatbotError("Chatbot returned an empty response.")

    return reply.strip()


def ask_chatbot(detection: Detection, history: list[dict], user_message: str) -> str:
    category = classify_query(user_message)
    logger.info("Query classified as %s: %r", category.value, user_message[:100])

    # Short-circuit: no need to spend a second model call just to have it repeat a fixed string
    # back to us, and this guarantees the refusal text is always exact.
    if category == QueryCategory.IRRELEVANT:
        return REFUSAL_MESSAGE

    system_prompt = (
        build_general_prompt(detection)
        if category == QueryCategory.GENERAL
        else build_category_prompt(detection, category)
    )
    return _call_model(system_prompt, history, user_message)
