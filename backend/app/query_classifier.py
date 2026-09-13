"""Classifier agent: sorts an incoming chat message into a query category before the responder
stage picks a focused, category-specific system prompt (see prompts.py).

This is a real (LLM-based) classification call, not keyword matching, so it generalizes to
rephrasings the fixed example lists didn't anticipate. It's deliberately a separate, cheap call
with a tiny prompt and near-zero temperature: classification needs to be fast and consistent, not
creative.
"""

import logging
from enum import Enum

import groq

from .config import settings
from .groq_client import get_client

logger = logging.getLogger(__name__)


class QueryCategory(str, Enum):
    PRESENCE = "presence"  # "is there a pothole", "are any potholes visible"
    COUNT = "count"  # "how many potholes"
    LOCATION = "location"  # "where is the pothole", "left or right"
    SIZE = "size"  # "which is the largest", "how big"
    CONFIDENCE = "confidence"  # "how confident are you", "is this reliable"
    SUMMARY = "summary"  # "summarize this", "tell me about it", "more than one?"
    UNCERTAIN = "uncertain"  # depth, danger, repair cost, structural safety -- unanswerable from the image
    IRRELEVANT = "irrelevant"  # not about this detection or about potholes/road safety at all
    GENERAL = "general"  # classification failed/unclear -- fall back to the broad prompt


CLASSIFIER_SYSTEM_PROMPT = """Classify the user's message about a pothole-detection result into \
exactly ONE category. Reply with ONLY the category word in lowercase, nothing else -- no \
punctuation, no explanation.

Categories:
- presence: asking whether a pothole exists or is visible in the image
- count: asking how many potholes there are
- location: asking where a pothole is (left/right/top/bottom/position/region)
- size: asking about a pothole's size, or comparing sizes (largest/smallest/biggest)
- confidence: asking about detection confidence, reliability, or certainty
- summary: asking for a general summary/overview, "tell me about it", or "is there more than one"
- uncertain: asking about pothole depth, danger/safety severity, repair cost, or structural \
integrity -- things a 2D image and bounding box cannot show
- irrelevant: not about this pothole detection or about potholes/road safety at all (small talk, \
coding help, unrelated trivia, other topics)

Reply with exactly one of: presence, count, location, size, confidence, summary, uncertain, irrelevant"""


def classify_query(message: str) -> QueryCategory:
    """Classify a user message. Falls back to QueryCategory.GENERAL on any failure, so a
    classification hiccup degrades to the broad catch-all prompt instead of blocking the chat."""
    try:
        client = get_client()
        model = settings.groq_classifier_model or settings.groq_model
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": CLASSIFIER_SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            temperature=0,
            max_tokens=10,
        )
        raw = (completion.choices[0].message.content or "").strip().lower()
    except groq.APIError:
        logger.exception("Query classification call failed")
        return QueryCategory.GENERAL
    except Exception:
        logger.exception("Unexpected error during query classification")
        return QueryCategory.GENERAL

    for category in QueryCategory:
        if category.value in raw:
            return category

    logger.warning("Unrecognized classifier output %r, falling back to GENERAL", raw)
    return QueryCategory.GENERAL
