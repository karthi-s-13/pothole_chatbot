"""MongoDB connection for chat conversations.

One document per detection_id, with messages embedded as an array -- the natural MongoDB shape
for "all messages belonging to one conversation," and it makes both history listing (one doc per
session) and full-conversation reads (one query) cheap.
"""

import logging

from pymongo import MongoClient
from pymongo.collection import Collection
from pymongo.errors import PyMongoError

from .config import settings

logger = logging.getLogger(__name__)

_client: MongoClient | None = None


class MongoNotConfiguredError(RuntimeError):
    """Raised when MONGODB_URI is missing or the connection fails."""


def get_mongo_client() -> MongoClient:
    global _client
    if _client is None:
        if not settings.mongodb_uri:
            raise MongoNotConfiguredError("MONGODB_URI is not configured on the server.")
        try:
            client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=8000)
            client.admin.command("ping")
        except PyMongoError as e:
            raise MongoNotConfiguredError(f"Could not connect to MongoDB: {e}") from e
        _client = client
    return _client


def get_conversations_collection() -> Collection:
    db = get_mongo_client()[settings.mongodb_db_name]
    return db["conversations"]


def get_detections_collection() -> Collection:
    db = get_mongo_client()[settings.mongodb_db_name]
    return db["detections"]
