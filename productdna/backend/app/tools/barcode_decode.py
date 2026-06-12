"""Decode barcodes directly from the bar pattern (not the printed digits).

Unlike OCR/vision, which guess at the small printed number under a barcode,
pyzbar reads the black-and-white bars themselves — the same thing a checkout
scanner does — and includes the format's built-in error checking. When a
barcode is visible and in focus this is essentially exact; when it isn't,
nothing is returned and callers fall back to OCR/vision.

The pyzbar import is guarded so a missing native zbar library degrades to a
no-op rather than breaking the extraction pipeline.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import List
from PIL import Image

try:
    from pyzbar.pyzbar import decode as _zbar_decode
    HAS_PYZBAR = True
except Exception:  # pragma: no cover - depends on native zbar being present
    HAS_PYZBAR = False
    logging.warning("pyzbar/zbar not available — barcode scanning disabled")

_executor = ThreadPoolExecutor(max_workers=2)


def _scan(image_path: str) -> List[str]:
    if not HAS_PYZBAR:
        return []
    try:
        with Image.open(image_path) as img:
            results = _zbar_decode(img)
    except Exception:
        logging.exception("pyzbar decode failed")
        return []

    codes: List[str] = []
    for r in results:
        code = (r.data or b"").decode("utf-8", errors="ignore").strip()
        # Keep numeric retail barcodes (EAN-8/13, UPC-A/E); ignore QR/other.
        if code.isdigit() and code not in codes:
            codes.append(code)
    return codes


async def scan_barcodes(image_path: str) -> List[str]:
    """Return any numeric barcodes decoded from the image (most reliable first)."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(_executor, _scan, image_path)
