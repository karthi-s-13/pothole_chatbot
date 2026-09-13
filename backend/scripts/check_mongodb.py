"""Check MongoDB Atlas connection and inspect the dataset.

Usage:
    python backend/scripts/check_mongodb.py
    python backend/scripts/check_mongodb.py --test-write
"""

import argparse
import json
import sys
import time
from datetime import UTC, datetime

# Ensure backend root is in sys.path when executed directly
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
from app.mongo_client import get_conversations_collection, get_detections_collection, get_mongo_client


try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass


def main():
    parser = argparse.ArgumentParser(description="Inspect MongoDB Atlas Dataset")
    parser.add_argument("--test-write", action="store_true", help="Insert and clean up a test document to verify write permissions")
    args = parser.parse_args()

    print("=" * 60)
    print(" MongoDB Atlas Diagnostic & Dataset Inspector")
    print("=" * 60)

    if not settings.mongodb_uri:
        print("❌ Error: MONGODB_URI is not set in backend/.env")
        sys.exit(1)

    masked_uri = settings.mongodb_uri
    if "@" in masked_uri:
        prefix = masked_uri.split("@")[0]
        host = masked_uri.split("@")[1]
        user = prefix.split("://")[-1].split(":")[0]
        masked_uri = f"mongodb+srv://{user}:****@{host}"

    print(f"🔗 Target URI: {masked_uri}")
    print(f"📁 Target Database: {settings.mongodb_db_name}")

    start_time = time.perf_counter()
    try:
        client = get_mongo_client()
        ping_res = client.admin.command("ping")
        latency = (time.perf_counter() - start_time) * 1000
        print(f"✅ Connection successful! Ping latency: {latency:.1f}ms")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)

    db = client[settings.mongodb_db_name]
    collections = db.list_collection_names()
    print(f"\n📂 Existing Collections in '{settings.mongodb_db_name}': {collections}")

    det_col = get_detections_collection()
    conv_col = get_conversations_collection()

    det_count = det_col.count_documents({})
    conv_count = conv_col.count_documents({})

    print("\n📊 Dataset Overview:")
    print(f"   • Detections collection:    {det_count} documents")
    print(f"   • Conversations collection: {conv_count} documents")

    # Inspect Detections
    print("\n🔍 Detections Summary:")
    if det_count == 0:
        print("   (Collection is currently empty. Upload an image via the app to create records.)")
    else:
        recent_detections = list(det_col.find().sort("created_at", -1).limit(5))
        for idx, doc in enumerate(recent_detections, 1):
            doc_id = doc.get("_id", doc.get("id"))
            potholes = doc.get("num_potholes", 0)
            created = doc.get("created_at")
            filename = doc.get("original_filename", "N/A")
            print(f"   [{idx}] ID: {doc_id} | File: {filename} | Potholes: {potholes} | Date: {created}")

    # Inspect Conversations
    print("\n💬 Conversations Summary:")
    if conv_count == 0:
        print("   (Collection is currently empty. Chat about a detection to start a thread.)")
    else:
        recent_convs = list(conv_col.find().sort("updated_at", -1).limit(5))
        for idx, doc in enumerate(recent_convs, 1):
            doc_id = doc.get("_id")
            messages = doc.get("messages", [])
            print(f"   [{idx}] Detection ID: {doc_id} | Total Messages: {len(messages)}")

    # Test Write if requested
    if args.test_write:
        print("\n🧪 Performing Write Test...")
        test_id = f"test_{int(time.time())}"
        test_doc = {
            "_id": test_id,
            "test": True,
            "created_at": datetime.now(UTC),
            "message": "Write test from check_mongodb.py",
        }
        try:
            det_col.insert_one(test_doc)
            print(f"   ✅ Successfully inserted test document: {test_id}")
            det_col.delete_one({"_id": test_id})
            print(f"   ✅ Successfully deleted test document: {test_id}")
            print("   ✨ Read/Write permissions are 100% verified.")
        except Exception as write_err:
            print(f"   ❌ Write test failed: {write_err}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()
