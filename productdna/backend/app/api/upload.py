import os
import uuid
import shutil
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.models import Product
from app.agents.extraction_agent import run_extraction
from app.validation.confidence import derive_confidence
from app.agents.trace import persist_trace
from app.tools.ocr import ocr_full
from app.tools.barcode_lookup import lookup_barcode

router = APIRouter()

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")

async def process_upload(product_id: str, image_path: str, db_session: AsyncSession):
    try:
        # 1. Run extraction_agent
        # Note: we need a new session or be careful with the background one
        # For simplicity in this hackathon, we'll assume the session is usable
        
        extraction_res = await run_extraction(image_path, db_session)
        
        # 2. Get additional signals for confidence derivation
        ocr_res = await ocr_full(image_path)
        barcode_lookup = await lookup_barcode(extraction_res.barcode) if extraction_res.barcode else {"found": False}
        
        # 3. Derive confidence for each field
        fields = ["brand", "product_name", "weight", "barcode", "category", "packaging"]
        product_data = {}
        for field in fields:
            fv = derive_confidence(field, extraction_res.model_dump(), ocr_res, barcode_lookup)
            product_data[f"{field}_value"] = fv.value
            product_data[f"{field}_confidence"] = fv.confidence
            product_data[f"{field}_reasoning"] = fv.reasoning
            product_data[f"{field}_source"] = fv.source

        # Update product
        product = await db_session.get(Product, product_id)
        if product:
            for k, v in product_data.items():
                setattr(product, k, v)
            product.status = "needs_review"
            await db_session.commit()
            
            # 4. Traces (Optional for now but good to have)
            # await persist_trace(product_id, "extraction", extraction_res_obj, db_session)
        
    except Exception as e:
        import logging
        logging.exception(f"Error processing upload: {e}")

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
