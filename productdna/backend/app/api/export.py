from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db import get_db
from app.models import Product
import openpyxl
from io import BytesIO
from datetime import datetime

router = APIRouter()

@router.get("/export")
async def export_products(db: AsyncSession = Depends(get_db)):
    query = select(Product).where(Product.status == "approved")
    result = await db.execute(query)
    products = result.scalars().all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Products"

    headers = [
        "id", "brand", "product_name", "weight", "barcode", 
        "category", "packaging", "status", "created_at"
    ]
    ws.append(headers)

    for p in products:
        ws.append([
            p.id, p.brand_value, p.product_name_value, p.weight_value,
            p.barcode_value, p.category_value, p.packaging_value,
            p.status, p.created_at.isoformat()
        ])

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"products_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
