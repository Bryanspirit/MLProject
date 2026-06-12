import httpx
import os

url = "http://127.0.0.1:8000/api/upload"
image_path = "data/product images/S221234199_550719011.jpg"

if not os.path.exists(image_path):
    print(f"Error: {image_path} not found")
    exit(1)

with open(image_path, "rb") as f:
    files = {"file": ("product.jpg", f, "image/jpeg")}
    try:
        response = httpx.post(url, files=files, timeout=10.0)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")
