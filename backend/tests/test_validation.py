from ocr import extract_text
from validation import extract_cgpa, validate_cgpa

path = r"C:\Users\PC\OneDrive\Desktop\degree-blockchain\uploads\sample.jpg"

text = extract_text(path)

cgpa = extract_cgpa(text)

print("CGPA:", cgpa)

if validate_cgpa(cgpa):
    print("PASS")
else:
    print("FAIL")