import os
import logging
from dataclasses import dataclass
from typing import List, Optional
import numpy as np
from PIL import Image
from concurrent.futures import ThreadPoolExecutor
import asyncio

# Fallback to EasyOCR if PaddleOCR is not working
try:
    import paddleocr
    from paddleocr import PaddleOCR
    # Check if paddle is actually working
    import paddle
    HAS_PADDLE = True
except (ImportError, Exception):
    HAS_PADDLE = False
    try:
        import easyocr
        HAS_EASYOCR = True
    except ImportError:
        HAS_EASYOCR = False

@dataclass
class Detection:
    text: str
    confidence: float
    bbox: List[int]  # [x, y, w, h]

@dataclass
class OCRResult:
    text: str
    confidence: float
    detections: List[Detection]

# Initialize readers
if HAS_PADDLE:
    paddle_ocr = PaddleOCR(use_angle_cls=True, lang='en', show_log=False)
elif HAS_EASYOCR:
    easy_reader = easyocr.Reader(['en'])
else:
    logging.error("No OCR engine available (PaddleOCR or EasyOCR)")

executor = ThreadPoolExecutor(max_workers=4)

def _run_paddle(image_path: str) -> OCRResult:
    result = paddle_ocr.ocr(image_path, cls=True)
    detections = []
    if result and result[0]:
        for line in result[0]:
            bbox_raw = line[0] # [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
            text, conf = line[1]
            x = int(bbox_raw[0][0])
            y = int(bbox_raw[0][1])
            w = int(bbox_raw[1][0] - bbox_raw[0][0])
            h = int(bbox_raw[2][1] - bbox_raw[1][1])
            detections.append(Detection(text=text, confidence=conf, bbox=[x, y, w, h]))
    
    all_text = "\n".join([d.text for d in detections])
    avg_conf = np.mean([d.confidence for d in detections]) if detections else 0.0
    return OCRResult(text=all_text, confidence=float(avg_conf), detections=detections)

def _run_easy(image_path: str) -> OCRResult:
    result = easy_reader.readtext(image_path)
    detections = []
    for (bbox_raw, text, conf) in result:
        # bbox_raw is [[x1,y1], [x2,y2], [x3,y3], [x4,y4]]
        x = int(bbox_raw[0][0])
        y = int(bbox_raw[0][1])
        w = int(bbox_raw[1][0] - bbox_raw[0][0])
        h = int(bbox_raw[2][1] - bbox_raw[1][1])
        detections.append(Detection(text=text, confidence=float(conf), bbox=[x, y, w, h]))
    
    all_text = "\n".join([d.text for d in detections])
    avg_conf = np.mean([d.confidence for d in detections]) if detections else 0.0
    return OCRResult(text=all_text, confidence=float(avg_conf), detections=detections)

async def ocr_full(image_path: str) -> OCRResult:
    """Run OCR on the full image."""
    loop = asyncio.get_event_loop()
    if HAS_PADDLE:
        return await loop.run_in_executor(executor, _run_paddle, image_path)
    elif HAS_EASYOCR:
        return await loop.run_in_executor(executor, _run_easy, image_path)
    else:
        raise RuntimeError("No OCR engine available")

async def ocr_region(image_path: str, bbox: List[int]) -> OCRResult:
    """Crop the image to bbox=[x, y, w, h] then run OCR on the crop."""
    x, y, w, h = bbox
    loop = asyncio.get_event_loop()
    
    def _run_crop():
        with Image.open(image_path) as img:
            crop = img.crop((x, y, x + w, y + h))
            crop_path = f"{image_path}_crop.jpg"
            crop.save(crop_path)
            try:
                if HAS_PADDLE:
                    return _run_paddle(crop_path)
                elif HAS_EASYOCR:
                    return _run_easy(crop_path)
                else:
                    raise RuntimeError("No OCR engine available")
            finally:
                if os.path.exists(crop_path):
                    os.remove(crop_path)

    return await loop.run_in_executor(executor, _run_crop)

if __name__ == "__main__":
    # Simple test block
    async def test():
        sample_dir = "../../data/product images"
        if os.path.exists(sample_dir):
            images = [f for f in os.listdir(sample_dir) if f.endswith(".jpg")]
            if images:
                test_image = os.path.join(sample_dir, images[0])
                print(f"Testing ocr_full with {test_image}")
                try:
                    result = await ocr_full(test_image)
                    print(f"Confidence: {result.confidence}")
                    print(f"Text: {result.text[:100]}...")
                except Exception as e:
                    print(f"Test failed: {e}")
            else:
                print("No images found in sample directory.")
        else:
            print(f"Sample directory {sample_dir} not found.")

    asyncio.run(test())
