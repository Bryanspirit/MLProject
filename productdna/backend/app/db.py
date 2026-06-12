import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "data/productdna.db")
DATABASE_URL = f"sqlite+aiosqlite:///{DB_PATH}"

# Create the data directory if it doesn't exist
os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    async with engine.begin() as conn:
        # Import models here to ensure they are registered with Base
        from app.models import Product, ProductImage, AgentTrace, DuplicateCandidate
        await conn.run_sync(Base.metadata.create_all)
