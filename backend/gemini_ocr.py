import base64
import json
import requests
import os
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL   = "google/gemini-2.5-flash-lite"
API_URL = "https://openrouter.ai/api/v1/chat/completions"


def encode_image(image_path: str) -> str:
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode("utf-8")


def ask_gemini(prompt: str, image_path: str) -> str:
    image_b64 = encode_image(image_path)
    ext       = image_path.lower().split(".")[-1]
    mime_map  = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png"}
    mime_type = mime_map.get(ext, "image/jpeg")

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "http://localhost:5000",
        "X-Title":       "DegreeChain",
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text",      "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}}
                ]
            }
        ],
        "max_tokens": 500,
    }

    response = requests.post(API_URL, headers=headers, json=payload, timeout=60)

    if not response.ok:
        print(f"[Gemini] HTTP {response.status_code} Error")
        print(f"[Gemini] Response: {response.text}")
        response.raise_for_status()

    data = response.json()
    return data["choices"][0]["message"]["content"].strip()


def extract_from_transcript(transcript_path: str) -> dict:
    prompt = """You are a document data extractor.
Look at this university transcript image carefully.
Extract:
- Student full name (exactly as written, in CAPITAL letters)
- CGPA or GPA (a decimal number like 3.62)

Return ONLY valid JSON, no markdown, no explanation:
{"student_name": "FULL NAME HERE", "cgpa": 0.00}

Use null if not found."""

    print("[Gemini] Sending transcript...")
    raw = ask_gemini(prompt, transcript_path)
    print(f"[Gemini] Transcript response: {raw}")
    return parse_json(raw, {"student_name": None, "cgpa": None})


def extract_from_marksheet(marksheet_path: str) -> dict:
    prompt = """You are a document data extractor.
Look at this Pakistani 12th grade / intermediate marksheet image.

Extract these things:
1. Student's full name (look for "Name" or "Candidate Name" field, in CAPITAL letters)
2. Total marks obtained
3. Maximum total marks (e.g. 1100)

Find the TOTAL row showing maximum marks and obtained marks.
For example: TOTAL | 1100 | 961

Return ONLY valid JSON, no markdown, no explanation:
{"student_name": "FULL NAME HERE", "obtained_marks": 961, "total_marks": 1100, "percentage": 87.36}

Use null if any field is not found."""

    print("[Gemini] Sending marksheet...")
    raw = ask_gemini(prompt, marksheet_path)
    print(f"[Gemini] Marksheet response: {raw}")
    return parse_json(raw, {"student_name": None, "obtained_marks": None, "total_marks": None, "percentage": None})


def extract_from_cnic(cnic_path: str) -> dict:
    prompt = """Look at this Pakistani CNIC (front side).

Extract these two fields:
1. Holder's full Name (look for "Name" field at the top, in CAPITAL letters)
2. Date of Expiry (at the bottom right area)

Pakistani CNICs show dates in DD.MM.YYYY format (e.g. 29.07.2029).
You must convert it to DD-MM-YYYY format before returning.

Examples:
- 29.07.2029 -> "29-07-2029"
- 15.03.2027 -> "15-03-2027"
- 29-07-2029 -> "29-07-2029" (already correct)

Return ONLY valid JSON, no markdown, no explanation:
{"student_name": "FULL NAME HERE", "cnic_expiry": "DD-MM-YYYY"}

Use null for any field that is not readable."""

    print("[Gemini] Sending CNIC...")
    raw = ask_gemini(prompt, cnic_path)
    print(f"[Gemini] CNIC response: {raw}")
    return parse_json(raw, {"student_name": None, "cnic_expiry": None})


def parse_json(raw: str, fallback: dict) -> dict:
    try:
        cleaned = raw.strip()
        if "```" in cleaned:
            lines   = cleaned.split("\n")
            lines   = [l for l in lines if not l.strip().startswith("```")]
            cleaned = "\n".join(lines).strip()
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        print(f"[Gemini] JSON parse error: {e} | Raw: {raw}")
        return fallback


def extract_all(transcript_path, marksheet_path, cnic_front_path, cnic_back_path) -> dict:
    transcript_data = extract_from_transcript(transcript_path)
    marksheet_data  = extract_from_marksheet(marksheet_path)
    cnic_data       = extract_from_cnic(cnic_front_path)

    # Resolve percentage
    percentage = marksheet_data.get("percentage")
    if percentage is None:
        obtained = marksheet_data.get("obtained_marks")
        total    = marksheet_data.get("total_marks")
        if obtained and total and total > 0:
            percentage = round((int(obtained) / int(total)) * 100, 2)

    result = {
        # Primary name from transcript
        "student_name":   transcript_data.get("student_name"),
        # Cross-check names from other documents
        "cnic_name":      cnic_data.get("student_name"),
        "marksheet_name": marksheet_data.get("student_name"),

        "cgpa":         transcript_data.get("cgpa"),
        "percentage":   percentage,
        "cnic_expiry":  cnic_data.get("cnic_expiry"),
    }

    print("\n[GEMINI RESULT]")
    for k, v in result.items():
        print(f"  {k}: {v}")
    print("=" * 50 + "\n")

    return result
