import json
import os
import threading

DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
DATA_FILE = os.path.join(DATA_DIR, "degrees.json")

os.makedirs(DATA_DIR, exist_ok=True)

_lock = threading.Lock()


def _load() -> list:
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, "r") as f:
            return json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return []


def _save(records: list):
    with open(DATA_FILE, "w") as f:
        json.dump(records, f, indent=2)


def degree_exists(degree_hash: str) -> bool:
    """Check if a degree with this hash has already been issued."""
    records = _load()
    return any(r.get("degree_hash") == degree_hash for r in records)


def add_degree(record: dict):
    """
    Append a new degree record to degrees.json.
    record example:
    {
        "student_name": "...",
        "degree_hash": "...",
        "timestamp": 169...,
        "cnic_expiry_encrypted": "..."  (optional)
    }
    """
    with _lock:
        records = _load()
        records.append(record)
        _save(records)


def get_all_degrees() -> list:
    return _load()


def get_recent_degrees(limit: int = 10) -> list:
    records = _load()
    return list(reversed(records))[:limit]


def get_stats() -> dict:
    """Recompute stats from the persisted JSON file."""
    records = _load()
    total    = len(records)
    approved = sum(1 for r in records if r.get("status") == "APPROVED")
    rejected = sum(1 for r in records if r.get("status") == "REJECTED")
    fraud    = sum(1 for r in records if r.get("status") == "FRAUD")
    return {
        "total":    total,
        "approved": approved,
        "rejected": rejected,
        "fraud":    fraud,
    }
