"""In-process extraction progress registry.

Tracks the current pipeline stage per product so the upload UI can show *real*
progress (vision → ocr → barcode → lookup) instead of a hardcoded bar. It's
in-memory and assumes the single uvicorn worker this app runs with; it resets on
restart, where any in-flight rows are failed by recover_stuck_extractions anyway.
"""

from typing import Dict, Optional

# product_id -> current stage label.
_stage: Dict[str, str] = {}

# Ordered stages with a coarse percentage, so the client can render a real bar.
STAGE_PCT = {
    "queued": 5,
    "vision": 30,
    "ocr": 55,
    "barcode": 70,
    "lookup": 85,
    "consolidating": 92,
}


def set_stage(product_id: str, stage: str) -> None:
    _stage[product_id] = stage


def get_stage(product_id: str) -> Optional[str]:
    return _stage.get(product_id)


def clear(product_id: str) -> None:
    _stage.pop(product_id, None)
