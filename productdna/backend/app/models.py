from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Mapped, mapped_column
from app.db import Base
import uuid

def generate_uuid():
    return str(uuid.uuid4())

class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    image_path: Mapped[str]
    image_url: Mapped[str]

    # Brand
    brand_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    brand_confidence: Mapped[float] = mapped_column(default=0.0)
    brand_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    brand_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Product Name
    product_name_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    product_name_confidence: Mapped[float] = mapped_column(default=0.0)
    product_name_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    product_name_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Weight
    weight_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    weight_confidence: Mapped[float] = mapped_column(default=0.0)
    weight_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    weight_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Barcode
    barcode_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    barcode_confidence: Mapped[float] = mapped_column(default=0.0)
    barcode_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    barcode_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Category
    category_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    category_confidence: Mapped[float] = mapped_column(default=0.0)
    category_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    category_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    # Packaging
    packaging_value: Mapped[Optional[str]] = mapped_column(nullable=True)
    packaging_confidence: Mapped[float] = mapped_column(default=0.0)
    packaging_reasoning: Mapped[Optional[str]] = mapped_column(nullable=True)
    packaging_source: Mapped[Optional[str]] = mapped_column(nullable=True)

    status: Mapped[str] = mapped_column(default="extracting")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(default=datetime.utcnow, onupdate=datetime.utcnow)

class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    product_id: Mapped[str]
    filename: Mapped[str]
    file_size: Mapped[int]
    mime_type: Mapped[str]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class AgentTrace(Base):
    __tablename__ = "agent_traces"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    product_id: Mapped[str]
    agent_name: Mapped[str]
    steps_json: Mapped[str]
    total_duration_ms: Mapped[int]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

class DuplicateCandidate(Base):
    __tablename__ = "duplicate_candidates"

    id: Mapped[str] = mapped_column(primary_key=True, default=generate_uuid)
    product_a_id: Mapped[str]
    product_b_id: Mapped[str]
    similarity: Mapped[float]
    status: Mapped[str] = mapped_column(default="pending")
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
