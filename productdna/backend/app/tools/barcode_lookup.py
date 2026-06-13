import httpx
import asyncio
from typing import Dict, Optional, Any, List
from functools import lru_cache


def _clean_off_tag(tag: Optional[str]) -> Optional[str]:
    """Open Food Facts category tags look like 'en:carbonated-drinks'. Strip the
    leading language prefix and turn it into a human-readable label."""
    if not tag:
        return None
    label = tag.split(":", 1)[-1].replace("-", " ").strip()
    return label.title() or None

@lru_cache(maxsize=1000)
def get_cached_barcode(code: str) -> Optional[Dict[str, Any]]:
    # This is a synchronous wrapper for the cache
    # But since httpx calls are async, we'll handle caching differently if needed
    # For now, let's just use a simple dict for async caching
    return None

BARCODE_CACHE = {}

async def lookup_barcode(code: str) -> Dict[str, Any]:
    """
    Look up a barcode in Open Food Facts API.
    URL: https://world.openfoodfacts.org/api/v0/product/{code}.json
    """
    if code in BARCODE_CACHE:
        return BARCODE_CACHE[code]

    url = f"https://world.openfoodfacts.org/api/v0/product/{code}.json"
    
    default_res = {
        "found": False,
        "brand": None,
        "product_name": None,
        "weight": None,
        "category": None,
        "segment": None,
        "packaging": None,
        "manufacturer": None,
        "country_of_origin": None,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1:
                    product = data.get("product", {})
                    # categories_tags is ordered broad -> specific, e.g.
                    # ["en:beverages", "en:carbonated-drinks"]. Use the broadest
                    # as the category and the most specific as the segment.
                    cat_tags: List[str] = product.get("categories_tags") or []
                    category = _clean_off_tag(cat_tags[0]) if cat_tags else None
                    segment = _clean_off_tag(cat_tags[-1]) if len(cat_tags) > 1 else None
                    res = {
                        "found": True,
                        "brand": product.get("brands"),
                        "product_name": product.get("product_name"),
                        "weight": product.get("quantity"),
                        "category": category,
                        "segment": segment,
                        "packaging": product.get("packaging"),
                        # brand_owner is the company behind the brand — the best
                        # manufacturer proxy OFF exposes.
                        "manufacturer": product.get("brand_owner"),
                        # origins = stated origin of the product/ingredients;
                        # fall back to where it was manufactured.
                        "country_of_origin": product.get("origins")
                        or product.get("manufacturing_places"),
                    }
                    BARCODE_CACHE[code] = res
                    return res
    except Exception:
        # Never raises as per instructions
        pass

    return default_res

if __name__ == "__main__":
    async def test():
        # Test with Coca-Cola barcode
        code = "5449000054494"
        print(f"Testing lookup_barcode with {code}")
        result = await lookup_barcode(code)
        print(result)

    asyncio.run(test())
