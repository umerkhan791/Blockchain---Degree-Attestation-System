"""
app.py — ChainDegree Flask backend.
"""

import os
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

from blockchain     import store_degree, revoke_degree, contract, web3, get_etherscan_url
import supabase_store as db
from gemini_ocr     import extract_all
from validation     import validate_cgpa, validate_percentage, validate_cnic_expiry, is_eligible
from pdf_generator  import generate_degree
from hash_generator import generate_hash
from qr_generator   import generate_qr
from audit_logger   import log_event
from crypto_utils   import encrypt_field

app = Flask(__name__)

ENV          = os.getenv("FLASK_ENV", "development")
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")

CORS(app, resources={r"/*": {"origins": FRONTEND_URL if ENV == "production" else "*"}})

UPLOAD_FOLDER  = os.getenv("UPLOAD_FOLDER",  "/tmp/uploads")
DEGREES_FOLDER = os.getenv("DEGREES_FOLDER", "/tmp/degrees")
QR_FOLDER      = os.getenv("QR_FOLDER",      "/tmp/qr_codes")

os.makedirs(UPLOAD_FOLDER,  exist_ok=True)
os.makedirs(DEGREES_FOLDER, exist_ok=True)
os.makedirs(QR_FOLDER,      exist_ok=True)

_verification_count = 0


@app.route("/")
def home():
    return "ChainDegree — Blockchain Degree Verification System Running"


@app.route("/upload", methods=["POST"])
def upload_files():
    required_files = ["cnic_front", "cnic_back", "marksheet", "transcript"]
    for f in required_files:
        if f not in request.files:
            return jsonify({"error": f"{f} missing"}), 400

    cnic_front_path = os.path.join(UPLOAD_FOLDER, "cnic_front.jpg")
    cnic_back_path  = os.path.join(UPLOAD_FOLDER, "cnic_back.jpg")
    marksheet_path  = os.path.join(UPLOAD_FOLDER, "marksheet.jpg")
    transcript_path = os.path.join(UPLOAD_FOLDER, "transcript.jpg")

    request.files["cnic_front"].save(cnic_front_path)
    request.files["cnic_back"].save(cnic_back_path)
    request.files["marksheet"].save(marksheet_path)
    request.files["transcript"].save(transcript_path)

    extracted    = extract_all(transcript_path, marksheet_path, cnic_front_path, cnic_back_path)
    student_name = extracted["student_name"] or "Unknown Student"
    cgpa         = extracted["cgpa"]
    percentage   = extracted["percentage"]
    expiry_date  = extracted["cnic_expiry"]

    cgpa_valid       = validate_cgpa(cgpa)
    percentage_valid = validate_percentage(percentage)
    cnic_valid       = validate_cnic_expiry(expiry_date)
    eligible         = is_eligible(cgpa, percentage, cnic_valid)

    if not eligible:
        log_event("DEGREE_REJECTED",
                  f"student={student_name} cgpa={cgpa} percentage={percentage} cnic_valid={cnic_valid}")
        db.add_degree({
            "student_name":          student_name,
            "cgpa":                  cgpa,
            "percentage":            percentage,
            "cnic_expiry":           expiry_date,
            "cnic_expiry_encrypted": encrypt_field(expiry_date),
            "status":                "REJECTED",
        })
        return jsonify({
            "status":           "REJECTED",
            "student_name":     student_name,
            "cgpa":             cgpa,
            "percentage":       percentage,
            "cnic_expiry":      expiry_date,
            "cgpa_valid":       cgpa_valid,
            "percentage_valid": percentage_valid,
            "cnic_valid":       cnic_valid,
        })

    # First pass PDF — no QR yet
    pdf_path, _       = generate_degree(student_name, cgpa)
    degree_hash       = generate_hash(pdf_path)

    # Generate QR pointing to verify URL
    qr_path, qr_url   = generate_qr(degree_hash)

    # Second pass — embed QR into PDF
    pdf_path, pdf_url = generate_degree(student_name, cgpa, qr_path, "degree.pdf")
    degree_hash       = generate_hash(pdf_path)

    if db.degree_exists(degree_hash):
        log_event("DUPLICATE_DEGREE_BLOCKED", f"student={student_name} degree_hash={degree_hash}")
        return jsonify({
            "status":       "REJECTED",
            "error":        "Duplicate degree detected. This degree has already been issued.",
            "student_name": student_name,
            "degree_hash":  degree_hash,
        }), 409

    tx_hash   = store_degree(student_name, degree_hash)
    etherscan = get_etherscan_url(tx_hash)

    db.add_degree({
        "student_name":          student_name,
        "cgpa":                  cgpa,
        "percentage":            percentage,
        "cnic_expiry":           expiry_date,
        "cnic_expiry_encrypted": encrypt_field(expiry_date),
        "degree_hash":           degree_hash,
        "tx_hash":               tx_hash,
        "sepolia_tx":            tx_hash if ENV == "production" else None,
        "status":                "APPROVED",
    })

    log_event("DEGREE_ISSUED",
              f"student={student_name} hash={degree_hash} tx={tx_hash} etherscan={etherscan}")

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
        "pdf_url":       pdf_url,
        "qr_url":        qr_url,
        "degree_hash":   degree_hash,
        "blockchain_tx": tx_hash,
        "etherscan_url": etherscan,
    })


@app.route("/verify/<degree_hash>", methods=["GET"])
def verify_degree(degree_hash):
    global _verification_count
    try:
        # Sepolia verifyDegree returns (studentName, timestamp)
        # Ganache verifyDegree returns (studentName, timestamp, revoked)
        result = contract.functions.verifyDegree(degree_hash).call()

        student_name = result[0]
        timestamp    = result[1] if len(result) > 1 else 0
        revoked      = result[2] if len(result) > 2 else False

        if not student_name or student_name == "":
            log_event("FRAUD_ATTEMPT", f"degree_hash={degree_hash}")
            return jsonify({"status": "INVALID DEGREE"}), 404

        _verification_count += 1
        log_event("DEGREE_VERIFIED", f"student={student_name} degree_hash={degree_hash}")

        # Check Supabase to see if it's been marked revoked (since Sepolia contract
        # doesn't support revoke). This way the verify is consistent.
        try:
            all_degrees = db.get_all_degrees()
            for d in all_degrees:
                if d.get("degree_hash") == degree_hash and d.get("status") == "REVOKED":
                    revoked = True
                    break
        except Exception:
            pass

        if revoked:
            return jsonify({
                "status":       "REVOKED",
                "student_name": student_name,
                "timestamp":    timestamp,
                "degree_hash":  degree_hash,
            })

        return jsonify({
            "status":       "VALID",
            "student_name": student_name,
            "timestamp":    timestamp,
            "degree_hash":  degree_hash,
        })
    except Exception as e:
        log_event("FRAUD_ATTEMPT", f"degree_hash={degree_hash} error={e}")
        return jsonify({"status": "INVALID DEGREE", "error": str(e)}), 404


@app.route("/admin/stats", methods=["GET"])
def admin_stats():
    try:
        stats  = db.get_stats()
        recent = db.get_recent_degrees(10)
        safe   = [{
            "student_name": r.get("student_name"),
            "degree_hash":  r.get("degree_hash"),
            "timestamp":    r.get("created_at"),
            "status":       r.get("status"),
            "revoked":      r.get("status") == "REVOKED",
        } for r in recent]
        return jsonify({
            "total":                stats["total"],
            "approved":             stats["approved"],
            "rejected":             stats["rejected"],
            "fraud":                stats["fraud"],
            "verifications":        _verification_count,
            "recent_degrees":       safe,
            "blockchain_connected": web3.is_connected(),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin/report", methods=["GET"])
def admin_report():
    try:
        log_path = os.path.join(os.path.dirname(__file__), "logs", "audit.log")
        events, counts = [], {
            "DEGREE_ISSUED": 0, "DEGREE_REJECTED": 0, "DEGREE_VERIFIED": 0,
            "FRAUD_ATTEMPT": 0, "DUPLICATE_DEGREE_BLOCKED": 0,
            "DEGREE_REVOKED": 0, "UNAUTHORIZED_ACCESS": 0,
        }
        if os.path.exists(log_path):
            with open(log_path) as f:
                for line in f:
                    parts = line.strip().split(" | ", 2)
                    if len(parts) == 3:
                        ts, ev, details = parts
                        events.append({"timestamp": ts, "event_type": ev, "details": details})
                        if ev in counts:
                            counts[ev] += 1

        all_degrees = db.get_all_degrees()
        safe = [{
            "student_name":  d.get("student_name"),
            "degree_hash":   d.get("degree_hash"),
            "timestamp":     d.get("created_at"),
            "status":        d.get("status"),
            "blockchain_tx": d.get("tx_hash"),
        } for d in all_degrees]

        return jsonify({
            "counts":               counts,
            "audit_log":            list(reversed(events)),
            "degrees":              safe,
            "total_events":         len(events),
            "blockchain_connected": web3.is_connected(),
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin/revoke/<degree_hash>", methods=["POST"])
def admin_revoke(degree_hash):
    try:
        tx_hash = revoke_degree(degree_hash)
        db.mark_revoked(degree_hash)
        log_event("DEGREE_REVOKED", f"degree_hash={degree_hash} tx={tx_hash}")
        return jsonify({"status": "REVOKED", "tx": tx_hash})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/admin", methods=["GET"])
@app.route("/admin/<path:subpath>", methods=["GET"])
def admin_guard(subpath=None):
    log_event("UNAUTHORIZED_ACCESS", f"path=/admin/{subpath or ''} ip={request.remote_addr}")
    return jsonify({"error": "Unauthorized"}), 403


@app.route("/download/<filename>", methods=["GET"])
def download_pdf(filename):
    path = os.path.abspath(os.path.join(DEGREES_FOLDER, filename))
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(path, mimetype="application/pdf", as_attachment=True, download_name=filename)


@app.route("/qr/<filename>", methods=["GET"])
def serve_qr(filename):
    path = os.path.abspath(os.path.join(QR_FOLDER, filename))
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(path, mimetype="image/png")


@app.route("/degrees/<filename>", methods=["GET"])
def serve_degrees_direct(filename):
    path = os.path.abspath(os.path.join(DEGREES_FOLDER, filename))
    if not os.path.exists(path):
        return jsonify({"error": f"File not found: {filename}"}), 404
    return send_file(path, mimetype="application/pdf")


if __name__ == "__main__":
    app.run(debug=(ENV != "production"))
