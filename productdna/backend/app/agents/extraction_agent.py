import os
import hashlib
import json
import logging
from pathlib import Path
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext, UsageLimits, PromptedOutput
from dataclasses import dataclass
from sqlalchemy.ext.asyncio import AsyncSession
from dotenv import load_dotenv

from app.tools.vision import vision_describe
from app.tools.ocr import ocr_full, ocr_region, OCRResult
from app.tools.barcode_lookup import lookup_barcode
from app.validation.barcode import validate_barcode
from app.agents.ollama_model import ollama_model

load_dotenv()

DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
CACHE_DIR = Path("demo_cache")
MAX_ITERATIONS = int(os.getenv("MAX_AGENT_ITERATIONS", "6"))
# The extraction agent is the *orchestrator*: it calls tools (vision_describe,
# ocr_*, barcode lookup). It must run on a tool-capable model. The vision model
# (qwen2.5vl) does NOT support tools and is invoked directly inside the
# vision_describe tool (see app/tools/vision.py), not as the agent model.
AGENT_MODEL = os.getenv("AGENT_MODEL", "gemma4:latest")

@dataclass
class ExtractionDeps:
    image_path: str
    db_session: AsyncSession

class RawSources(BaseModel):
    vision_responses: List[dict] = Field(default_factory=list)
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
    # Defaulted so the model only has to return the attribute fields above;
    # the raw tool outputs aren't required from the model itself.
    sources: RawSources = Field(default_factory=RawSources)

extraction_agent = Agent(
    ollama_model(AGENT_MODEL),
    deps_type=ExtractionDeps,
    output_type=PromptedOutput(ExtractionResult),
    retries=3,
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

def _demo_extraction(image_path: str) -> ExtractionResult:
    """Deterministic placeholder used in DEMO_MODE when no real cache capture
    exists, so the upload flow completes without a live model backend."""
    suffix = hashlib.md5(Path(image_path).read_bytes()).hexdigest()[:6].upper()
    return ExtractionResult(
        brand="Demo Brand",
        product_name=f"Sample Product {suffix}",
        weight="500 ml",
        barcode=None,
        category="Beverages",
        packaging="Bottle",
        sources=RawSources(
            vision_responses=[{"note": "DEMO_MODE placeholder — no model call"}],
            ocr_text=None,
            ocr_confidence=None,
            barcode_lookup=None,
        ),
    )


async def run_extraction(image_path: str, db: AsyncSession) -> ExtractionResult:
    # DEMO_MODE: serve a recorded capture if we have one, otherwise a
    # deterministic mock — never touches the live model backend.
    if DEMO_MODE:
        cache_key = hashlib.md5(Path(image_path).read_bytes()).hexdigest()
        cache_file = CACHE_DIR / f"{cache_key}.json"
        if cache_file.exists():
            return ExtractionResult(**json.loads(cache_file.read_text()))
        mock = _demo_extraction(image_path)
        CACHE_DIR.mkdir(exist_ok=True)
        cache_file.write_text(mock.model_dump_json())
        return mock

    # Live extraction via the Ollama-backed agent.
    deps = ExtractionDeps(image_path=image_path, db_session=db)
    result = await extraction_agent.run(
        "Extract all product data from this image.",
        deps=deps,
        usage_limits=UsageLimits(request_limit=MAX_ITERATIONS)
    )
    return result.output
