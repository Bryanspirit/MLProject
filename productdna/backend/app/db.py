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

def _add_missing_columns(conn):
    """Lightweight migration: SQLAlchemy's create_all creates missing *tables*
    but never alters existing ones, so newly-added model columns won't appear
    on a database that predates them. Add any missing columns via ALTER TABLE
    (SQLite supports ADD COLUMN). Idempotent — safe to run on every startup."""
    from sqlalchemy import inspect as sa_inspect
    from app.models import Product, ProductImage
    insp = sa_inspect(conn)
    for model in (Product, ProductImage):
        existing = {c["name"] for c in insp.get_columns(model.__tablename__)}
        for col in model.__table__.columns:
            if col.name in existing:
                continue
            coltype = col.type.compile(dialect=conn.dialect)
            ddl = f'ALTER TABLE {model.__tablename__} ADD COLUMN "{col.name}" {coltype}'
            # Backfill non-nullable confidence columns with 0.0 on legacy rows.
            if col.name.endswith("_confidence"):
                ddl += " DEFAULT 0.0"
            conn.exec_driver_sql(ddl)


async def init_db():
    async with engine.begin() as conn:
        # Import models here to ensure they are registered with Base
        from app.models import Product, ProductImage, AgentTrace, DuplicateCandidate
        await conn.run_sync(Base.metadata.create_all)
        await conn.run_sync(_add_missing_columns)


async def recover_stuck_extractions() -> int:
    """Any product still 'extracting' at startup was interrupted by a restart —
    BackgroundTasks run in-process and don't survive a process exit, so its
    extraction will never resume on its own. Mark such rows 'failed' so the UI
    stops polling them forever and they become eligible for a retry. Returns the
    number of rows recovered."""
    from sqlalchemy import update
    from app.models import Product
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            update(Product)
            .where(Product.status == "extracting")
            .values(status="failed")
        )
        await session.commit()
        return result.rowcount or 0
