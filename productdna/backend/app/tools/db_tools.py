from sqlalchemy import text, inspect
from app.db import engine, Base
from typing import List, Dict, Any

class SafetyError(Exception):
    pass

async def inspect_schema() -> str:
    """Returns a plain-text description of all tables and columns."""
    # Since we are using async SQLAlchemy, we need run_sync for inspect
    def _inspect(conn):
        inspector = inspect(conn)
        schema_desc = []
        for table_name in inspector.get_table_names():
            columns = inspector.get_columns(table_name)
            col_desc = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
            schema_desc.append(f"Table: {table_name}\nColumns: {col_desc}")
        return "\n\n".join(schema_desc)

    async with engine.connect() as conn:
        return await conn.run_sync(_inspect)

async def sample_table(table_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Returns up to `limit` rows from the named table as dicts."""
    async with engine.connect() as conn:
        result = await conn.execute(text(f"SELECT * FROM {table_name} LIMIT {limit}"))
        return [dict(row._mapping) for row in result]

async def run_sql(query: str) -> List[Dict[str, Any]]:
    """
    Execute a read-only SQL query and return results as list of dicts.
    SAFETY: reject any query containing DROP, DELETE, UPDATE, INSERT,
    ALTER, TRUNCATE, CREATE (case-insensitive).
    """
    forbidden = ["DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE", "CREATE"]
    upper_query = query.upper()
    for word in forbidden:
        if word in upper_query:
            raise SafetyError(f"Query contains forbidden keyword: {word}")
    
    async with engine.connect() as conn:
        result = await conn.execute(text(query))
        # Limit to 100 rows
        return [dict(row._mapping) for row in result.fetchmany(100)]
