from pydantic import BaseModel, Field
from typing import Optional, Generic, TypeVar, Literal, Any, List
from datetime import datetime

T = TypeVar("T")

class FieldValue(BaseModel, Generic[T]):
    value: Optional[T] = None
    confidence: float           # 0-100
    confidence_level: Literal["high", "medium", "low", "missing"]
    reasoning: str
    source: str

class ProductResponse(BaseModel):
    id: str
    image_url: str
    brand: FieldValue[str]
    product_name: FieldValue[str]
    weight: FieldValue[str]
    barcode: FieldValue[str]
    category: FieldValue[str]
    packaging: FieldValue[str]
    status: str
    created_at: str
    updated_at: str

class AgentStep(BaseModel):
    id: str
    agent: str
    tool: str
    args: dict
    result: Any
    duration_ms: int
    timestamp: str

class AgentTraceResponse(BaseModel):
    product_id: str
    steps: List[AgentStep]
    total_duration_ms: int

class DuplicateCandidateResponse(BaseModel):
    id: str
    product_a: ProductResponse
    product_b: ProductResponse
    similarity: float
    status: str

class StatsResponse(BaseModel):
    products_processed: int
    avg_confidence: float
    duplicates_pending: int
    needs_review: int

class ExtractionResult(BaseModel):
    brand: Optional[str] = None
    product_name: Optional[str] = None
    weight: Optional[str] = None
    barcode: Optional[str] = None
    category: Optional[str] = None
    packaging: Optional[str] = None
    sources: Any # RawSources will be defined in agent file or here
