from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.db import get_db
from app.models import Product, AgentTrace
from app.schemas import ProductResponse, FieldValue, StatsResponse, ProductUpdate
import json

router = APIRouter()

# The 10 IMDB attributes a reviewer may edit, plus the statuses they may set.
EDITABLE_FIELDS = {
    "barcode", "category", "segment", "manufacturer", "brand",
    "product_name", "weight", "packaging", "country_of_origin",
    "marketing_message",
}
ALLOWED_STATUSES = {"needs_review", "approved"}

def model_to_response(p: Product) -> ProductResponse:
    def get_field(name: str):
        val = getattr(p, f"{name}_value")
        # Legacy rows (created before a column existed) can have NULL confidence.
        conf = getattr(p, f"{name}_confidence") or 0.0
        reason = getattr(p, f"{name}_reasoning")
        src = getattr(p, f"{name}_source")

        level = "missing"
        if conf >= 85: level = "high"
        elif conf >= 60: level = "medium"
        elif val: level = "low"

        return FieldValue(
            value=val,
            confidence=conf,
            confidence_level=level,
            reasoning=reason or "",
            source=src or "vision"
        )

    return ProductResponse(
        id=p.id,
        image_url=p.image_url,
        barcode=get_field("barcode"),
        category=get_field("category"),
        segment=get_field("segment"),
        manufacturer=get_field("manufacturer"),
        brand=get_field("brand"),
        product_name=get_field("product_name"),
        weight=get_field("weight"),
        packaging=get_field("packaging"),
        country_of_origin=get_field("country_of_origin"),
        marketing_message=get_field("marketing_message"),
        status=p.status,
        created_at=p.created_at.isoformat(),
        updated_at=p.updated_at.isoformat()
    )

@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    query = select(Product)
    if status:
        query = query.where(Product.status == status)
    else:
        # Records absorbed into another via merge are no longer master records.
        query = query.where(Product.status != "merged")
    if search:
        query = query.where(Product.product_name_value.contains(search) | Product.brand_value.contains(search))
    
    result = await db.execute(query)
    products = result.scalars().all()
    return [model_to_response(p) for p in products]

@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)):
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return model_to_response(product)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: str,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Apply reviewer edits and/or a status change. Edited fields become
    source="manual" at 100% confidence (a human verified them); empty values
    clear the field."""
    product = await db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    unknown = set(payload.fields) - EDITABLE_FIELDS
    if unknown:
        raise HTTPException(status_code=400, detail=f"Unknown field(s): {', '.join(sorted(unknown))}")
    if payload.status is not None and payload.status not in ALLOWED_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status: {payload.status}")

    for field, raw in payload.fields.items():
        value = (raw or "").strip() or None
        setattr(product, f"{field}_value", value)
        setattr(product, f"{field}_source", "manual")
        setattr(product, f"{field}_confidence", 100.0 if value else 0.0)
        setattr(product, f"{field}_reasoning", "Edited by reviewer")

    if payload.status is not None:
        product.status = payload.status

    await db.commit()
    await db.refresh(product)
    return model_to_response(product)

# Removed @router.get("/stats") as it is now handled by the dashboard router
