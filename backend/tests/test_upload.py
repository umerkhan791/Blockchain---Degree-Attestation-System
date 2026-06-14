import requests

url = "http://127.0.0.1:5000/upload"

files = {

    "cnic_front": open(
        "../uploads/cnic_front.png",
        "rb"
    ),

    "cnic_back": open(
        "../uploads/cnic_back.png",
        "rb"
    ),

    "marksheet": open(
        "../uploads/marksheet.png",
        "rb"
    ),

    "transcript": open(
        "../uploads/transcript.jpg",
        "rb"
    )
}

response = requests.post(
    url,
    files=files
)

print("Status Code:", response.status_code)
print(response.json())

for f in files.values():
    f.close()