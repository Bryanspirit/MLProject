import os
import uuid
import json
import hashlib
import asyncio
import logging
from typing import List, Tuple, Dict, Optional
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db, AsyncSessionLocal
from app.models import Product, ProductImage
from app.agents.extraction_agent import run_extraction
from app.validation.confidence import derive_confidence
from app.dedup.detect import detect_and_record
from app.schemas import FieldValue
from app import progress

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

# Cap concurrent extractions so a large drop of images doesn't fire dozens of
# simultaneous vision passes at Ollama (VRAM thrash / timeouts). Background tasks
# share this semaphore process-wide; raise MAX_CONCURRENT_EXTRACTIONS if the
# model backend can handle more in parallel.
_MAX_CONCURRENT = max(1, int(os.getenv("MAX_CONCURRENT_EXTRACTIONS", "2")))
_extraction_slot = asyncio.Semaphore(_MAX_CONCURRENT)

# Auto-approve extractions whose average attribute confidence (0-100) clears this
# threshold, so reviewers only see the uncertain ones. Disabled by default (0):
# set AUTO_APPROVE_THRESHOLD (e.g. 90) to enable. Null fields count as 0, so a
# record missing several attributes won't auto-approve.
_AUTO_APPROVE_THRESHOLD = float(os.getenv("AUTO_APPROVE_THRESHOLD", "0"))

# The 10 IMDB product-master attributes, in master order.
IMDB_FIELDS = [
    "barcode", "category", "segment", "manufacturer", "brand",
    "product_name", "weight", "packaging", "country_of_origin",
    "marketing_message",
]


# --------------------------------------------------------------------------- #
# Shared helpers
# --------------------------------------------------------------------------- #

def _save_file(file: UploadFile) -> Dict[str, object]:
    """Persist an uploaded file under UPLOAD_DIR and return its metadata,
    including a sha256 of the bytes so exact-duplicate uploads can be detected."""
    content = file.file.read()
    sha256 = hashlib.sha256(content).hexdigest()
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        buffer.write(content)
    return {
        "id": file_id,
        "filename": filename,
        "path": file_path,
        "url": f"/static/uploads/{filename}",
        "size": len(content),
        "mime": file.content_type,
        "sha256": sha256,
    }


async def _product_for_hash(db: AsyncSession, sha256: str) -> Optional[str]:
    """Return the id of an existing (non-merged) product whose image bytes match
    this hash, or None. Lets an identical re-upload reuse the prior record
    instead of creating a duplicate."""
    rows = (
        await db.execute(
            select(ProductImage.product_id)
            .where(ProductImage.sha256 == sha256)
        )
    ).scalars().all()
    for pid in rows:
        product = await db.get(Product, pid)
        if product and product.status != "merged":
            return pid
    return None


def _decide_status(fields: Dict[str, FieldValue]) -> str:
    """'needs_review' by default; 'approved' only when auto-approve is enabled
    and the mean attribute confidence clears AUTO_APPROVE_THRESHOLD."""
    if _AUTO_APPROVE_THRESHOLD <= 0:
        return "needs_review"
    confs = [fv.confidence for fv in fields.values()]
    avg = sum(confs) / len(confs) if confs else 0.0
    return "approved" if avg >= _AUTO_APPROVE_THRESHOLD else "needs_review"


def _derive_fields(bundle) -> Dict[str, FieldValue]:
    """Derive a FieldValue for every IMDB attribute from one extraction bundle."""
    dump = bundle.result.model_dump()
    return {
        f: derive_confidence(f, dump, bundle.ocr, bundle.barcode_lookup)
        for f in IMDB_FIELDS
    }


def _apply_fields(product: Product, fields: Dict[str, FieldValue]) -> None:
    for f, fv in fields.items():
        setattr(product, f"{f}_value", fv.value)
        setattr(product, f"{f}_confidence", fv.confidence)
        setattr(product, f"{f}_reasoning", fv.reasoning)
        setattr(product, f"{f}_source", fv.source)


def _better(candidate: FieldValue, current: FieldValue) -> bool:
    """Is `candidate` a better reading of a field than `current`? Higher
    confidence wins; at a tie, a non-null value beats a null one."""
    if current is None:
        return True
    if candidate.confidence != current.confidence:
        return candidate.confidence > current.confidence
    return bool(candidate.value) and not current.value


async def _mark_failed(product_id: str) -> None:
    # Opens its own session: the caller's session may already be in a failed
    # transaction state after the exception that triggered this.
    try:
        async with AsyncSessionLocal() as db_session:
            product = await db_session.get(Product, product_id)
            if product:
                product.status = "failed"
                await db_session.commit()
    except Exception:
        logging.exception("Could not mark product %s as failed", product_id)


# --------------------------------------------------------------------------- #
# Background tasks
# --------------------------------------------------------------------------- #

async def process_upload(product_id: str, image_path: str):
    """Single-image extraction → one product record. Runs as a background task
    AFTER the HTTP response has returned, so it must NOT reuse the request's DB
    session (FastAPI has already closed it). It opens its own session for the
    writes and runs the extraction under the concurrency semaphore."""
    try:
        progress.set_stage(product_id, "queued")
        async with _extraction_slot:
            bundle = await run_extraction(
                image_path, on_stage=lambda s: progress.set_stage(product_id, s)
            )
        async with AsyncSessionLocal() as db_session:
            product = await db_session.get(Product, product_id)
            if product:
                fields = _derive_fields(bundle)
                _apply_fields(product, fields)
                product.status = _decide_status(fields)
                await db_session.commit()
                # Flag potential duplicates of this new product (best-effort).
                await detect_and_record(db_session, product_id)
    except Exception:
        logging.exception("Error processing upload for %s", product_id)
        await _mark_failed(product_id)
    finally:
        progress.clear(product_id)


async def process_batch(
    product_id: str,
    images: List[Tuple[str, str]],   # (image_path, image_url)
):
    """Multi-image batch treated as one product shot from several angles.
    Extracts each image, then consolidates into a single record by taking the
    highest-confidence reading of every field. The primary image is the one
    whose extraction was most confident overall. Runs as a background task, so
    it opens its own DB session rather than reusing the (closed) request one."""
    try:
        progress.set_stage(product_id, "queued")
        best: Dict[str, FieldValue] = {}
        primary_url = images[0][1]
        best_total = -1.0
        succeeded = 0

        for path, url in images:
            # One bad angle (e.g. an unreadable image) shouldn't doom the whole
            # set — skip it and consolidate from the angles that did extract.
            try:
                async with _extraction_slot:
                    bundle = await run_extraction(
                        path, on_stage=lambda s: progress.set_stage(product_id, s)
                    )
            except Exception:
                logging.exception(f"Skipping image that failed extraction: {path}")
                continue
            succeeded += 1
            fields = _derive_fields(bundle)
            total = 0.0
            for f, fv in fields.items():
                total += fv.confidence
                if _better(fv, best.get(f)):
                    best[f] = fv
            if total > best_total:
                best_total, primary_url = total, url

        if succeeded == 0:
            await _mark_failed(product_id)
            return

        progress.set_stage(product_id, "consolidating")
        async with AsyncSessionLocal() as db_session:
            product = await db_session.get(Product, product_id)
            if product:
                _apply_fields(product, best)
                product.image_url = primary_url
                product.status = _decide_status(best)
                await db_session.commit()
                # Flag potential duplicates of this consolidated product.
                await detect_and_record(db_session, product_id)
    except Exception:
        logging.exception("Error processing batch for %s", product_id)
        await _mark_failed(product_id)
    finally:
        progress.clear(product_id)


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #

@router.post("/upload")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Invalid file type")

    saved = _save_file(file)

    # If this exact image was uploaded before, reuse the existing product rather
    # than creating a duplicate (and re-running extraction). Drop the redundant
    # copy we just wrote.
    existing_id = await _product_for_hash(db, saved["sha256"])
    if existing_id:
        try:
            os.remove(saved["path"])
        except OSError:
            pass
        existing = await db.get(Product, existing_id)
        return {"product_id": existing_id, "status": existing.status, "duplicate": True}

    product = Product(
        id=saved["id"],
        image_path=saved["path"],
        image_url=saved["url"],
        status="extracting",
    )
    db.add(product)
    db.add(ProductImage(
        product_id=product.id, filename=saved["filename"],
        file_size=saved["size"], mime_type=saved["mime"], sha256=saved["sha256"],
    ))
    await db.commit()
    await db.refresh(product)

    background_tasks.add_task(process_upload, product.id, saved["path"])
    return {"product_id": product.id, "status": "extracting", "duplicate": False}


@router.post("/upload/batch")
async def upload_batch(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Upload several images of the SAME product (multiple angles) and merge
    them into one consolidated record."""
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")
    for f in files:
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Invalid file type: {f.filename}")

    saved = [_save_file(f) for f in files]
    product = Product(
        id=str(uuid.uuid4()),
        image_path=saved[0]["path"],
        image_url=saved[0]["url"],
        status="extracting",
    )
    db.add(product)
    for s in saved:
        db.add(ProductImage(
            product_id=product.id, filename=s["filename"],
            file_size=s["size"], mime_type=s["mime"], sha256=s["sha256"],
        ))
    await db.commit()
    await db.refresh(product)

    images = [(s["path"], s["url"]) for s in saved]
    background_tasks.add_task(process_batch, product.id, images)
    return {"product_id": product.id, "status": "extracting", "image_count": len(saved)}


@router.post("/products/{product_id}/retry")
async def retry_extraction(
    product_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Re-run extraction for a product whose previous attempt failed (e.g. a
    transient model-backend hiccup), reusing the already-stored image(s) — no
    re-upload needed."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.status != "failed":
        raise HTTPException(
            status_code=400, detail="Only failed products can be retried"
        )

    rows = (
        await db.execute(
            select(ProductImage)
            .where(ProductImage.product_id == product_id)
            .order_by(ProductImage.created_at)
        )
    ).scalars().all()

    product.status = "extracting"
    await db.commit()

    if len(rows) > 1:
        images = [
            (os.path.join(UPLOAD_DIR, r.filename), f"/static/uploads/{r.filename}")
            for r in rows
        ]
        background_tasks.add_task(process_batch, product_id, images)
    else:
        path = (
            os.path.join(UPLOAD_DIR, rows[0].filename) if rows else product.image_path
        )
        background_tasks.add_task(process_upload, product_id, path)

    return {"product_id": product_id, "status": "extracting"}


@router.get("/products/{product_id}/events")
async def product_events(product_id: str):
    """Server-Sent Events stream of a product's extraction progress. Emits the
    current {status, stage} whenever it changes and closes once the product
    reaches a terminal status (needs_review / approved / failed). The UI uses
    this instead of polling so the progress bar reflects the real pipeline stage."""

    async def gen():
        last = None
        # Safety cap (~15 min at 1s) so a connection never streams forever.
        for _ in range(900):
            async with AsyncSessionLocal() as db:
                product = await db.get(Product, product_id)
            if not product:
                yield f"data: {json.dumps({'error': 'not_found'})}\n\n"
                return
            payload = {"status": product.status, "stage": progress.get_stage(product_id)}
            if payload != last:
                yield f"data: {json.dumps(payload)}\n\n"
                last = payload
            if product.status in ("needs_review", "approved", "failed"):
                return
            await asyncio.sleep(1)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
