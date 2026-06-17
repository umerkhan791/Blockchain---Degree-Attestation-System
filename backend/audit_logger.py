"""
audit_logger.py — Writes audit events to a local file AND Supabase.

Local file is fast and works locally. Supabase ensures events persist
across Render redeploys (Render's /tmp is ephemeral).
"""

import logging
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# ── Local file logging ────────────────────────────────────────────────────────
LOG_DIR  = os.path.join(os.path.dirname(__file__), "logs")
LOG_FILE = os.path.join(LOG_DIR, "audit.log")
os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("audit")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler   = logging.FileHandler(LOG_FILE)
    formatter = logging.Formatter("%(asctime)s | %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


# ── Supabase persistence ──────────────────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
_sb_client = None


def _get_supabase():
    global _sb_client
    if _sb_client is None and SUPABASE_URL and SUPABASE_SERVICE_KEY:
        from supabase import create_client
        _sb_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
    return _sb_client


def log_event(event_type: str, details: str = ""):
    """
    Write an audit log entry to:
      1. Local file (for backward compatibility)
      2. Supabase audit_events table (persists across redeploys)

    event_type examples: DEGREE_ISSUED, DEGREE_VERIFIED,
                          FRAUD_ATTEMPT, UNAUTHORIZED_ACCESS
    """
    # 1. Local file
    logger.info(f"{event_type} | {details}")

    # 2. Supabase
    try:
        sb = _get_supabase()
        if sb:
            sb.table("audit_events").insert({
                "event_type": event_type,
                "details":    details,
                "created_at": datetime.utcnow().isoformat(),
            }).execute()
    except Exception as e:
        print(f"[Audit] Supabase log failed: {e}")


def get_audit_events(limit: int = 500) -> list:
    """Fetch all audit events from Supabase (newest first)."""
    try:
        sb = _get_supabase()
        if not sb:
            return []
        res = sb.table("audit_events").select("*").order("created_at", desc=True).limit(limit).execute()
        return res.data or []
    except Exception as e:
        print(f"[Audit] Fetch error: {e}")
        return []


def get_audit_counts() -> dict:
    """Return counts of each event type from Supabase."""
    counts = {
        "DEGREE_ISSUED":            0,
        "DEGREE_REJECTED":          0,
        "DEGREE_VERIFIED":          0,
        "FRAUD_ATTEMPT":            0,
        "DUPLICATE_DEGREE_BLOCKED": 0,
        "DEGREE_REVOKED":           0,
        "UNAUTHORIZED_ACCESS":      0,
    }
    try:
        events = get_audit_events(limit=5000)
        for e in events:
            ev = e.get("event_type")
            if ev in counts:
                counts[ev] += 1
    except Exception as e:
        print(f"[Audit] Count error: {e}")
    return counts
