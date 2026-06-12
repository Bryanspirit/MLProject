import os
from typing import Optional, List
from pydantic import BaseModel
from pydantic_ai import Agent, RunContext
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

TEXT_MODEL = os.getenv("TEXT_MODEL", "qwen2.5:7b")
MAX_ITERATIONS = int(os.getenv("MAX_AGENT_ITERATIONS", "6"))

class ReconciliationResult(BaseModel):
    value: Optional[str] = None
    confidence: float
    reasoning: str
    flagged_for_human: bool

reconciliation_agent = Agent(
    f"ollama:{TEXT_MODEL}",
    output_type=ReconciliationResult,
    system_prompt=(
        "You are a product data quality specialist. You are given conflicting "
        "information about a product field from multiple sources. Your job is "
        "to determine the most likely correct value and explain your reasoning.\n\n"
        "Available tools:\n"
        "- re_examine_field: ask targeted questions about the field\n"
        "- lookup_barcode: verify via Open Food Facts if a barcode is involved\n"
        "- flag_for_human: if you cannot resolve with confidence, flag it\n\n"
        "Return your decision with the value, a confidence score (0-100), "
        "and a plain-English explanation of why you chose it. "
        "Be specific: name the sources, name the values, explain the conflict."
    )
)

# Placeholder tools for reconciliation agent
@reconciliation_agent.tool
async def tool_re_examine_field(ctx: RunContext[None], field: str, question: str) -> str:
    """Ask a targeted question to resolve conflict."""
    return "Placeholder response from re-examination"

@reconciliation_agent.tool
async def tool_flag_for_human(ctx: RunContext[None], reason: str) -> str:
    """Flag the field for human review."""
    return f"Flagged: {reason}"
