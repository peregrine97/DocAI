from fastapi import APIRouter
from backend.api import ingest, search, chat

api_router = APIRouter()

@api_router.get("/health")
def health_check():
    return {"status": "ok", "message": "Zero Hallucination RAG API is running"}

api_router.include_router(ingest.router, prefix="/ingest", tags=["ingestion"])

api_router.include_router(search.router, prefix="/search", tags=["search"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
