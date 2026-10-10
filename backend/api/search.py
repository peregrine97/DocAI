from fastapi import APIRouter, Query
from backend.services.search import hybrid_search
from typing import List, Dict, Any

router = APIRouter()

@router.get("/query", response_model=List[Dict[str, Any]])
async def query_documents(q: str = Query(..., description="The user question")):
    """
    Query the indexed documents using Hybrid Search (BM25 + Vector).
    """
    results = await hybrid_search(query=q)
    return results
