import re
from typing import Dict, Optional, Any
from app.schemas import FieldValue
from app.tools.ocr import OCRResult
from app.validation.barcode import validate_barcode

def normalize_text(text: str) -> str:
    if not text:
        return ""
    return re.sub(r'[^a-z0-9]', '', text.lower())

def derive_confidence(
    field: str,
    vision_result: Dict[str, Any],
    ocr_result: Optional[OCRResult] = None,
    barcode_lookup: Optional[Dict[str, Any]] = None,
) -> FieldValue:
    """
    Derive confidence from real signals, not from asking the LLM.
    """
    vision_val = vision_result.get(field)
    vision_conf = vision_result.get(f"{field}_confidence", 0.5)
    
    # Defaults
    res_val = vision_val
    res_conf = 0.0
    res_level = "missing"
    res_reasoning = ""
    res_source = "vision"

    if field == "barcode":
        code = vision_val
        val_res = validate_barcode(code) if code else None
        lookup_found = barcode_lookup.get("found", False) if barcode_lookup else False
        
        if lookup_found and val_res and val_res.valid:
            res_conf = 97.0
            res_level = "high"
            res_reasoning = "Barcode validated by check digit and verified in Open Food Facts"
            res_source = "barcode_lookup"
        elif val_res and val_res.valid:
            res_conf = 82.0
            res_level = "high"
            res_reasoning = "Barcode check digit valid"
            res_source = "vision"
        elif val_res and not val_res.valid:
            res_conf = 15.0
            res_level = "low"
            res_reasoning = f"Barcode check digit failed: {val_res.reason}"
            res_source = "vision"
        else:
            res_conf = 0.0
            res_level = "missing"
            res_reasoning = "No barcode found"
            res_source = "vision"

    elif field == "brand":
        v_brand = normalize_text(vision_val)
        ocr_text = normalize_text(ocr_result.text) if ocr_result else ""
        agree = ocr_text and v_brand and v_brand in ocr_text
        
        lookup_brand = normalize_text(barcode_lookup.get("brand")) if barcode_lookup and barcode_lookup.get("found") else ""
        lookup_confirms = lookup_brand and v_brand and v_brand in lookup_brand

        if agree:
            res_conf = 94.0
            res_level = "high"
            res_reasoning = "Vision model and OCR text agree on brand"
        elif ocr_text or vision_val:
            res_conf = 55.0
            res_level = "medium"
            res_reasoning = f"Vision says '{vision_val}', but OCR text disagreement — reconciliation needed"
        else:
            res_conf = 45.0
            res_level = "low"
            res_reasoning = "Limited sources for brand verification"

        if lookup_confirms:
            res_conf += 3.0
            res_reasoning += " — confirmed by barcode lookup"
            res_source = "barcode_lookup"

    elif field == "weight":
        weight_pattern = r'\d+(\.\d+)?\s?(ml|l|g|kg|oz|lb)'
        if vision_val and re.search(weight_pattern, str(vision_val), re.IGNORECASE):
            res_conf = 88.0
            res_level = "high"
            res_reasoning = "Weight format valid"
        else:
            res_conf = 45.0
            res_level = "medium"
            res_reasoning = f"Weight value '{vision_val}' does not match expected format"

    elif field in ("manufacturer", "country_of_origin", "category", "segment"):
        label = field.replace("_", " ")
        lookup_val = (
            barcode_lookup.get(field)
            if barcode_lookup and barcode_lookup.get("found")
            else None
        )
        if vision_val:
            # Vision inferred/read the value; the lookup confirms or just scores.
            agree = bool(lookup_val) and normalize_text(vision_val) in normalize_text(lookup_val)
            if agree:
                res_conf = 92.0
                res_level = "high"
                res_reasoning = f"Vision and barcode lookup agree on {label}"
                res_source = "barcode_lookup"
            elif vision_conf >= 0.85:
                res_conf = 88.0
                res_level = "high"
                res_reasoning = f"Confidence derived from vision model signal ({int(vision_conf*100)}%)"
            elif vision_conf >= 0.6:
                res_conf = 72.0
                res_level = "medium"
                res_reasoning = f"Confidence derived from vision model signal ({int(vision_conf*100)}%)"
            else:
                res_conf = 45.0
                res_level = "low"
                res_reasoning = f"Confidence derived from vision model signal ({int(vision_conf*100)}%)"
        elif lookup_val:
            # Vision missed it — backfill from the barcode lookup.
            res_val = lookup_val
            res_conf = 85.0
            res_level = "high"
            res_reasoning = f"Backfilled from barcode lookup (Open Food Facts)"
            res_source = "barcode_lookup"
        else:
            res_conf = 0.0
            res_level = "missing"
            res_reasoning = f"No {label} found"

    else: # product_name, packaging
        if vision_conf >= 0.85:
            res_conf = 88.0
            res_level = "high"
        elif vision_conf >= 0.6:
            res_conf = 72.0
            res_level = "medium"
        elif vision_val:
            res_conf = 45.0
            res_level = "low"
        else:
            res_conf = 0.0
            res_level = "missing"
        res_reasoning = f"Confidence derived from vision model signal ({int(vision_conf*100)}%)"

    return FieldValue(
        value=res_val,
        confidence=res_conf,
        confidence_level=res_level,
        reasoning=res_reasoning,
        source=res_source
    )
