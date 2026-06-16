from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
import os
import io
from supabase import create_client

# ── Supabase client ───────────────────────────────────────────────────────────
SUPABASE_URL         = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
BUCKET_NAME          = "degrees"

def _get_supabase():
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

def _ensure_bucket():
    """Create bucket if it doesn't exist."""
    try:
        sb = _get_supabase()
        buckets = sb.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        if BUCKET_NAME not in bucket_names:
            sb.storage.create_bucket(BUCKET_NAME, options={"public": True})
    except Exception as e:
        print(f"[Storage] Bucket check error: {e}")

def _upload_to_supabase(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload file bytes to Supabase Storage and return public URL."""
    try:
        sb = _get_supabase()
        path = f"{filename}"
        # Remove existing file if it exists
        try:
            sb.storage.from_(BUCKET_NAME).remove([path])
        except:
            pass
        sb.storage.from_(BUCKET_NAME).upload(
            path,
            file_bytes,
            {"content-type": content_type, "upsert": "true"}
        )
        url = sb.storage.from_(BUCKET_NAME).get_public_url(path)
        print(f"[Storage] Uploaded {filename} → {url}")
        return url
    except Exception as e:
        print(f"[Storage] Upload error: {e}")
        return None


def generate_degree(student_name, cgpa, qr_path=None, filename="degree.pdf"):
    """
    Generate degree PDF, save to /tmp AND upload to Supabase Storage.
    Returns (local_path, public_url) tuple.
    """
    # ── Local temp path ───────────────────────────────────────────────────────
    degrees_folder = os.getenv("DEGREES_FOLDER", "/tmp/degrees")
    os.makedirs(degrees_folder, exist_ok=True)
    save_path = os.path.join(degrees_folder, filename)

    width, height = A4

    # ── Draw to buffer first so we can upload ─────────────────────────────────
    buffer = io.BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    navy = HexColor("#1a2a52")
    gold = HexColor("#c9a227")
    gray = HexColor("#555555")

    # Outer border
    c.setStrokeColor(navy)
    c.setLineWidth(3)
    c.rect(15 * mm, 15 * mm, width - 30 * mm, height - 30 * mm)

    # Inner decorative border
    c.setStrokeColor(gold)
    c.setLineWidth(1)
    c.rect(20 * mm, 20 * mm, width - 40 * mm, height - 40 * mm)

    # Header
    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2, height - 40 * mm, "HIGHER EDUCATION COMMISSION")

    c.setFillColor(gray)
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 47 * mm, "Government of Pakistan")

    c.setStrokeColor(gold)
    c.setLineWidth(1.5)
    c.line(60 * mm, height - 52 * mm, width - 60 * mm, height - 52 * mm)

    # Certificate title
    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(width / 2, height - 70 * mm, "Degree Verification Certificate")

    c.setFillColor(gray)
    c.setFont("Helvetica-Oblique", 12)
    c.drawCentredString(width / 2, height - 80 * mm, "Issued under the Blockchain-Based Degree Attestation System")

    # Body text
    c.setFillColor(HexColor("#000000"))
    c.setFont("Helvetica", 13)

    body_y   = height - 105 * mm
    line_gap = 10 * mm

    c.drawCentredString(width / 2, body_y, "This is to certify that")

    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, body_y - line_gap, student_name.upper())

    c.setFont("Helvetica", 13)
    c.drawCentredString(width / 2, body_y - 2 * line_gap,
                        "has successfully completed the requirements of the degree programme")
    c.drawCentredString(width / 2, body_y - 3 * line_gap,
                        "and has been awarded the following academic standing:")

    # CGPA box
    box_y = body_y - 3 * line_gap - 18 * mm
    c.setStrokeColor(navy)
    c.setLineWidth(1)
    c.roundRect(width / 2 - 35 * mm, box_y, 70 * mm, 14 * mm, 3 * mm)

    c.setFont("Helvetica-Bold", 14)
    c.setFillColor(navy)
    c.drawCentredString(width / 2, box_y + 8.5 * mm, "Cumulative GPA")
    c.setFont("Helvetica-Bold", 20)
    c.drawCentredString(width / 2, box_y + 2.5 * mm, f"{cgpa}")

    # Status badge
    status_y = box_y - 18 * mm
    c.setFillColor(HexColor("#1f7a3d"))
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2, status_y, "STATUS: APPROVED \u2713")

    # Footer
    footer_y = 45 * mm

    c.setStrokeColor(gray)
    c.setLineWidth(0.5)
    c.line(25 * mm, footer_y + 30 * mm, width - 25 * mm, footer_y + 30 * mm)

    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(25 * mm, footer_y + 22 * mm, "Blockchain Verification")

    c.setFillColor(gray)
    c.setFont("Helvetica", 9)
    c.drawString(25 * mm, footer_y + 17 * mm, "This certificate is recorded on the")
    c.drawString(25 * mm, footer_y + 13 * mm, "Sepolia Ethereum public blockchain")
    c.drawString(25 * mm, footer_y + 9 * mm, "and can be verified for authenticity")
    c.drawString(25 * mm, footer_y + 5 * mm, "using the QR code provided.")

    # Signature line
    c.setStrokeColor(gray)
    c.setLineWidth(0.5)
    c.line(width - 70 * mm, footer_y + 30 * mm, width - 25 * mm, footer_y + 30 * mm)
    c.setFont("Helvetica", 9)
    c.setFillColor(navy)
    c.drawCentredString(width - 47.5 * mm, footer_y + 25 * mm, "Authorized Signatory")
    c.drawCentredString(width - 47.5 * mm, footer_y + 21 * mm, "Higher Education Commission")

    # QR code
    if qr_path and os.path.exists(qr_path):
        qr_size = 22 * mm
        qr_x    = width - 58 * mm
        qr_y    = footer_y - 4 * mm

        c.setStrokeColor(navy)
        c.setLineWidth(0.5)
        c.rect(qr_x - 2, qr_y - 2, qr_size + 4, qr_size + 4)
        c.drawImage(qr_path, qr_x, qr_y, width=qr_size, height=qr_size)

        c.setFillColor(gray)
        c.setFont("Helvetica-Oblique", 7)
        c.drawCentredString(qr_x + qr_size / 2, qr_y - 4 * mm, "Scan to verify")

    c.save()

    # ── Write to local file ───────────────────────────────────────────────────
    pdf_bytes = buffer.getvalue()
    with open(save_path, "wb") as f:
        f.write(pdf_bytes)

    # ── Upload to Supabase Storage ────────────────────────────────────────────
    _ensure_bucket()
    public_url = _upload_to_supabase(pdf_bytes, filename, "application/pdf")

    return save_path, public_url
