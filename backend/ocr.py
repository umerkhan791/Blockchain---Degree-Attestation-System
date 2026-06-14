import pytesseract
from PIL import Image
import cv2

pytesseract.pytesseract.tesseract_cmd = (
    r"C:\Program Files\Tesseract-OCR\tesseract.exe"
)


def extract_text(image_path):

    # Read image
    img = cv2.imread(image_path)

    # Convert to grayscale
    gray = cv2.cvtColor(
        img,
        cv2.COLOR_BGR2GRAY
    )

    # Threshold
    gray = cv2.threshold(
        gray,
        150,
        255,
        cv2.THRESH_BINARY
    )[1]

    # Save temporary image
    temp_path = "temp.png"

    cv2.imwrite(
        temp_path,
        gray
    )

    image = Image.open(
        temp_path
    )

    text = pytesseract.image_to_string(
        image,
        config="--psm 6"
    )

    return text