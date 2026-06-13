"""Deterministic product-data extraction pipeline.

Replaces the previous tool-calling agent (which orchestrated a 9.6 GB reasoning
model and thrashed VRAM swapping between the orchestrator and the vision model).
The pipeline now runs a fixed, predictable sequence with a *single* vision pass
and a *single* OCR pass — only the vision model is ever loaded into Ollama, so
there is no model swapping and far fewer generations per image:

    1. vision_describe  — one call, returns all attributes as JSON
    2. ocr_full         — one OCR pass over the full image
    3. barcode pick     — choose a clean numeric candidate from vision/OCR
    4. lookup_barcode   — one Open Food Facts lookup (if a candidate exists)

Confidence is derived downstream in app/validation/confidence.py from these
signals; this module only gathers them (exactly once each).
"""

import os
import re
import hashlib
import json
from pathlib import Path
from typing import Optional, List
from dataclasses import dataclass
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from app.tools.vision import vision_describe
from app.tools.ocr import ocr_full, OCRResult
from app.tools.barcode_decode import scan_barcodes
from app.tools.barcode_lookup import lookup_barcode
from app.validation.barcode import validate_barcode

load_dotenv()

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
CACHE_DIR = Path("demo_cache")

VISION_PROMPT = (
    "You are a product data extraction specialist. Examine this product "
    "packaging image and extract the attributes below for a product master "
    "database. Respond with ONLY a single JSON object, no prose, using exactly "
    "these keys:\n"
    "{\n"
    '  "barcode": string or null,            // digits only, if a barcode number is legible\n'
    '  "category": string,                   // ALWAYS classify; broad category inferred from the product, e.g. "Beverages", "Personal Care"\n'
    '  "segment": string,                    // ALWAYS classify; narrower sub-category inferred from the product, e.g. "Carbonated Drinks", "Bar Soap"\n'
    '  "manufacturer": string or null,       // the company that makes it (often near "Manufactured by")\n'
    '  "brand": string or null,              // the brand/marque on the front of pack\n'
    '  "product_name": string or null,\n'
    '  "weight": string or null,             // net weight/volume WITH unit, e.g. "500 ml", "100 g"\n'
    '  "packaging": string or null,          // e.g. "Bottle", "Box", "Bar", "Can", "Sachet"\n'
    '  "country_of_origin": string or null,  // e.g. "Ghana", "Made in Nigeria" -> "Nigeria"\n'
    '  "marketing_message": string or null,  // any promotional/marketing claim, e.g. "Now 20% bigger!"\n'
    '  "confidence": {                        // your confidence per field, 0.0-1.0\n'
    '    "barcode": number, "category": number, "segment": number,\n'
    '    "manufacturer": number, "brand": number, "product_name": number,\n'
    '    "weight": number, "packaging": number, "country_of_origin": number,\n'
    '    "marketing_message": number\n'
    "  }\n"
    "}\n"
    "For the printed fields (barcode, manufacturer, brand, product_name, weight, "
    "packaging, country_of_origin, marketing_message) use null for anything not "
    "clearly visible and do not guess. But category and segment are NOT printed "
    "on the pack — you must ALWAYS infer and return them by looking at what the "
    "product clearly is (its type, brand, and use). Never return null for "
    "category or segment."
)

_BARCODE_RE = re.compile(r"\d{8,14}")


class RawSources(BaseModel):
    vision_responses: List[dict] = Field(default_factory=list)
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    barcode_lookup: Optional[dict] = None


class ExtractionResult(BaseModel):
    barcode: Optional[str] = None
    category: Optional[str] = None
    segment: Optional[str] = None
    manufacturer: Optional[str] = None
    brand: Optional[str] = None
    product_name: Optional[str] = None
    weight: Optional[str] = None
    packaging: Optional[str] = None
    country_of_origin: Optional[str] = None
    marketing_message: Optional[str] = None
    # Per-field vision confidence (0-1). Consumed by derive_confidence for the
    # free-text fields. Defaulted to 0.5 so a missing signal never crashes the
    # numeric comparisons downstream.
    barcode_confidence: float = 0.5
    category_confidence: float = 0.5
    segment_confidence: float = 0.5
    manufacturer_confidence: float = 0.5
    brand_confidence: float = 0.5
    product_name_confidence: float = 0.5
    weight_confidence: float = 0.5
    packaging_confidence: float = 0.5
    country_of_origin_confidence: float = 0.5
    marketing_message_confidence: float = 0.5
    sources: RawSources = Field(default_factory=RawSources)


@dataclass
class ExtractionBundle:
    """The signals process_upload needs to derive confidence — gathered once,
    so the upload handler never has to re-run OCR or the barcode lookup."""
    result: ExtractionResult
    ocr: OCRResult
    barcode_lookup: dict


def _digits(s: Optional[str]) -> str:
    return re.sub(r"\D", "", s) if s else ""


def _conf(conf: dict, key: str) -> float:
    """Coerce a per-field confidence to a float in [0, 1], defaulting to 0.5."""
    try:
        v = float(conf.get(key))
    except (TypeError, ValueError):
        return 0.5
    return min(max(v, 0.0), 1.0)


def _pick_barcode(
    scanned: List[str],
    vision_barcode: Optional[str],
    ocr_text: Optional[str],
) -> Optional[str]:
    """Choose the best barcode candidate. A pyzbar-scanned code (read from the
    bar pattern itself) is authoritative, so it comes first; OCR/vision digits
    are only a fallback. Prefer any candidate whose check digit validates."""
    candidates: List[str] = list(scanned or [])
    vb = _digits(vision_barcode)
    if 8 <= len(vb) <= 14:
        candidates.append(vb)
    candidates.extend(_BARCODE_RE.findall(ocr_text or ""))
    for c in candidates:
        if validate_barcode(c).valid:
            return c
    return candidates[0] if candidates else None


def _empty_ocr() -> OCRResult:
    return OCRResult(text="", confidence=0.0, detections=[])


def _demo_extraction(image_path: str) -> ExtractionResult:
    """Deterministic placeholder used in DEMO_MODE when no recorded capture
    exists, so the upload flow completes without a live model backend."""
    suffix = hashlib.md5(Path(image_path).read_bytes()).hexdigest()[:6].upper()
    return ExtractionResult(
        barcode=None,
        category="Beverages",
        segment="Carbonated Drinks",
        manufacturer="Demo Manufacturing Co.",
        brand="Demo Brand",
        product_name=f"Sample Product {suffix}",
        weight="500 ml",
        packaging="Bottle",
        country_of_origin="Ghana",
        marketing_message="Now with 20% more!",
        sources=RawSources(
            vision_responses=[{"note": "DEMO_MODE placeholder — no model call"}],
        ),
    )


async def run_extraction(image_path: str, db: AsyncSession) -> ExtractionBundle:
    # DEMO_MODE: serve a recorded capture if we have one, otherwise a
    # deterministic mock — never touches the live model backend.
    if DEMO_MODE:
        cache_key = hashlib.md5(Path(image_path).read_bytes()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.json"
        if cache_file.exists():
            result = ExtractionResult(**json.loads(cache_file.read_text()))
        else:
            result = _demo_extraction(image_path)
            CACHE_DIR.mkdir(exist_ok=True)
            cache_file.write_text(result.model_dump_json())
        lookup = result.sources.barcode_lookup or {"found": False}
        return ExtractionBundle(result=result, ocr=_empty_ocr(), barcode_lookup=lookup)

    # --- Live deterministic pipeline -------------------------------------- #

    # 1. Single vision pass — all attributes in one JSON response. A hard
    # failure here (model unreachable, wrong model name, repeated bad JSON)
    # means we have essentially no data, so let it propagate: the upload
    # handler marks the product "failed" rather than committing an empty
    # "needs_review" record that looks like a successful extraction.
    vision = await vision_describe(image_path, VISION_PROMPT)

    # 2. Single OCR pass over the full-resolution image.
    ocr = await ocr_full(image_path)

    # 3. Scan the bar pattern directly (authoritative when a barcode is visible).
    scanned = await scan_barcodes(image_path)

    # 4. Barcode: prefer the scanned code, else a check-digit-valid OCR/vision one.
    barcode = _pick_barcode(scanned, vision.get("barcode"), ocr.text)

    # 5. One Open Food Facts lookup, only if we have a candidate.
    barcode_lookup = await lookup_barcode(barcode) if barcode else {"found": False}

    conf = vision.get("confidence") or {}
    result = ExtractionResult(
        barcode=barcode,
        category=vision.get("category"),
        segment=vision.get("segment"),
        manufacturer=vision.get("manufacturer"),
        brand=vision.get("brand"),
        product_name=vision.get("product_name"),
        weight=vision.get("weight"),
        packaging=vision.get("packaging"),
        country_of_origin=vision.get("country_of_origin"),
        marketing_message=vision.get("marketing_message"),
        barcode_confidence=_conf(conf, "barcode"),
        category_confidence=_conf(conf, "category"),
        segment_confidence=_conf(conf, "segment"),
        manufacturer_confidence=_conf(conf, "manufacturer"),
        brand_confidence=_conf(conf, "brand"),
        product_name_confidence=_conf(conf, "product_name"),
        weight_confidence=_conf(conf, "weight"),
        packaging_confidence=_conf(conf, "packaging"),
        country_of_origin_confidence=_conf(conf, "country_of_origin"),
        marketing_message_confidence=_conf(conf, "marketing_message"),
        sources=RawSources(
            vision_responses=[vision] if vision else [],
            ocr_text=ocr.text,
            ocr_confidence=ocr.confidence,
            barcode_lookup=barcode_lookup,
        ),
    )
    return ExtractionBundle(result=result, ocr=ocr, barcode_lookup=barcode_lookup)
