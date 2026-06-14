from datetime import datetime


# ── Validators ───────────────────────────────────────────────────

def validate_cgpa(cgpa):
    if cgpa is None:
        return False
    return float(cgpa) >= 2.5


def validate_percentage(percentage):
    if percentage is None:
        return False
    return float(percentage) >= 50


def validate_cnic_expiry(expiry_date):
    if expiry_date is None:
        print("[VALIDATION] CNIC expiry: NOT FOUND")
        return False
    try:
        expiry = datetime.strptime(expiry_date, "%d-%m-%Y")
        valid  = expiry > datetime.now()
        print(f"[VALIDATION] CNIC expiry: {expiry_date} → {'VALID' if valid else 'EXPIRED'}")
        return valid
    except Exception as e:
        print(f"[VALIDATION] CNIC expiry parse error: {e}")
        return False


def is_eligible(cgpa, percentage, cnic_valid):
    """
    Rules:
      - CGPA      >= 2.5   (hard requirement)
      - Percentage >= 50%  (hard requirement)
      - CNIC not expired   (hard requirement — Gemini reads it reliably now)
    """
    print("\n[ELIGIBILITY CHECK]")
    print(f"  CGPA:       {cgpa}  → {'PASS' if validate_cgpa(cgpa) else 'FAIL'} (required >= 2.5)")
    print(f"  Percentage: {percentage}% → {'PASS' if validate_percentage(percentage) else 'FAIL'} (required >= 50)")
    print(f"  CNIC:       {'VALID' if cnic_valid else 'EXPIRED/NOT FOUND'}")

    if not validate_cgpa(cgpa):
        print("  RESULT: REJECTED — CGPA too low or missing")
        return False

    if not validate_percentage(percentage):
        print("  RESULT: REJECTED — Percentage too low or missing")
        return False

    if not cnic_valid:
        print("  RESULT: REJECTED — CNIC expired or unreadable")
        return False

    print("  RESULT: APPROVED ✓")
    return True
