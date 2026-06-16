"""
supabase_store.py — Supabase PostgreSQL persistence layer.

Replaces the old degree_store.py (JSON file).
Uses the supabase-py client library.

Required env vars:
    SUPABASE_URL
    SUPABASE_SERVICE_KEY   (use the service role key, not anon)
"""

import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

_client: Client | None = None


def _get_client() -> Client:
    global _client
    if _client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
            )
        _client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _client


# ── Public API ────────────────────────────────────────────────────────────────

def degree_exists(degree_hash: str) -> bool:
    """Return True if a degree with this hash already exists in Supabase."""
    sb = _get_client()
    res = (
        sb.table("degrees")
        .select("degree_id")
        .eq("degree_hash", degree_hash)
        .limit(1)
        .execute()
    )
    return len(res.data) > 0


def add_degree(record: dict):
    """
    Insert a new degree record.

    Expected keys (all optional except degree_hash):
        student_name, cgpa, percentage, cnic_expiry,
        degree_hash, tx_hash, sepolia_tx, status,
        cnic_expiry_encrypted
    """
    sb = _get_client()
    row = {
        "student_name":          record.get("student_name"),
        "cgpa":                  record.get("cgpa"),
        "percentage":            record.get("percentage"),
        "cnic_expiry":           record.get("cnic_expiry"),
        "degree_hash":           record.get("degree_hash"),
        "tx_hash":               record.get("tx_hash") or record.get("blockchain_tx"),
        "sepolia_tx":            record.get("sepolia_tx"),
        "status":                record.get("status", "PENDING"),
        "cnic_expiry_encrypted": record.get("cnic_expiry_encrypted"),
        "created_at":            datetime.utcnow().isoformat(),
    }
    sb.table("degrees").insert(row).execute()


def get_all_degrees() -> list:
    sb = _get_client()
    res = sb.table("degrees").select("*").order("created_at", desc=True).execute()
    return res.data or []


def get_recent_degrees(limit: int = 10) -> list:
    sb = _get_client()
    res = (
        sb.table("degrees")
        .select("*")
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )
    return res.data or []


def get_stats() -> dict:
    """Compute stats directly from Supabase."""
    sb = _get_client()
    all_rows = sb.table("degrees").select("status").execute().data or []
    total    = len(all_rows)
    approved = sum(1 for r in all_rows if r.get("status") == "APPROVED")
    rejected = sum(1 for r in all_rows if r.get("status") == "REJECTED")
    fraud    = sum(1 for r in all_rows if r.get("status") == "FRAUD")
    return {
        "total":    total,
        "approved": approved,
        "rejected": rejected,
        "fraud":    fraud,
    }


def mark_revoked(degree_hash: str):
    """Mark a degree as REVOKED in Supabase."""
    sb = _get_client()
    sb.table("degrees").update({"status": "REVOKED"}).eq("degree_hash", degree_hash).execute()
