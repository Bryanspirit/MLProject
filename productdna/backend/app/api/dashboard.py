from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_db
from app.models import Product

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    processed_res = await db.execute(select(func.count(Product.id)))
    needs_review_res = await db.execute(select(func.count(Product.id)).where(Product.status == "needs_review"))
    
    processed = processed_res.scalar() or 0
    needs_review = needs_review_res.scalar() or 0

    # Note: Duplicates and avg_confidence are hardcoded for now as in the original UI
    return [
        {
            "label": "PRODUCTS PROCESSED",
            "value": str(processed),
            "badge": "+12%", # Placeholder
            "badgeColor": "bg-indigo-100 text-indigo-600",
            "highlight": False,
        },
        {
            "label": "AVG CONFIDENCE",
            "value": "92%", # Placeholder
            "badge": "+2%", # Placeholder
            "badgeColor": "bg-indigo-100 text-indigo-600",
            "highlight": False,
        },
        {
            "label": "DUPLICATES PENDING",
            "value": "14", # Placeholder
            "badge": None,
            "highlight": False,
        },
        {
            "label": "NEEDS REVIEW",
            "value": str(needs_review),
            "badge": None,
            "highlight": True,
        },
    ]

@router.get("/extractions")
async def get_recent_extractions(db: AsyncSession = Depends(get_db)):
    query = select(Product).order_by(Product.created_at.desc()).limit(5)
    result = await db.execute(query)
    products = result.scalars().all()

    # Simple mapping for now, can be expanded
    def get_status_string(status: str) -> str:
        if status == "needs_review":
            return "Needs Review"
        elif status == "approved":
            return "Approved"
        return "Pending"
        
    def get_confidence(p: Product) -> int:
        # A simple average of available confidences
        confidences = [
            p.brand_confidence,
            p.product_name_confidence,
            p.weight_confidence,
            p.barcode_confidence
        ]
        confidences = [c for c in confidences if c is not None]
        return int(sum(confidences) / len(confidences)) if confidences else 0

    return [
        {
            "image": "👟", # Placeholder, as image is not in the model
            "brand": p.brand_value,
            "productName": p.product_name_value,
            "confidence": get_confidence(p),
            "status": get_status_string(p.status),
            "timestamp": p.created_at.strftime("%I:%M %p"),
        }
        for p in products
    ]