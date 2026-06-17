"""Duplicate detection: flag when a newly-extracted product is the same item as
an existing one.

Two signals, cheapest/most-precise first:

  1. Exact barcode — a valid barcode is a unique product key, so an exact match
     is treated as a near-certain duplicate (similarity 1.0).
  2. Semantic text similarity — for products without a (matching) barcode, embed
     a short text key (brand + name + weight + category) with all-MiniLM-L6-v2
     and compare with cosine similarity against existing products.

Matches above the threshold are recorded as pending DuplicateCandidate rows for
a human to merge or keep separate. Detection is best-effort: it must never break
the upload pipeline, so everything is wrapped and failures degrade to "no
candidates" (e.g. if the embedding model can't be loaded offline).
"""

import os
import logging
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Product, DuplicateCandidate
from app.validation.barcode import validate_barcode

DEDUP_THRESHOLD = float(os.getenv("DEDUP_THRESHOLD", "0.85"))

# Statuses that represent a live master record eligible for matching.
_ACTIVE = ("needs_review", "approved")


def _text_key(p: Product) -> str:
    parts = [
        p.brand_value,
        p.product_name_value,
        p.weight_value,
        p.category_value,
        p.segment_value,
    ]
    return " ".join(x for x in parts if x).strip()


async def _pair_exists(db: AsyncSession, a_id: str, b_id: str) -> bool:
    """True if a candidate already links these two products (either direction)."""
    q = select(DuplicateCandidate).where(
        ((DuplicateCandidate.product_a_id == a_id) & (DuplicateCandidate.product_b_id == b_id))
        | ((DuplicateCandidate.product_a_id == b_id) & (DuplicateCandidate.product_b_id == a_id))
    )
    return (await db.execute(q)).first() is not None


async def detect_and_record(
    db: AsyncSession, product_id: str, threshold: float = DEDUP_THRESHOLD
) -> int:
    """Find duplicates of `product_id` among existing active products and record
    pending DuplicateCandidate rows. Returns the count of new candidates."""
    try:
        product = await db.get(Product, product_id)
        if not product:
            return 0

        others = (
            await db.execute(
                select(Product).where(
                    Product.id != product_id, Product.status.in_(_ACTIVE)
                )
            )
        ).scalars().all()
        if not others:
            return 0

        matches: list[tuple[str, float]] = []
        matched_ids: set[str] = set()

        # Tier 1: exact barcode match (authoritative).
        my_barcode = product.barcode_value
        if my_barcode and validate_barcode(my_barcode).valid:
            for o in others:
                if o.barcode_value and o.barcode_value == my_barcode:
                    matches.append((o.id, 1.0))
                    matched_ids.add(o.id)

        # Tier 2: semantic text similarity for everything not already matched.
        my_key = _text_key(product)
        if my_key:
            try:
                from app.dedup.embed import get_embedding
                from app.dedup.similarity import cosine_similarity

                target = get_embedding(my_key)
                for o in others:
                    if o.id in matched_ids:
                        continue
                    key = _text_key(o)
                    if not key:
                        continue
                    sim = cosine_similarity(target, get_embedding(key))
                    if sim >= threshold:
                        matches.append((o.id, float(sim)))
            except Exception:
                logging.exception("Embedding-based dedup unavailable; using barcode only")

        created = 0
        for other_id, sim in matches:
            if await _pair_exists(db, product_id, other_id):
                continue
            db.add(
                DuplicateCandidate(
                    product_a_id=product_id,
                    product_b_id=other_id,
                    similarity=sim,
                    status="pending",
                )
            )
            created += 1

        if created:
            await db.commit()
        return created
    except Exception:
        logging.exception("Duplicate detection failed")
        return 0
