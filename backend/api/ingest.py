import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException
from backend.services.ingestion import process_document_with_stats
from backend.services import gemini
from backend.models.schemas import IngestionResponse, BatchIngestionResponse, Chunk
from backend.db.qdrant import qdrant_client, COLLECTION_NAME, init_qdrant
from backend.core.cache import query_cache
from qdrant_client.http.models import PointStruct, Filter, FieldCondition, MatchValue, FilterSelector
from typing import List

router = APIRouter()

# Process embeddings and upserts in batches to prevent memory crashes on huge files
INDEX_BATCH_SIZE = 128


async def _index_chunks(chunks: List[Chunk]) -> None:
    """Embeds and upserts chunks in batches."""
    for batch_start in range(0, len(chunks), INDEX_BATCH_SIZE):
        batch = chunks[batch_start: batch_start + INDEX_BATCH_SIZE]
        embeddings = await gemini.embed([c.text for c in batch])
        points = [
            PointStruct(
                id=chunk.chunk_id,  # Must be UUID
                vector={"dense": embeddings[i]},
                payload={
                    "text": chunk.text,
                    "document_id": chunk.document_id,  # top-level for fast filtering
                    "filename": chunk.metadata.filename,
                    "page_number": chunk.page_number,
                    "chunk_index": chunk.chunk_index,
                    "metadata": chunk.metadata.model_dump(mode="json"),
                },
            )
            for i, chunk in enumerate(batch)
        ]
        qdrant_client.upsert(collection_name=COLLECTION_NAME, points=points)


import os

UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

async def _ingest_file(file: UploadFile) -> dict:
    content = await file.read()
    
    # Save the file to disk
    file_path = os.path.join(UPLOADS_DIR, file.filename)
    with open(file_path, "wb") as f:
        f.write(content)
        
    chunks, stats = await process_document_with_stats(content, file.filename)
    if chunks:
        await _index_chunks(chunks)
    # New content invalidates cached answers
    query_cache.clear()
    return stats

@router.get("/list_documents")
async def list_documents():
    """List all uploaded documents."""
    files = []
    if os.path.exists(UPLOADS_DIR):
        for filename in os.listdir(UPLOADS_DIR):
            if os.path.isfile(os.path.join(UPLOADS_DIR, filename)):
                files.append(filename)
    return {"documents": files}


@router.post("/upload", response_model=IngestionResponse)
async def upload_document(file: UploadFile = File(...)):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")
    stats = await _ingest_file(file)
    return IngestionResponse(
        document_id=stats["document_id"] if stats.get("total_chunks") else "N/A",
        filename=file.filename,
        total_chunks=stats.get("total_chunks", 0),
        message="Document successfully processed, chunked, and indexed into Qdrant.",
    )


@router.post("/upload_batch", response_model=dict)
async def upload_documents(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Process files sequentially to respect Gemini free tier rate limits (15 RPM)
    all_stats = [await _ingest_file(f) for f in files if f.filename]

    total_chunks = sum(s.get("total_chunks", 0) for s in all_stats)
    response = BatchIngestionResponse(
        total_files=len(all_stats),
        total_chunks=total_chunks,
        document_ids=[s["document_id"] for s in all_stats if s.get("total_chunks")],
        files=all_stats,
        message="Documents successfully processed and indexed into Qdrant.",
    ).model_dump()
    return response


@router.delete("/document/{document_id}")
async def delete_document(document_id: str):
    """Removes every chunk belonging to one document."""
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(must=[FieldCondition(key="document_id", match=MatchValue(value=document_id))])
        ),
    )
    query_cache.clear()
    return {"deleted": document_id}


@router.delete("/document/filename/{filename}")
async def delete_document_by_name(filename: str):
    """Removes every chunk belonging to one document by filename, and deletes the file."""
    qdrant_client.delete(
        collection_name=COLLECTION_NAME,
        points_selector=FilterSelector(
            filter=Filter(must=[FieldCondition(key="filename", match=MatchValue(value=filename))])
        ),
    )
    file_path = os.path.join(UPLOADS_DIR, filename)
    if os.path.exists(file_path):
        os.remove(file_path)
    query_cache.clear()
    return {"deleted": filename}


@router.delete("/reset")
async def reset_index():
    """Wipes the whole collection (useful to purge stale chunks from older pipeline versions)."""
    if qdrant_client.collection_exists(COLLECTION_NAME):
        qdrant_client.delete_collection(COLLECTION_NAME)
    init_qdrant()
    query_cache.clear()
    return {"message": "Index cleared."}
