import logging
import os

LOG_DIR  = os.path.join(os.path.dirname(__file__), "..", "logs")
LOG_FILE = os.path.join(LOG_DIR, "audit.log")

os.makedirs(LOG_DIR, exist_ok=True)

logger = logging.getLogger("audit")
logger.setLevel(logging.INFO)

if not logger.handlers:
    handler = logging.FileHandler(LOG_FILE)
    formatter = logging.Formatter("%(asctime)s | %(message)s")
    handler.setFormatter(formatter)
    logger.addHandler(handler)


def log_event(event_type: str, details: str = ""):
    """
    Write an audit log entry.
    event_type examples: DEGREE_ISSUED, DEGREE_VERIFIED,
                          FRAUD_ATTEMPT, UNAUTHORIZED_ACCESS
    """
    logger.info(f"{event_type} | {details}")
