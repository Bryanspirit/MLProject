from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db import get_db
from app.models import Product, DuplicateCandidate

router = APIRouter()

# The 10 IMDB attribute confidences that make up a product's overall score.
_CONF_FIELDS = [
    "barcode", "category", "segment", "manufacturer", "brand",
    "product_name", "weight", "packaging", "country_of_origin",
    "marketing_message",
]


def _overall_confidence(p: Product) -> float:
    confs = [getattr(p, f"{f}_confidence") or 0.0 for f in _CONF_FIELDS]
    return sum(confs) / len(confs) if confs else 0.0


@router.get("/stats")
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)):
    """Real dashboard KPIs derived from the data (no placeholders)."""
    products = (await db.execute(select(Product))).scalars().all()
    total = len(products)

    by_status: dict[str, int] = {}
    for p in products:
        by_status[p.status] = by_status.get(p.status, 0) + 1

    # Average confidence only over products that actually finished extracting —
    # excluding in-flight/failed records keeps the number meaningful.
    scored = [p for p in products if p.status not in ("extracting", "failed")]
    avg_conf = round(sum(_overall_confidence(p) for p in scored) / len(scored), 1) if scored else 0.0

    dup_pending = (
        await db.execute(
            select(func.count(DuplicateCandidate.id)).where(
                DuplicateCandidate.status == "pending"
            )
        )
    ).scalar() or 0

    return {
        "products_processed": total,
        "avg_confidence": avg_conf,
        "duplicates_pending": dup_pending,
        "needs_review": by_status.get("needs_review", 0),
        "approved": by_status.get("approved", 0),
        "failed": by_status.get("failed", 0),
        "extracting": by_status.get("extracting", 0),
    }

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