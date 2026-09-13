"""Shared Groq client used by both the classifier and the responder stage."""

import groq

from .config import settings

_client: groq.Groq | None = None


class ChatbotError(RuntimeError):
    """Raised when the chatbot cannot produce a reply (missing config, API failure, etc.)."""


def get_client() -> groq.Groq:
    global _client
    if _client is None:
        if not settings.groq_api_key:
            raise ChatbotError("GROQ_API_KEY is not configured on the server.")
        _client = groq.Groq(api_key=settings.groq_api_key)
    return _client
