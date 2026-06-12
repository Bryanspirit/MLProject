import httpx
import asyncio
from typing import Dict, Optional, Any
from functools import lru_cache

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
        "packaging": None,
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1:
                    product = data.get("product", {})
                    res = {
                        "found": True,
                        "brand": product.get("brands"),
                        "product_name": product.get("product_name"),
                        "weight": product.get("quantity"),
                        "category": product.get("categories_tags", [None])[0],
                        "packaging": product.get("packaging"),
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
