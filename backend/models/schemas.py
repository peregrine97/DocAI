from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DocumentMetadata(BaseModel):
    document_id: str
    filename: str
    source: str = "upload"
    author: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    custom_tags: Dict[str, Any] = Field(default_factory=dict)

class Chunk(BaseModel):
    chunk_id: str
    document_id: str
    text: str
    page_number: Optional[int] = None
    chunk_index: Optional[int] = None
    metadata: DocumentMetadata

class IngestionResponse(BaseModel):
    document_id: str
    filename: str
    total_chunks: int
    message: str

class BatchIngestionResponse(BaseModel):
    total_files: int
    total_chunks: int
    document_ids: List[str] = Field(default_factory=list)
    files: List[Dict[str, Any]] = Field(default_factory=list)
    message: str


class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = None
    # Restrict retrieval to these documents (e.g. the ones uploaded in this chat). None = search everything.
    document_ids: Optional[List[str]] = None
    filenames: Optional[List[str]] = None

class ChatResponse(BaseModel):
    query: str
    answer: str
    sources: list
    cached: bool = False
    session_id: str
