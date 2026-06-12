import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class BarcodeValidation:
    valid: bool
    format: Optional[str] = None
    reason: str = ""

def validate_ean13(code: str) -> bool:
    """Validate EAN-13 check digit."""
    code = re.sub(r'\D', '', code)
    if len(code) != 13:
        return False
    
    digits = [int(d) for d in code]
    # Sum: odd positions (1,3,5..11) x 1, even positions (2,4,6..12) x 3
    # Note: EAN-13 positions are 1-indexed.
    # pos 1,3,5,7,9,11 are indices 0,2,4,6,8,10
    # pos 2,4,6,8,10,12 are indices 1,3,5,7,9,11
    sum_val = sum(digits[i] for i in range(0, 12, 2)) * 1 + \
              sum(digits[i] for i in range(1, 12, 2)) * 3
    
    check_digit = (10 - (sum_val % 10)) % 10
    return check_digit == digits[12]

def validate_upc_a(code: str) -> bool:
    """Validate UPC-A check digit."""
    code = re.sub(r'\D', '', code)
    if len(code) != 12:
        return False
    
    digits = [int(d) for d in code]
    # UPC-A: odd positions (1,3,5..11) x 3, even positions (2,4,6..10) x 1
    # pos 1,3,5,7,9,11 are indices 0,2,4,6,8,10
    # pos 2,4,6,8,10 are indices 1,3,5,7,9
    sum_val = sum(digits[i] for i in range(0, 11, 2)) * 3 + \
              sum(digits[i] for i in range(1, 11, 2)) * 1
    
    check_digit = (10 - (sum_val % 10)) % 10
    return check_digit == digits[11]

def validate_barcode(code: str) -> BarcodeValidation:
    """Try EAN-13 first, then UPC-A."""
    if not code:
        return BarcodeValidation(valid=False, reason="Missing barcode")
    
    clean_code = re.sub(r'\D', '', code)
    
    if len(clean_code) == 13:
        if validate_ean13(clean_code):
            return BarcodeValidation(valid=True, format="EAN-13", reason="Barcode validated by check digit")
        else:
            return BarcodeValidation(valid=False, reason="EAN-13 check digit failed")
    
    if len(clean_code) == 12:
        if validate_upc_a(clean_code):
            return BarcodeValidation(valid=True, format="UPC-A", reason="Barcode validated by check digit")
        else:
            return BarcodeValidation(valid=False, reason="UPC-A check digit failed")
            
    return BarcodeValidation(valid=False, reason=f"Invalid length ({len(clean_code)}) for barcode")

if __name__ == "__main__":
    # Test cases
    test_ean = "5449000054494" # Coca-Cola
    print(f"EAN-13 {test_ean}: {validate_barcode(test_ean)}")
    
    invalid_ean = "5449000054495"
    print(f"EAN-13 {invalid_ean}: {validate_barcode(invalid_ean)}")
    
    test_upc = "036000291452"
    print(f"UPC-A {test_upc}: {validate_barcode(test_upc)}")
