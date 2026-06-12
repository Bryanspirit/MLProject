from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models import DuplicateCandidate, Product
from app.schemas import DuplicateCandidateResponse, ProductResponse
from app.api.products import model_to_response

router = APIRouter()

@router.get("/duplicates", response_model=List[DuplicateCandidateResponse])
async def list_duplicates(db: AsyncSession = Depends(get_db)):
    query = select(DuplicateCandidate).where(DuplicateCandidate.status == "pending")
    result = await db.execute(query)
    candidates = result.scalars().all()
    
    response = []
    for c in candidates:
        product_a = await db.get(Product, c.product_a_id)
        product_b = await db.get(Product, c.product_b_id)
        if product_a and product_b:
            response.append(DuplicateCandidateResponse(
                id=c.id,
                product_a=model_to_response(product_a),
                product_b=model_to_response(product_b),
                similarity=c.similarity,
                status=c.status
            ))
    return response

@router.post("/duplicates/{candidate_id}/merge")
async def merge_duplicate(candidate_id: str, winner_fields: dict, db: AsyncSession = Depends(get_db)):
    candidate = await db.get(DuplicateCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    # Implementation of merge logic would go here
    candidate.status = "merged"
    await db.commit()
    return {"status": "merged"}

@router.post("/duplicates/{candidate_id}/separate")
async def separate_duplicate(candidate_id: str, db: AsyncSession = Depends(get_db)):
    candidate = await db.get(DuplicateCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    candidate.status = "kept_separate"
    await db.commit()
    return {"status": "kept_separate"}
