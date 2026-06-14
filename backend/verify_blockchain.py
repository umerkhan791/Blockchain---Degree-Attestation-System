from blockchain import contract

degree_hash = "90787af95e1f650adba73d48541e8182d61c40bc103efc4fb52492dd88cece59"

result = contract.functions.degrees(
    degree_hash
).call()

print("Student Name:", result[0])
print("Degree Hash:", result[1])
print("Timestamp:", result[2])