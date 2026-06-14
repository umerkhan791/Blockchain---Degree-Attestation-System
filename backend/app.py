from flask import Flask, request, jsonify, send_file
import os
import time
from blockchain import store_degree, contract, web3, revoke_degree
from sepolia import store_degree_public, get_sepolia_etherscan_url

from flask_cors import CORS

from gemini_ocr import extract_all

from validation import (
    validate_cgpa,
    validate_percentage,
    validate_cnic_expiry,
    is_eligible
)

from pdf_generator  import generate_degree
from hash_generator import generate_hash
from blockchain     import store_degree, contract, web3
from qr_generator   import generate_qr

# ── New imports for added features ───────────────────────────────
from audit_logger import log_event
from crypto_utils import encrypt_field, decrypt_field
import degree_store

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})  # allow ALL routes, ALL origins

UPLOAD_FOLDER = "../uploads"
DEGREES_FOLDER = "../degrees"
QR_FOLDER      = "../qr_codes"

os.makedirs(UPLOAD_FOLDER,  exist_ok=True)
os.makedirs(DEGREES_FOLDER, exist_ok=True)
os.makedirs(QR_FOLDER,      exist_ok=True)

# ── In-memory counters — rehydrated from degrees.json on startup ──
_stats = {
    "total":         0,
    "approved":      0,
    "rejected":      0,
    "fraud":         0,
    "verifications": 0,   # CCP: number of verification requests
}

# Recent degrees pulled from blockchain events / upload calls
_recent_degrees = []   # list of dicts: { student_name, degree_hash, timestamp, revoked }


def _rehydrate_stats():
    """
    Rebuild _stats and _recent_degrees from degrees.json on startup
    so counters survive Flask restarts.
    Also reads audit.log to restore fraud + verification counts.
    """
    import json

    # ── Restore approved/rejected/total from degrees.json ─────────
    degrees_path = os.path.join(os.path.dirname(__file__), "data", "degrees.json")
    if os.path.exists(degrees_path):
        try:
            with open(degrees_path, "r") as f:
                records = json.load(f)
            for r in records:
                _stats["total"] += 1
                if r.get("status") == "APPROVED":
                    _stats["approved"] += 1
                    if len(_recent_degrees) < 20:
                        _recent_degrees.append({
                            "student_name": r.get("student_name"),
                            "degree_hash":  r.get("degree_hash"),
                            "timestamp":    r.get("timestamp"),
                            "revoked":      r.get("revoked", False),
                        })
                elif r.get("status") == "REJECTED":
                    _stats["rejected"] += 1
        except Exception as e:
            print(f"[Rehydrate] degrees.json error: {e}")

    # ── Restore fraud + verification counts from audit.log ────────
    log_path = os.path.join(os.path.dirname(__file__), "logs", "audit.log")
    if os.path.exists(log_path):
        try:
            with open(log_path, "r") as f:
                for line in f:
                    parts = line.strip().split(" | ", 2)
                    if len(parts) == 3:
                        event = parts[1]
                        if event == "FRAUD_ATTEMPT":
                            _stats["fraud"] += 1
                        elif event == "DEGREE_VERIFIED":
                            _stats["verifications"] += 1
        except Exception as e:
            print(f"[Rehydrate] audit.log error: {e}")

    print(f"[Startup] Stats rehydrated: {_stats}")


_rehydrate_stats()


@app.route("/")
def home():
    return "DegreeChain — Blockchain Degree Verification System Running"


@app.route("/upload", methods=["POST"])
def upload_files():

    required_files = ["cnic_front", "cnic_back", "marksheet", "transcript"]

    for file_name in required_files:
        if file_name not in request.files:
            return jsonify({"error": f"{file_name} missing"}), 400

    # ── Save uploaded files ───────────────────────────────────────
    cnic_front_path = os.path.join(UPLOAD_FOLDER, "cnic_front.jpg")
    cnic_back_path  = os.path.join(UPLOAD_FOLDER, "cnic_back.jpg")
    marksheet_path  = os.path.join(UPLOAD_FOLDER, "marksheet.jpg")
    transcript_path = os.path.join(UPLOAD_FOLDER, "transcript.jpg")

    request.files["cnic_front"].save(cnic_front_path)
    request.files["cnic_back"].save(cnic_back_path)
    request.files["marksheet"].save(marksheet_path)
    request.files["transcript"].save(transcript_path)

    # ── Gemini Vision extraction ──────────────────────────────────
    extracted = extract_all(
        transcript_path=transcript_path,
        marksheet_path=marksheet_path,
        cnic_front_path=cnic_front_path,
        cnic_back_path=cnic_back_path
    )

    student_name = extracted["student_name"] or "Unknown Student"
    cgpa         = extracted["cgpa"]
    percentage   = extracted["percentage"]
    expiry_date  = extracted["cnic_expiry"]

    # ── Validation ────────────────────────────────────────────────
    cgpa_valid       = validate_cgpa(cgpa)
    percentage_valid = validate_percentage(percentage)
    cnic_valid       = validate_cnic_expiry(expiry_date)
    eligible         = is_eligible(cgpa, percentage, cnic_valid)

    _stats["total"] += 1

    if not eligible:
        _stats["rejected"] += 1

        # ── Audit log: rejected application ─────────────────────
        log_event(
            "DEGREE_REJECTED",
            f"student={student_name} cgpa={cgpa} percentage={percentage} "
            f"cnic_valid={cnic_valid}"
        )

        # ── Persist rejected record too (for full audit trail) ──
        degree_store.add_degree({
            "student_name":  student_name,
            "degree_hash":   None,
            "timestamp":     int(time.time()),
            "status":        "REJECTED",
            "cnic_expiry_encrypted": encrypt_field(expiry_date),
        })

        return jsonify({
            "status":           "REJECTED",
            "student_name":     student_name,
            "cgpa":             cgpa,
            "percentage":       percentage,
            "cnic_expiry":      expiry_date,
            "cgpa_valid":       cgpa_valid,
            "percentage_valid": percentage_valid,
            "cnic_valid":       cnic_valid
        })

    # ── Generate degree PDF ───────────────────────────────────────
    pdf_path = generate_degree(student_name, cgpa)

    # ── Hash the PDF ──────────────────────────────────────────────
    degree_hash = generate_hash(pdf_path)

    # ── Generate QR code ─────────────────────────────────────────
    qr_path = generate_qr(degree_hash)

    # ── Regenerate PDF with QR embedded ──────────────────────────
    pdf_path = generate_degree(student_name, cgpa, qr_path, "degree.pdf")

    # ── Final hash after QR added ─────────────────────────────────
    degree_hash = generate_hash(pdf_path)

    # ── Duplicate degree prevention ───────────────────────────────
    if degree_store.degree_exists(degree_hash):
        log_event(
            "DUPLICATE_DEGREE_BLOCKED",
            f"student={student_name} degree_hash={degree_hash}"
        )
        return jsonify({
            "status": "REJECTED",
            "error":  "Duplicate degree detected. This degree has already been issued.",
            "student_name": student_name,
            "degree_hash":   degree_hash,
        }), 409

    # ── Store on Ganache (private blockchain) ─────────────────────
    t0 = time.time()
    tx_hash = store_degree(student_name, degree_hash)
    tx_time = round(time.time() - t0, 3)

    # ── Store hash on Sepolia (public blockchain) ─────────────────
    sepolia_tx = store_degree_public(student_name, degree_hash)
    sepolia_url = get_sepolia_etherscan_url(sepolia_tx) if sepolia_tx else None

    # ── Update admin stats ────────────────────────────────────────
    _stats["approved"] += 1
    _recent_degrees.append({
        "student_name": student_name,
        "degree_hash":  degree_hash,
        "timestamp":    int(time.time()),
        "revoked":      False,
    })
    # Keep only the last 20 entries
    if len(_recent_degrees) > 20:
        _recent_degrees.pop(0)

    # ── Persist to JSON (with encrypted CNIC expiry) ───────────────
    degree_store.add_degree({
        "student_name":    student_name,
        "degree_hash":     degree_hash,
        "timestamp":       int(time.time()),
        "status":          "APPROVED",
        "blockchain_tx":   tx_hash,
        "sepolia_tx":      sepolia_tx,
        "sepolia_url":     sepolia_url,
        "cnic_expiry_encrypted": encrypt_field(expiry_date),
    })

    # ── Audit log: degree issued (with blockchain tx time) ────────
    log_event(
        "DEGREE_ISSUED",
        f"student={student_name} degree_hash={degree_hash} tx={tx_hash} tx_time={tx_time}s"
    )

    # Return just filenames so frontend can build URLs
    pdf_filename = os.path.basename(pdf_path)
    qr_filename  = os.path.basename(qr_path)

    return jsonify({
        "status":        "APPROVED",
        "student_name":  student_name,
        "cgpa":          cgpa,
        "percentage":    percentage,
        "cnic_expiry":   expiry_date,
        "pdf_path":      pdf_filename,
        "qr_path":       qr_filename,
        "degree_hash":   degree_hash,
        "blockchain_tx": tx_hash,
        "sepolia_tx":    sepolia_tx,
        "sepolia_url":   sepolia_url,
    })


@app.route("/verify/<degree_hash>", methods=["GET"])
def verify_degree(degree_hash):
    try:
        result = contract.functions.degrees(degree_hash).call()

        if not result or result[0] == "":
            # Count as fraud attempt if the hash looks fabricated
            # (real hashes that weren't issued simply return empty)
            _stats["fraud"] += 1

            # ── Audit log: fraud attempt ────────────────────────
            log_event("FRAUD_ATTEMPT", f"degree_hash={degree_hash}")

            return jsonify({"status": "INVALID DEGREE"}), 404

        # ── Count verification request and audit log ──────────────
        _stats["verifications"] += 1
        log_event(
            "DEGREE_VERIFIED",
            f"student={result[0]} degree_hash={result[1]}"
        )

        if result[3]:  # revoked flag
            return jsonify({
                "status":       "REVOKED",
                "student_name": result[0],
                "timestamp":    result[2]
            })

        return jsonify({
            "status":       "VALID",
            "student_name": result[0],
            "timestamp":    result[2]
        })
    except Exception as e:
        print(f"[Verify] Error: {e}")
        log_event("FRAUD_ATTEMPT", f"degree_hash={degree_hash} error={e}")
        return jsonify({"status": "INVALID DEGREE", "error": str(e)}), 404


# ── Admin Dashboard Endpoint ──────────────────────────────────────

@app.route("/admin/stats", methods=["GET"])
def admin_stats():
    """
    Returns stats for the Admin Dashboard.
    Reads live data from the blockchain where possible,
    and falls back to in-memory counters for approved/rejected/fraud.
    """
    try:
        # Pull recent degrees from blockchain by scanning known hashes
        # We use _recent_degrees (populated during /upload) as the source
        # because the smart contract doesn't expose a list — only lookup by hash.
        recent = list(reversed(_recent_degrees))  # newest first

        return jsonify({
            "total":          _stats["total"],
            "approved":       _stats["approved"],
            "rejected":       _stats["rejected"],
            "fraud":          _stats["fraud"],
            "verifications":  _stats["verifications"],
            "recent_degrees": recent[:10],  # last 10 for the table
            "blockchain_connected": web3.is_connected(),
        })
    except Exception as e:
        print(f"[Admin Stats] Error: {e}")
        return jsonify({"error": str(e)}), 500


# ── Unauthorized access logging ───────────────────────────────────

@app.route("/admin", methods=["GET"])
@app.route("/admin/<path:subpath>", methods=["GET"])
def admin_guard(subpath=None):
    """
    Catches direct/unauthenticated hits to /admin* that aren't
    one of the defined admin API routes above (e.g. a student
    trying to browse straight to /admin).
    """
    log_event(
        "UNAUTHORIZED_ACCESS",
        f"path=/admin/{subpath or ''} ip={request.remote_addr}"
    )
    return jsonify({"error": "Unauthorized"}), 403


# ── File serving routes ───────────────────────────────────────────

@app.route("/download/<filename>", methods=["GET"])
def download_pdf(filename):
    """Serve degree PDF for download."""
    path = os.path.abspath(os.path.join(DEGREES_FOLDER, filename))
    print(f"[Download] Looking for: {path}")
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(
        path,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename
    )


@app.route("/qr/<filename>", methods=["GET"])
def serve_qr(filename):
    """Serve QR code image."""
    path = os.path.abspath(os.path.join(QR_FOLDER, filename))
    print(f"[QR] Looking for: {path}")
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(path, mimetype="image/png")


@app.route("/degrees/<filename>", methods=["GET"])
def serve_degrees_direct(filename):
    """Direct /degrees/ URL access (for browser preview)."""
    path = os.path.abspath(os.path.join(DEGREES_FOLDER, filename))
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(path, mimetype="application/pdf")

@app.route("/admin/revoke/<degree_hash>", methods=["POST"])
def admin_revoke(degree_hash):
    try:
        tx_hash = revoke_degree(degree_hash)
        # Update in-memory recent_degrees so dashboard badge flips immediately
        for entry in _recent_degrees:
            if entry.get("degree_hash") == degree_hash:
                entry["revoked"] = True
        log_event("DEGREE_REVOKED", f"degree_hash={degree_hash} tx={tx_hash}")
        return jsonify({"status": "REVOKED", "tx": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
    # Add this route to your app.py
# Place it after the /admin/stats route

@app.route("/admin/report", methods=["GET"])
def admin_report():
    """
    Reads audit.log and degrees.json and returns
    a full report for the Report page.
    """
    try:
        # ── Parse audit.log ───────────────────────────────────────
        log_path = os.path.join(os.path.dirname(__file__), "logs", "audit.log")
        
        events = []
        counts = {
            "DEGREE_ISSUED":           0,
            "DEGREE_REJECTED":         0,
            "DEGREE_VERIFIED":         0,
            "FRAUD_ATTEMPT":           0,
            "DUPLICATE_DEGREE_BLOCKED": 0,
            "DEGREE_REVOKED":          0,
            "UNAUTHORIZED_ACCESS":     0,
        }

        if os.path.exists(log_path):
            with open(log_path, "r") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    parts = line.split(" | ", 2)
                    if len(parts) == 3:
                        timestamp, event_type, details = parts
                        events.append({
                            "timestamp":  timestamp,
                            "event_type": event_type,
                            "details":    details,
                        })
                        if event_type in counts:
                            counts[event_type] += 1

        # ── Read degrees.json ─────────────────────────────────────
        degrees_path = os.path.join(os.path.dirname(__file__), "data", "degrees.json")
        degrees = []
        if os.path.exists(degrees_path):
            import json
            with open(degrees_path, "r") as f:
                degrees = json.load(f)

        # Strip encrypted fields before sending to frontend
        safe_degrees = []
        for d in degrees:
            safe_degrees.append({
                "student_name": d.get("student_name"),
                "degree_hash":  d.get("degree_hash"),
                "timestamp":    d.get("timestamp"),
                "status":       d.get("status"),
                "blockchain_tx": d.get("blockchain_tx"),
            })

        return jsonify({
            "counts":          counts,
            "audit_log":       list(reversed(events)),  # newest first
            "degrees":         list(reversed(safe_degrees)),
            "total_events":    len(events),
            "blockchain_connected": web3.is_connected(),
        })

    except Exception as e:
        print(f"[Report] Error: {e}")
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
