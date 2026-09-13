"""MongoDB connection for chat conversations.

One document per detection_id, with messages embedded as an array -- the natural MongoDB shape
for "all messages belonging to one conversation," and it makes both history listing (one doc per
session) and full-conversation reads (one query) cheap.
"""

import logging

import certifi
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

        client_kwargs: dict = {
            "serverSelectionTimeoutMS": 10000,
            "connectTimeoutMS": 10000,
            "socketTimeoutMS": 15000,
        }

        # Use certifi CA certificates for MongoDB Atlas TLS connections
        is_atlas = "mongodb+srv://" in settings.mongodb_uri or "ssl=true" in settings.mongodb_uri.lower() or "tls=true" in settings.mongodb_uri.lower()
        if is_atlas:
            try:
                client_kwargs["tlsCAFile"] = certifi.where()
            except Exception as cert_err:
                logger.warning("Could not load certifi CA file: %s", cert_err)

        try:
            client = MongoClient(settings.mongodb_uri, **client_kwargs)
            client.admin.command("ping")
        except PyMongoError as e:
            logger.warning("Initial MongoDB connection attempt failed: %s. Trying TLS fallback...", e)
            try:
                fallback_kwargs = dict(client_kwargs)
                fallback_kwargs["tlsAllowInvalidCertificates"] = True
                client = MongoClient(settings.mongodb_uri, **fallback_kwargs)
                client.admin.command("ping")
                logger.info("Connected to MongoDB via TLS fallback.")
            except PyMongoError as fallback_err:
                err_str = str(fallback_err)
                hint = ""
                if "SSL" in err_str or "TLS" in err_str or "alert" in err_str.lower():
                    hint = (
                        " (Hint: If using MongoDB Atlas, make sure your IP is whitelisted under "
                        "Network Access in MongoDB Atlas. For cloud deployments like Render, add 0.0.0.0/0)"
                    )
                raise MongoNotConfiguredError(f"Could not connect to MongoDB: {fallback_err}{hint}") from fallback_err

        _client = client
    return _client


def get_conversations_collection() -> Collection:
    db = get_mongo_client()[settings.mongodb_db_name]
    return db["conversations"]


def get_detections_collection() -> Collection:
    db = get_mongo_client()[settings.mongodb_db_name]
    return db["detections"]
