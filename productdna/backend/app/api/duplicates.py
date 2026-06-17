from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models import DuplicateCandidate, Product
from app.schemas import DuplicateCandidateResponse, ProductResponse
from app.api.products import model_to_response, EDITABLE_FIELDS

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

@router.get("/products/{product_id}/duplicates")
async def product_duplicates(product_id: str, db: AsyncSession = Depends(get_db)):
    """Pending duplicate candidates that involve this product, each with the
    *other* product in the pair — so the review screen can warn inline instead of
    making the reviewer check the Duplicates page separately."""
    q = select(DuplicateCandidate).where(
        DuplicateCandidate.status == "pending",
        (DuplicateCandidate.product_a_id == product_id)
        | (DuplicateCandidate.product_b_id == product_id),
    )
    candidates = (await db.execute(q)).scalars().all()

    out = []
    for c in candidates:
        other_id = c.product_b_id if c.product_a_id == product_id else c.product_a_id
        other = await db.get(Product, other_id)
        if other and other.status != "merged":
            out.append({
                "candidate_id": c.id,
                "other": model_to_response(other),
                "similarity": c.similarity,
            })
    return out


@router.post("/duplicates/{candidate_id}/merge")
async def merge_duplicate(
    candidate_id: str,
    winner_fields: dict = Body(default={}),
    db: AsyncSession = Depends(get_db),
):
    """Merge the pair into product A and retire product B.

    For each attribute, keep the higher-confidence reading of the two (so the
    survivor is the best of both). `winner_fields` may override per field with
    "a"/"b". Product B is marked "merged" so it drops out of the master list."""
    candidate = await db.get(DuplicateCandidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")

    a = await db.get(Product, candidate.product_a_id)
    b = await db.get(Product, candidate.product_b_id)
    if a and b:
        for f in EDITABLE_FIELDS:
            override = winner_fields.get(f)
            a_conf = getattr(a, f"{f}_confidence") or 0.0
            b_conf = getattr(b, f"{f}_confidence") or 0.0
            take_b = override == "b" or (override is None and b_conf > a_conf)
            if take_b:
                for suffix in ("value", "confidence", "reasoning", "source"):
                    setattr(a, f"{f}_{suffix}", getattr(b, f"{f}_{suffix}"))
        b.status = "merged"

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
