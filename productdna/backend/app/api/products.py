from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List, Optional
from app.db import get_db
from app.models import Product, AgentTrace
from app.schemas import ProductResponse, FieldValue, StatsResponse
import json

router = APIRouter()

def model_to_response(p: Product) -> ProductResponse:
    def get_field(name: str):
        val = getattr(p, f"{name}_value")
        conf = getattr(p, f"{name}_confidence")
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
        brand=get_field("brand"),
        product_name=get_field("product_name"),
        weight=get_field("weight"),
        barcode=get_field("barcode"),
        category=get_field("category"),
        packaging=get_field("packaging"),
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

@router.get("/stats", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # Simple stats for now
    total = await db.execute(select(func.count(Product.id)))
    processed = total.scalar() or 0
    
    needs_review_res = await db.execute(select(func.count(Product.id)).where(Product.status == "needs_review"))
    needs_review = needs_review_res.scalar() or 0
    
    return StatsResponse(
        products_processed=processed,
        avg_confidence=85.0, # Placeholder
        duplicates_pending=0, # Placeholder
        needs_review=needs_review
    )
