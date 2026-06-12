import os
import json
import base64
import httpx
import logging
from typing import Any, Dict
from dotenv import load_dotenv

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
VISION_MODEL = os.getenv("VISION_MODEL", "qwen2.5-vl:7b")

class VisionError(Exception):
    pass

async def vision_describe(image_path: str, question: str) -> Dict[str, Any]:
    """
    Ask the vision model a targeted question about a product image.
    Returns parsed JSON dict. Retries up to 3 times on malformed JSON.
    """
    if not os.path.exists(image_path):
        raise FileNotFoundError(f"Image not found at {image_path}")

    with open(image_path, "rb") as f:
        image_base64 = base64.b64encode(f.read()).decode("utf-8")

    prompt = question
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": VISION_MODEL,
                        "messages": [
                            {
                                "role": "user",
                                "content": prompt,
                                "images": [image_base64]
                            }
                        ],
                        "format": "json",
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                content = data.get("message", {}).get("content", "")
                
                try:
                    return json.loads(content)
                except json.JSONDecodeError:
                    logging.warning(f"Attempt {attempt + 1}: Failed to parse JSON from vision model.")
                    prompt = f"{question}\n\nYou must respond with valid JSON only."
                    continue
        except Exception as e:
            logging.exception(f"Error calling vision model: {e}")
            if attempt == 2:
                raise VisionError(f"Failed to get valid response from vision model after 3 attempts: {e}")

    raise VisionError("Failed to parse vision model response as JSON after 3 retries.")

if __name__ == "__main__":
    import asyncio
    # Simple test block
    async def test():
        # Look for a sample image in the data/product images directory
        sample_dir = "../../../data/product images"
        if os.path.exists(sample_dir):
            images = [f for f in os.listdir(sample_dir) if f.endswith(".jpg")]
            if images:
                test_image = os.path.join(sample_dir, images[0])
                print(f"Testing vision_describe with {test_image}")
                try:
                    result = await vision_describe(test_image, "What is the brand and product name of this item?")
                    print(json.dumps(result, indent=2))
                except Exception as e:
                    print(f"Test failed: {e}")
            else:
                print("No images found in sample directory.")
        else:
            print(f"Sample directory {sample_dir} not found.")

    asyncio.run(test())
