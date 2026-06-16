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

    # Try multiple date formats Pakistani CNICs may appear in
    formats = [
        "%d-%m-%Y",   # 29-07-2029  (standard)
        "%d.%m.%Y",   # 29.07.2029  (dots — common on Pakistani CNICs)
        "%d/%m/%Y",   # 29/07/2029  (slashes)
        "%Y-%m-%d",   # 2029-07-29  (ISO)
        "%d-%m-%y",   # 29-07-29    (2-digit year)
        "%d.%m.%y",   # 29.07.29
    ]

    for fmt in formats:
        try:
            expiry = datetime.strptime(expiry_date.strip(), fmt)
            # Fix 2-digit years: strptime maps 00-68 → 2000-2068, 69-99 → 1969-1999
            # But we want anything parsed as 19xx that is > 2000 to be fixed
            if expiry.year < 2000:
                expiry = expiry.replace(year=expiry.year + 100)
            valid = expiry > datetime.now()
            print(f"[VALIDATION] CNIC expiry: {expiry_date} (parsed as {expiry.date()}) → {'VALID' if valid else 'EXPIRED'}")
            return valid
        except ValueError:
            continue

    print(f"[VALIDATION] CNIC expiry parse error — unrecognised format: {expiry_date}")
    return False


def is_eligible(cgpa, percentage, cnic_valid):
    """
    Rules:
      - CGPA       >= 2.5   (hard requirement)
      - Percentage >= 50%   (hard requirement)
      - CNIC not expired    (hard requirement)
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
