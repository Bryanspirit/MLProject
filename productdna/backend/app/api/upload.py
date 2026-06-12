import os
import uuid
import shutil
import logging
from typing import List, Tuple, Dict
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Product, ProductImage
from app.agents.extraction_agent import run_extraction
from app.validation.confidence import derive_confidence
from app.schemas import FieldValue

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}

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
    """Persist an uploaded file under UPLOAD_DIR and return its metadata."""
    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return {
        "id": file_id,
        "filename": filename,
        "path": file_path,
        "url": f"/static/uploads/{filename}",
        "size": os.path.getsize(file_path),
        "mime": file.content_type,
    }


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


async def _mark_failed(product_id: str, db_session: AsyncSession) -> None:
    try:
        product = await db_session.get(Product, product_id)
        if product:
            product.status = "failed"
            await db_session.commit()
    except Exception:
        logging.exception("Could not mark product as failed")


# --------------------------------------------------------------------------- #
# Background tasks
# --------------------------------------------------------------------------- #

async def process_upload(product_id: str, image_path: str, db_session: AsyncSession):
    """Single-image extraction → one product record."""
    try:
        bundle = await run_extraction(image_path, db_session)
        product = await db_session.get(Product, product_id)
        if product:
            _apply_fields(product, _derive_fields(bundle))
            product.status = "needs_review"
            await db_session.commit()
    except Exception as e:
        logging.exception(f"Error processing upload: {e}")
        await _mark_failed(product_id, db_session)


async def process_batch(
    product_id: str,
    images: List[Tuple[str, str]],   # (image_path, image_url)
    db_session: AsyncSession,
):
    """Multi-image batch treated as one product shot from several angles.
    Extracts each image, then consolidates into a single record by taking the
    highest-confidence reading of every field. The primary image is the one
    whose extraction was most confident overall."""
    try:
        best: Dict[str, FieldValue] = {}
        primary_url = images[0][1]
        best_total = -1.0

        for path, url in images:
            bundle = await run_extraction(path, db_session)
            fields = _derive_fields(bundle)
            total = 0.0
            for f, fv in fields.items():
                total += fv.confidence
                if _better(fv, best.get(f)):
                    best[f] = fv
            if total > best_total:
                best_total, primary_url = total, url

        product = await db_session.get(Product, product_id)
        if product:
            _apply_fields(product, best)
            product.image_url = primary_url
            product.status = "needs_review"
            await db_session.commit()
    except Exception as e:
        logging.exception(f"Error processing batch: {e}")
        await _mark_failed(product_id, db_session)


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
    product = Product(
        id=saved["id"],
        image_path=saved["path"],
        image_url=saved["url"],
        status="extracting",
    )
    db.add(product)
    db.add(ProductImage(
        product_id=product.id, filename=saved["filename"],
        file_size=saved["size"], mime_type=saved["mime"],
    ))
    await db.commit()
    await db.refresh(product)

    background_tasks.add_task(process_upload, product.id, saved["path"], db)
    return {"product_id": product.id, "status": "extracting"}


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
            file_size=s["size"], mime_type=s["mime"],
        ))
    await db.commit()
    await db.refresh(product)

    images = [(s["path"], s["url"]) for s in saved]
    background_tasks.add_task(process_batch, product.id, images, db)
    return {"product_id": product.id, "status": "extracting", "image_count": len(saved)}
