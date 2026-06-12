from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import get_db
from app.agents.query_agent import query_agent

router = APIRouter()

class QueryRequest(BaseModel):
    question: str

@router.post("/ask")
async def ask_question(request: QueryRequest, db: AsyncSession = Depends(get_db)):
    # Run the query agent
    # Note: query_agent doesn't need deps for now
    result = await query_agent.run(request.question)
    return result.output
