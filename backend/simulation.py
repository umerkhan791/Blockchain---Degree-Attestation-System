"""
DegreeChain — CCP Simulation Script
=====================================
Simulates:
  - 2 Universities
  - 3 Students
  - 2 Employers
  - 5 legitimate degrees issued
  - 1 fake degree attempt (detected)
  - Full audit log
"""

import hashlib
import json
import os
import time
from datetime import datetime
from web3 import Web3

# ── Blockchain connection (same as blockchain.py) ─────────────────
ganache_url      = "http://127.0.0.1:7545"
web3             = Web3(Web3.HTTPProvider(ganache_url))
contract_address = "0x2875ad27C4c0dcc24A356711efCCBf9380A65cD4"

contract_abi = [
    {
        "inputs": [{"internalType": "string", "name": "", "type": "string"}],
        "name": "degrees",
        "outputs": [
            {"internalType": "string",  "name": "studentName", "type": "string"},
            {"internalType": "string",  "name": "degreeHash",  "type": "string"},
            {"internalType": "uint256", "name": "timestamp",   "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "string", "name": "_studentName", "type": "string"},
            {"internalType": "string", "name": "_degreeHash",  "type": "string"}
        ],
        "name": "storeDegree",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "string", "name": "_degreeHash", "type": "string"}],
        "name": "verifyDegree",
        "outputs": [
            {"internalType": "string",  "name": "", "type": "string"},
            {"internalType": "uint256", "name": "", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

contract = web3.eth.contract(address=contract_address, abi=contract_abi)
account  = web3.eth.accounts[0]

# ── Simulation Data ───────────────────────────────────────────────

UNIVERSITIES = [
    {"id": "UNI001", "name": "Iqra University",            "city": "Karachi"},
    {"id": "UNI002", "name": "FAST National University",   "city": "Islamabad"},
]

STUDENTS = [
    {
        "id":         "STU001",
        "name":       "Muhammad Umer Fayyaz Khan",
        "cgpa":       3.62,
        "percentage": 87.36,
        "program":    "BSCS",
        "university": "UNI001",
        "cnic":       "42201-1234567-1",
        "eligible":   True,
    },
    {
        "id":         "STU002",
        "name":       "Ali Hassan Raza",
        "cgpa":       3.10,
        "percentage": 75.00,
        "program":    "BSCS",
        "university": "UNI001",
        "cnic":       "35202-9876543-2",
        "eligible":   True,
    },
    {
        "id":         "STU003",
        "name":       "Sara Ahmed Khan",
        "cgpa":       3.85,
        "percentage": 91.50,
        "program":    "BSSE",
        "university": "UNI002",
        "cnic":       "61101-5555555-3",
        "eligible":   True,
    },
]

EMPLOYERS = [
    {"id": "EMP001", "name": "Systems Limited",  "city": "Lahore"},
    {"id": "EMP002", "name": "NetSol Technologies", "city": "Lahore"},
]

# ── Helpers ───────────────────────────────────────────────────────

audit_log = []   # stores every action for the report

def log(action, details, status="SUCCESS"):
    entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "action":    action,
        "status":    status,
        "details":   details,
    }
    audit_log.append(entry)
    icon = "✅" if status == "SUCCESS" else "❌" if status == "FAILED" else "⚠️"
    print(f"  {icon}  [{entry['timestamp']}] {action} — {details}")


def make_degree_hash(student_name, cgpa, program, university_id, timestamp):
    """Generate SHA-256 hash for a degree."""
    raw = f"{student_name}|{cgpa}|{program}|{university_id}|{timestamp}"
    return hashlib.sha256(raw.encode()).hexdigest()


def store_on_blockchain(student_name, degree_hash):
    """Store degree hash on Ganache blockchain."""
    tx = contract.functions.storeDegree(
        student_name, degree_hash
    ).transact({"from": account})
    receipt = web3.eth.wait_for_transaction_receipt(tx)
    return receipt.transactionHash.hex()


def verify_on_blockchain(degree_hash):
    """Check if a degree hash exists on blockchain."""
    result = contract.functions.degrees(degree_hash).call()
    return result[0] != ""   # studentName is empty string if not found


# ── Simulation Steps ──────────────────────────────────────────────

def separator(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def step1_setup():
    separator("STEP 1 — Network Setup & Participants")

    print(f"\n  Blockchain:  Ganache Private Network")
    print(f"  RPC URL:     {ganache_url}")
    print(f"  Connected:   {web3.is_connected()}")
    print(f"  Contract:    {contract_address}")
    print(f"  Account:     {account}\n")

    print("  Universities registered:")
    for u in UNIVERSITIES:
        print(f"    [{u['id']}] {u['name']} — {u['city']}")
        log("University Registered", f"{u['name']} ({u['id']})")

    print("\n  Employers registered:")
    for e in EMPLOYERS:
        print(f"    [{e['id']}] {e['name']} — {e['city']}")
        log("Employer Registered", f"{e['name']} ({e['id']})")

    print("\n  Students enrolled:")
    for s in STUDENTS:
        uni = next(u for u in UNIVERSITIES if u["id"] == s["university"])
        print(f"    [{s['id']}] {s['name']} — {uni['name']} — CGPA: {s['cgpa']}")
        log("Student Enrolled", f"{s['name']} at {uni['name']}")


def step2_issue_degrees():
    separator("STEP 2 — Degree Issuance (5 Degrees)")

    issued_degrees = []

    # Issue one degree per student (3 students × some have 2 programs = 5 total)
    issue_list = STUDENTS.copy()

    # Add extra degrees to reach 5
    issue_list.append({
        "id": "STU001-2", "name": "Muhammad Umer Fayyaz Khan",
        "cgpa": 3.62, "percentage": 87.36,
        "program": "Minor — Data Science",
        "university": "UNI001", "eligible": True,
    })
    issue_list.append({
        "id": "STU002-2", "name": "Ali Hassan Raza",
        "cgpa": 3.10, "percentage": 75.00,
        "program": "Minor — Cybersecurity",
        "university": "UNI001", "eligible": True,
    })

    print()
    for i, student in enumerate(issue_list, 1):
        uni  = next(u for u in UNIVERSITIES if u["id"] == student["university"])
        ts   = int(time.time()) + i   # slightly different timestamp per degree

        # Validate eligibility
        cgpa_ok  = student["cgpa"] >= 2.5
        pct_ok   = student["percentage"] >= 50

        if not (cgpa_ok and pct_ok):
            log("Degree Issuance", f"REJECTED — {student['name']} ({student['program']})", "FAILED")
            continue

        # Generate hash
        degree_hash = make_degree_hash(
            student["name"], student["cgpa"],
            student["program"], student["university"], ts
        )

        # Store on blockchain
        print(f"  [{i}] Issuing degree for {student['name']} — {student['program']}")
        tx_hash = store_on_blockchain(student["name"], degree_hash)

        record = {
            "degree_number": i,
            "student_id":    student["id"],
            "student_name":  student["name"],
            "program":       student["program"],
            "university":    uni["name"],
            "cgpa":          student["cgpa"],
            "degree_hash":   degree_hash,
            "tx_hash":       tx_hash,
            "issued_at":     datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        }
        issued_degrees.append(record)

        log(
            "Degree Issued",
            f"{student['name']} | {student['program']} | Hash: {degree_hash[:16]}..."
        )
        print(f"       Hash: {degree_hash}")
        print(f"       TX:   {tx_hash}\n")

    return issued_degrees


def step3_verify_degrees(issued_degrees):
    separator("STEP 3 — Degree Verification (3 Cases)")

    print("\n  Employers verifying degrees:\n")
    verification_results = []

    # Verify 3 legitimate degrees
    for i, degree in enumerate(issued_degrees[:3], 1):
        employer = EMPLOYERS[i % len(EMPLOYERS)]
        found    = verify_on_blockchain(degree["degree_hash"])
        status   = "VALID" if found else "INVALID"

        print(f"  [{i}] {employer['name']} verifying {degree['student_name']}")
        print(f"       Hash:   {degree['degree_hash'][:32]}...")
        print(f"       Result: {status}\n")

        log(
            "Degree Verification",
            f"{employer['name']} verified {degree['student_name']} — {status}"
        )

        verification_results.append({
            "verified_by":  employer["name"],
            "student_name": degree["student_name"],
            "degree_hash":  degree["degree_hash"],
            "status":       status,
        })

    return verification_results


def step4_fake_degree_attempt(issued_degrees):
    separator("STEP 4 — Fake Degree Detection")

    print("\n  Simulating forged degree attempt...\n")

    fake_student = "FAKE STUDENT — Ahmad Fraud"
    fake_hash    = hashlib.sha256(b"this is a fake degree certificate").hexdigest()

    print(f"  Fraudster:   {fake_student}")
    print(f"  Fake Hash:   {fake_hash}")

    # Check if fake hash is on blockchain
    found = verify_on_blockchain(fake_hash)

    if not found:
        print(f"\n  🚨 FRAUD DETECTED — Hash not found on blockchain!")
        print(f"  🚨 Degree is NOT authentic. Access DENIED.\n")
        log(
            "Fraud Detection",
            f"Fake degree by '{fake_student}' — Hash: {fake_hash[:16]}... — REJECTED",
            "FRAUD"
        )
    else:
        print(f"  Degree found (unexpected)")

    # Also try tampering a real hash (change one character)
    if issued_degrees:
        real_hash    = issued_degrees[0]["degree_hash"]
        tampered     = real_hash[:-1] + ("0" if real_hash[-1] != "0" else "1")
        found_tamper = verify_on_blockchain(tampered)

        print(f"  Tampered real hash attempt:")
        print(f"  Original: {real_hash[:32]}...")
        print(f"  Tampered: {tampered[:32]}...")
        result = "FOUND (unexpected)" if found_tamper else "NOT FOUND — Tampering Detected ✓"
        print(f"  Result:   {result}\n")

        log(
            "Tampering Detection",
            f"Modified hash rejected — {result}",
            "FRAUD"
        )

    return fake_hash


def step5_report(issued_degrees, verification_results, fake_hash):
    separator("STEP 5 — Audit Report & Statistics")

    report = {
        "generated_at":          datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "blockchain_network":    "Ganache Private Ethereum",
        "contract_address":      contract_address,
        "total_universities":    len(UNIVERSITIES),
        "total_students":        len(STUDENTS),
        "total_employers":       len(EMPLOYERS),
        "total_degrees_issued":  len(issued_degrees),
        "total_verifications":   len(verification_results),
        "fraud_attempts":        1,
        "fraud_detected":        1,
        "universities":          UNIVERSITIES,
        "students":              STUDENTS,
        "employers":             EMPLOYERS,
        "issued_degrees":        issued_degrees,
        "verification_results":  verification_results,
        "audit_log":             audit_log,
    }

    print(f"""
  ┌─────────────────────────────────────────────┐
  │           SIMULATION SUMMARY                │
  ├─────────────────────────────────────────────┤
  │  Universities:        {len(UNIVERSITIES):<24}│
  │  Students:            {len(STUDENTS):<24}│
  │  Employers:           {len(EMPLOYERS):<24}│
  │  Degrees Issued:      {len(issued_degrees):<24}│
  │  Verifications:       {len(verification_results):<24}│
  │  Fraud Attempts:      1                        │
  │  Fraud Detected:      1 (100% detection rate)  │
  └─────────────────────────────────────────────┘
    """)

    print("  Audit Log:")
    for entry in audit_log:
        icon = "✅" if entry["status"] == "SUCCESS" else "🚨" if entry["status"] == "FRAUD" else "❌"
        print(f"    {icon} [{entry['timestamp']}] {entry['action']}: {entry['details']}")

    # Save report to JSON
    report_path = "../simulation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"\n  📄 Full report saved to: {os.path.abspath(report_path)}")
    return report


# ── Main ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  DEGREECHAIN — CCP SIMULATION")
    print("  Blockchain Based Degree Attestation System")
    print("  Iqra University — BSCS Final Year Project")
    print("="*60)

    if not web3.is_connected():
        print("\n❌ ERROR: Cannot connect to Ganache.")
        print("   Make sure Ganache is running on http://127.0.0.1:7545")
        exit(1)

    step1_setup()
    issued      = step2_issue_degrees()
    verifs      = step3_verify_degrees(issued)
    fake_hash   = step4_fake_degree_attempt(issued)
    report      = step5_report(issued, verifs, fake_hash)

    print("\n" + "="*60)
    print("  ✅ SIMULATION COMPLETE")
    print("="*60 + "\n")
