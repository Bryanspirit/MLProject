import os
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from pydantic_ai import Agent, RunContext, PromptedOutput
from app.tools.db_tools import inspect_schema, sample_table, run_sql
from app.agents.ollama_model import ollama_model
from dotenv import load_dotenv

load_dotenv()

TEXT_MODEL = os.getenv("TEXT_MODEL", "qwen2.5:7b")
MAX_ITERATIONS = int(os.getenv("MAX_AGENT_ITERATIONS", "6"))

class QueryResult(BaseModel):
    answer: str
    sql: str
    results: List[Dict[str, Any]] = Field(default_factory=list)

query_agent = Agent(
    ollama_model(TEXT_MODEL),
    output_type=PromptedOutput(QueryResult),
    retries=3,
    system_prompt=(
        "You are a SQL expert working with a retail product database.\n\n"
        "Use inspect_schema to understand the tables before writing any SQL.\n"
        "Use sample_table to understand the data format.\n"
        "Use run_sql to execute your query.\n"
        "If results are empty, consider whether your WHERE clause is too restrictive.\n"
        "Return a plain-English answer plus the SQL you used."
    )
)

@query_agent.tool
async def tool_inspect_schema(ctx: RunContext[None]) -> str:
    """Returns a plain-text description of all tables and columns."""
    return await inspect_schema()

@query_agent.tool
async def tool_sample_table(ctx: RunContext[None], table_name: str, limit: int = 3) -> List[Dict[str, Any]]:
    """Returns up to `limit` rows from the named table as dicts."""
    return await sample_table(table_name, limit)

@query_agent.tool
async def tool_run_sql(ctx: RunContext[None], query: str) -> List[Dict[str, Any]]:
    """Execute a read-only SQL query and return results as list of dicts."""
    return await run_sql(query)
