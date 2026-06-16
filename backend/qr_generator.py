import qrcode
import os
import io
from supabase import create_client

# ── Supabase client ───────────────────────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET_NAME          = "qrcodes"

def _get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def _ensure_bucket():
    try:
        sb = _get_supabase()
        buckets = sb.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if BUCKET_NAME not in bucket_names:
            sb.storage.create_bucket(BUCKET_NAME, options={"public": True})
    except Exception as e:
        print(f"[Storage] Bucket check error: {e}")

def _upload_to_supabase(file_bytes: bytes, filename: str) -> str:
    try:
        sb = _get_supabase()
        try:
            sb.storage.from_(BUCKET_NAME).remove([filename])
        except:
            pass
        sb.storage.from_(BUCKET_NAME).upload(
            filename,
            file_bytes,
            {"content-type": "image/png", "upsert": "true"}
        )
        url = sb.storage.from_(BUCKET_NAME).get_public_url(filename)
        print(f"[Storage] Uploaded QR {filename} → {url}")
        return url
    except Exception as e:
        print(f"[Storage] QR upload error: {e}")
        return None


def generate_qr(hash_value):
    """
    Generate QR code pointing to the production verify URL.
    Saves locally AND uploads to Supabase Storage.
    Returns (local_path, public_url) tuple.
    """
    qr_folder = os.getenv("QR_FOLDER", "/tmp/qr_codes")
    os.makedirs(qr_folder, exist_ok=True)

    # ── Use production frontend URL for QR ───────────────────────────────────
    frontend_url = os.getenv("FRONTEND_URL", "http://127.0.0.1:5173")
    # Remove trailing slash
    frontend_url = frontend_url.rstrip("/")
    verification_url = f"{frontend_url}/verify/{hash_value}"

    print(f"[QR] Generating QR for: {verification_url}")

    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(verification_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")

    # ── Save locally ──────────────────────────────────────────────────────────
    filename  = "degree_qr.png"
    local_path = os.path.join(qr_folder, filename)
    img.save(local_path)

    # ── Upload to Supabase Storage ────────────────────────────────────────────
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_bytes = buffer.getvalue()

    _ensure_bucket()
    public_url = _upload_to_supabase(qr_bytes, filename)

    return local_path, public_url
