from datetime import datetime
import re


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

    formats = [
        "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%Y",
        "%Y-%m-%d", "%d-%m-%y", "%d.%m.%y",
    ]

    for fmt in formats:
        try:
            expiry = datetime.strptime(expiry_date.strip(), fmt)
            if expiry.year < 2000:
                expiry = expiry.replace(year=expiry.year + 100)
            valid = expiry > datetime.now()
            print(f"[VALIDATION] CNIC expiry: {expiry_date} (parsed as {expiry.date()}) → {'VALID' if valid else 'EXPIRED'}")
            return valid
        except ValueError:
            continue

    print(f"[VALIDATION] CNIC expiry parse error — unrecognised format: {expiry_date}")
    return False


# ── Name matching ────────────────────────────────────────────────

def _normalize_name(name: str) -> str:
    """Lowercase, remove punctuation and extra spaces."""
    if not name:
        return ""
    n = name.lower().strip()
    n = re.sub(r"[^a-z\s]", "", n)   # keep letters and spaces only
    n = re.sub(r"\s+", " ", n)        # collapse multiple spaces
    return n.strip()


def names_match(name1: str, name2: str) -> bool:
    """
    Check if two names refer to the same person.
    Lenient: ignores case, punctuation, spacing.
    Strict: requires that at least 2 of the words match exactly.
    """
    if not name1 or not name2:
        return False

    n1 = _normalize_name(name1)
    n2 = _normalize_name(name2)

    if not n1 or not n2:
        return False

    # Direct match
    if n1 == n2:
        return True

    # Split into words and count shared words
    words1 = set(n1.split())
    words2 = set(n2.split())

    # Remove very short words (e.g. "md", "k")
    words1 = {w for w in words1 if len(w) > 1}
    words2 = {w for w in words2 if len(w) > 1}

    shared = words1 & words2

    # If both sides have at least 2 words and share at least 2 → same person
    if len(shared) >= 2:
        return True

    # If one name is just 1 word (rare) and matches the other → same person
    if (len(words1) == 1 and words1.issubset(words2)) or \
       (len(words2) == 1 and words2.issubset(words1)):
        return True

    return False


def validate_names_match(transcript_name, cnic_name, marksheet_name) -> dict:
    """
    Cross-check that all three documents belong to the same person.
    Returns dict with:
      - all_match (bool)
      - mismatches (list of strings describing what didn't match)
    """
    mismatches = []

    if not transcript_name:
        mismatches.append("Transcript name not readable")

    # Transcript ↔ CNIC
    if transcript_name and cnic_name:
        if not names_match(transcript_name, cnic_name):
            mismatches.append(f"Transcript name ({transcript_name}) ≠ CNIC name ({cnic_name})")
    elif not cnic_name:
        mismatches.append("CNIC name not readable")

    # Transcript ↔ Marksheet
    if transcript_name and marksheet_name:
        if not names_match(transcript_name, marksheet_name):
            mismatches.append(f"Transcript name ({transcript_name}) ≠ Marksheet name ({marksheet_name})")
    elif not marksheet_name:
        mismatches.append("Marksheet name not readable")

    all_match = len(mismatches) == 0

    print("\n[NAME MATCH CHECK]")
    print(f"  Transcript: {transcript_name}")
    print(f"  CNIC:       {cnic_name}")
    print(f"  Marksheet:  {marksheet_name}")
    print(f"  Result:     {'ALL MATCH ✓' if all_match else 'MISMATCH'}")
    for m in mismatches:
        print(f"    - {m}")

    return {"all_match": all_match, "mismatches": mismatches}


# ── Eligibility ─────────────────────────────────────────────────

def is_eligible(cgpa, percentage, cnic_valid, names_valid=True):
    """
    Rules:
      - CGPA       >= 2.5
      - Percentage >= 50%
      - CNIC not expired
      - Names match across all 3 documents
    """
    print("\n[ELIGIBILITY CHECK]")
    print(f"  CGPA:       {cgpa}  → {'PASS' if validate_cgpa(cgpa) else 'FAIL'} (required >= 2.5)")
    print(f"  Percentage: {percentage}% → {'PASS' if validate_percentage(percentage) else 'FAIL'} (required >= 50)")
    print(f"  CNIC:       {'VALID' if cnic_valid else 'EXPIRED/NOT FOUND'}")
    print(f"  Name Match: {'PASS' if names_valid else 'FAIL'}")

    if not validate_cgpa(cgpa):
        print("  RESULT: REJECTED — CGPA too low or missing")
        return False

    if not validate_percentage(percentage):
        print("  RESULT: REJECTED — Percentage too low or missing")
        return False

    if not cnic_valid:
        print("  RESULT: REJECTED — CNIC expired or unreadable")
        return False

    if not names_valid:
        print("  RESULT: REJECTED — Documents belong to different people")
        return False

    print("  RESULT: APPROVED ✓")
    return True
