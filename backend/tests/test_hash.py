from hash_generator import generate_hash

path = r"..\degrees\degree.pdf"

hash_value = generate_hash(path)

print("SHA256 Hash:")
print(hash_value)