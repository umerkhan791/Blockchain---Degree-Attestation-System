import qrcode
import os


def generate_qr(hash_value):

    os.makedirs(
        "../qr_codes",
        exist_ok=True
    )

    verification_url = (
        f"http://127.0.0.1:5000/verify/{hash_value}"
    )

    qr = qrcode.make(
        verification_url
    )

    path = os.path.join(
        "../qr_codes",
        "degree_qr.png"
    )

    qr.save(path)

    return path