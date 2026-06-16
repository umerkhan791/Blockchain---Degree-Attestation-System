"""
migrate_json_to_supabase.py — One-time migration script.

Reads data/degrees.json and inserts every record into Supabase.
Run once from your local machine before switching to Supabase:

    python migrate_json_to_supabase.py

Requirements: SUPABASE_URL and SUPABASE_SERVICE_KEY in .env
"""

import json
import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
JSON_PATH            = os.path.join(os.path.dirname(__file__), "data", "degrees.json")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    raise SystemExit("ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.")

if not os.path.exists(JSON_PATH):
    raise SystemExit(f"ERROR: {JSON_PATH} not found. Nothing to migrate.")

sb = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

with open(JSON_PATH) as f:
    records = json.load(f)

print(f"Found {len(records)} records in degrees.json. Migrating...")

migrated = 0
skipped  = 0

for r in records:
    degree_hash = r.get("degree_hash")

    # Skip records without a hash (e.g. rejected with no PDF)
    if not degree_hash:
        # Still insert rejected records — just without hash
        pass

    # Check for duplicate
    existing = sb.table("degrees").select("degree_id").eq("degree_hash", degree_hash).execute()
    if existing.data:
        print(f"  SKIP (already exists): {degree_hash}")
        skipped += 1
        continue

    # Map old fields to new schema
    created_ts = r.get("timestamp")
    created_at = (
        datetime.utcfromtimestamp(created_ts).isoformat()
        if isinstance(created_ts, (int, float))
        else datetime.utcnow().isoformat()
    )

    row = {
        "student_name":          r.get("student_name"),
        "cgpa":                  r.get("cgpa"),
        "percentage":            r.get("percentage"),
        "cnic_expiry":           r.get("cnic_expiry"),
        "cnic_expiry_encrypted": r.get("cnic_expiry_encrypted"),
        "degree_hash":           degree_hash,
        "tx_hash":               r.get("blockchain_tx") or r.get("tx_hash"),
        "sepolia_tx":            r.get("sepolia_tx"),
        "status":                r.get("status", "APPROVED"),
        "created_at":            created_at,
    }

    sb.table("degrees").insert(row).execute()
    print(f"  MIGRATED: {r.get('student_name')} — {degree_hash}")
    migrated += 1

print(f"\nDone. {migrated} migrated, {skipped} skipped.")
