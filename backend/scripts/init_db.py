"""
One-time setup: creates a dedicated Postgres role + database for this app using the
Postgres superuser credentials, so the app itself never needs superuser access.

Usage (PowerShell):
    $env:PG_SUPERUSER_PASSWORD = "your-postgres-password"
    python backend/scripts/init_db.py

Optional env vars: PG_SUPERUSER (default "postgres"), PG_HOST (default "localhost"),
PG_PORT (default "5432"), PG_APP_PASSWORD (default "pothole_app").
"""

import os
import sys

import psycopg
from psycopg import sql

SUPERUSER = os.environ.get("PG_SUPERUSER", "postgres")
SUPERUSER_PASSWORD = os.environ.get("PG_SUPERUSER_PASSWORD")
HOST = os.environ.get("PG_HOST", "localhost")
PORT = os.environ.get("PG_PORT", "5432")

APP_DB = "pothole_db"
APP_USER = "pothole_app"
APP_PASSWORD = os.environ.get("PG_APP_PASSWORD", "pothole_app")

if not SUPERUSER_PASSWORD:
    print("Set PG_SUPERUSER_PASSWORD before running this script.", file=sys.stderr)
    sys.exit(1)

try:
    conn = psycopg.connect(
        host=HOST,
        port=PORT,
        user=SUPERUSER,
        password=SUPERUSER_PASSWORD,
        dbname="postgres",
        autocommit=True,
        connect_timeout=10,
    )
except psycopg.OperationalError as e:
    print(f"Could not connect to Postgres as {SUPERUSER}@{HOST}:{PORT}: {e}", file=sys.stderr)
    sys.exit(1)

with conn:
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (APP_USER,))
        if cur.fetchone() is None:
            # CREATE ROLE is DDL -- Postgres doesn't accept bind parameters here, so the password
            # must be embedded as a safely-quoted literal via sql.Literal instead of a %s param.
            cur.execute(
                sql.SQL("CREATE ROLE {} LOGIN PASSWORD {}").format(
                    sql.Identifier(APP_USER), sql.Literal(APP_PASSWORD)
                )
            )
            print(f"Created role '{APP_USER}'.")
        else:
            print(f"Role '{APP_USER}' already exists, leaving it as-is.")

        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (APP_DB,))
        if cur.fetchone() is None:
            cur.execute(
                sql.SQL("CREATE DATABASE {} OWNER {}").format(
                    sql.Identifier(APP_DB), sql.Identifier(APP_USER)
                )
            )
            print(f"Created database '{APP_DB}' owned by '{APP_USER}'.")
        else:
            print(f"Database '{APP_DB}' already exists, leaving it as-is.")

conn.close()

database_url = f"postgresql+psycopg://{APP_USER}:{APP_PASSWORD}@{HOST}:{PORT}/{APP_DB}"
print("\nDone. Put this in backend/.env:")
print(f"DATABASE_URL={database_url}")
