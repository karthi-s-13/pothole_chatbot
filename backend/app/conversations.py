"""Read/write helpers for the MongoDB conversations collection."""

from datetime import UTC, datetime

from .mongo_client import get_conversations_collection


def get_history(detection_id: str) -> list[dict]:
    """Return the message list for one conversation, oldest first. Empty if none yet."""
    doc = get_conversations_collection().find_one({"_id": detection_id}, {"messages": 1})
    return doc["messages"] if doc else []


def append_messages(detection_id: str, new_messages: list[dict]) -> list[dict]:
    """Append messages to a conversation (creating it if needed) and return the full history."""
    now = datetime.now(UTC)
    collection = get_conversations_collection()
    collection.update_one(
        {"_id": detection_id},
        {
            "$push": {"messages": {"$each": new_messages}},
            "$set": {"updated_at": now},
            "$setOnInsert": {"created_at": now, "detection_id": detection_id},
        },
        upsert=True,
    )
    return get_history(detection_id)


def delete_conversation(detection_id: str) -> None:
    get_conversations_collection().delete_one({"_id": detection_id})


def get_summaries(detection_ids: list[str]) -> dict[str, dict]:
    """Message count + last message per detection_id, for the history list view."""
    if not detection_ids:
        return {}
    docs = get_conversations_collection().find(
        {"_id": {"$in": detection_ids}}, {"messages": 1, "updated_at": 1}
    )
    summaries: dict[str, dict] = {}
    for doc in docs:
        messages = doc.get("messages", [])
        summaries[doc["_id"]] = {
            "message_count": len(messages),
            "last_message": messages[-1]["content"] if messages else None,
            "updated_at": doc.get("updated_at"),
        }
    return summaries
