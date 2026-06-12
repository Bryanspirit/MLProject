import os
import uuid
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Product
from app.agents.extraction_agent import run_extraction
from app.validation.confidence import derive_confidence

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")

async def process_upload(product_id: str, image_path: str, db_session: AsyncSession):
    try:
        # 1. Run the deterministic extraction pipeline. The bundle carries the
        #    OCR result and barcode lookup it already computed, so we don't redo
        #    that work here.
        bundle = await run_extraction(image_path, db_session)
        extraction_res = bundle.result

        # 2. Derive confidence for each field from the gathered signals.
        fields = ["brand", "product_name", "weight", "barcode", "category", "packaging"]
        product_data = {}
        vision_dump = extraction_res.model_dump()
        for field in fields:
            fv = derive_confidence(field, vision_dump, bundle.ocr, bundle.barcode_lookup)
            product_data[f"{field}_value"] = fv.value
            product_data[f"{field}_confidence"] = fv.confidence
            product_data[f"{field}_reasoning"] = fv.reasoning
            product_data[f"{field}_source"] = fv.source

        product = await db_session.get(Product, product_id)
        if product:
            for k, v in product_data.items():
                setattr(product, k, v)
            product.status = "needs_review"
            await db_session.commit()

    except Exception as e:
        # Mark the product failed so the UI shows "Failed" instead of spinning
        # on "extracting" forever.
        logging.exception(f"Error processing upload: {e}")
        try:
            product = await db_session.get(Product, product_id)
            if product:
                product.status = "failed"
                await db_session.commit()
        except Exception:
            logging.exception("Could not mark product as failed")

@router.post("/upload")
async def upload_image(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    if file.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type")

    file_id = str(uuid.uuid4())
    filename = f"{file_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    image_url = f"/static/uploads/{filename}"
    
    product = Product(
        id=file_id,
        image_path=file_path,
        image_url=image_url,
        status="extracting"
    )
    db.add(product)
    await db.commit()
    await db.refresh(product)

    background_tasks.add_task(process_upload, product.id, file_path, db)

    return {"product_id": product.id, "status": "extracting"}
