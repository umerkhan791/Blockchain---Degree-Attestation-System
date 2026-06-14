from qr_generator import generate_qr

hash_value = "66260a9be77434e0146f4e7ae3eb1078f5bba1fe0d4bcaa756f86a1f3d02b35a"

path = generate_qr(hash_value)

print("QR saved at:")
print(path)