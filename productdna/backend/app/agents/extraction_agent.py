import os
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional, List, Any
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext, UsageLimits
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from app.tools.vision import vision_describe
from app.tools.ocr import ocr_full, ocr_region, OCRResult
from app.tools.barcode_lookup import lookup_barcode
from app.validation.barcode import validate_barcode

load_dotenv()

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
CACHE_DIR = Path("demo_cache")
MAX_ITERATIONS = int(os.getenv("MAX_AGENT_ITERATIONS", "6"))
VISION_MODEL = os.getenv("VISION_MODEL", "qwen2.5-vl:7b")

@dataclass
class ExtractionDeps:
    image_path: str
    db_session: AsyncSession

class RawSources(BaseModel):
    vision_responses: List[dict]
    ocr_text: Optional[str] = None
    ocr_confidence: Optional[float] = None
    barcode_lookup: Optional[dict] = None

class ExtractionResult(BaseModel):
    brand: Optional[str] = None
    product_name: Optional[str] = None
    weight: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    packaging: Optional[str] = None
    sources: RawSources

extraction_agent = Agent(
    f"ollama:{VISION_MODEL}",
    deps_type=ExtractionDeps,
    output_type=ExtractionResult,
    system_prompt=(
        "You are a product data extraction specialist. Your job is to extract "
        "accurate product attributes from product packaging images.\n\n"
        "Available tools:\n"
        "- vision_describe: ask targeted questions about the image\n"
        "- ocr_full: extract all text from the image\n"
        "- ocr_region: extract text from a specific region (use for barcodes)\n"
        "- lookup_barcode: verify a barcode against Open Food Facts\n"
        "- validate_barcode: check if a barcode has a valid check digit\n\n"
        "Strategy:\n"
        "1. Start with vision_describe to get an overview of the product\n"
        "2. Run ocr_full to capture all visible text\n"
        "3. If a barcode is visible but uncertain, use ocr_region on that area\n"
        "4. Always call lookup_barcode if you have a candidate barcode\n"
        "5. Return all fields you can extract — use null for genuinely missing data\n"
        "6. Do not guess. If you cannot find a field, return null.\n\n"
        "Be efficient."
    )
)

@extraction_agent.tool
async def tool_vision_describe(ctx: RunContext[ExtractionDeps], question: str) -> dict:
    """Ask the vision model a targeted question about the product image."""
    return await vision_describe(ctx.deps.image_path, question)

@extraction_agent.tool
async def tool_ocr_full(ctx: RunContext[ExtractionDeps]) -> dict:
    """Extract all text from the image using OCR."""
    res = await ocr_full(ctx.deps.image_path)
    return {"text": res.text, "confidence": res.confidence}

@extraction_agent.tool
async def tool_ocr_region(ctx: RunContext[ExtractionDeps], x: int, y: int, w: int, h: int) -> dict:
    """Extract text from a specific region of the image."""
    res = await ocr_region(ctx.deps.image_path, [x, y, w, h])
    return {"text": res.text, "confidence": res.confidence}

@extraction_agent.tool
async def tool_lookup_barcode(ctx: RunContext[ExtractionDeps], code: str) -> dict:
    """Verify a barcode against Open Food Facts."""
    return await lookup_barcode(code)

@extraction_agent.tool
async def tool_validate_barcode(ctx: RunContext[ExtractionDeps], code: str) -> dict:
    """Check if a barcode has a valid check digit."""
    res = validate_barcode(code)
    return {"valid": res.valid, "format": res.format, "reason": res.reason}

async def run_extraction(image_path: str, db: AsyncSession) -> ExtractionResult:
    if DEMO_MODE:
        cache_key = hashlib.md5(Path(image_path).read_bytes()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.json"
        if cache_file.exists():
            return ExtractionResult(**json.loads(cache_file.read_text()))
    
    deps = ExtractionDeps(image_path=image_path, db_session=db)
    result = await extraction_agent.run(
        "Extract all product data from this image.",
        deps=deps,
        usage_limits=UsageLimits(request_limit=MAX_ITERATIONS)
    )
    
    output = result.data
    
    if DEMO_MODE:
        CACHE_DIR.mkdir(exist_ok=True)
        cache_key = hashlib.md5(Path(image_path).read_bytes()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.json"
        cache_file.write_text(output.model_dump_json())
    
    return output
