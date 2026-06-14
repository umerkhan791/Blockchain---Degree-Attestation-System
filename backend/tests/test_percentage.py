from validation import extract_percentage

text = """
Obtained Marks: 845
Total Marks: 1100
"""

percentage = extract_percentage(text)

print("Percentage:", percentage)