from cryptography.fernet import Fernet
import os

# ─────────────────────────────────────────────────────────────────
# Encryption key — generated once and stored in key.key
# In production, keep this file OUT of version control.
# ─────────────────────────────────────────────────────────────────
KEY_FILE = os.path.join(os.path.dirname(__file__), "key.key")

if not os.path.exists(KEY_FILE):
    with open(KEY_FILE, "wb") as f:
        f.write(Fernet.generate_key())

with open(KEY_FILE, "rb") as f:
    _key = f.read()

_fernet = Fernet(_key)


def encrypt_field(value: str) -> str:
    """Encrypt a string value. Returns base64 token string. Handles None."""
    if value is None:
        return None
    return _fernet.encrypt(str(value).encode()).decode()


def decrypt_field(token: str) -> str:
    """Decrypt a token back to the original string. Handles None."""
    if token is None:
        return None
    try:
        return _fernet.decrypt(token.encode()).decode()
    except Exception:
        return None
