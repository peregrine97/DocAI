from fastapi import APIRouter
from backend.models.schemas import ChatRequest, ChatResponse
from backend.services.search import hybrid_search, get_overview_chunks, is_overview_query
from backend.services.llm import generate_answer, rewrite_query_with_history, NOT_FOUND
from backend.core.cache import query_cache, get_cache_key, session_memory
from backend.core.logger import log_rag_trace, logger
import uuid
import time

router = APIRouter()

@router.post("/ask", response_model=ChatResponse)
async def ask_question(request: ChatRequest):
    request_start = time.time()
    
    # 0. Setup Session Memory
    session_id = request.session_id or str(uuid.uuid4())
    history = session_memory.get(session_id, [])
    
    # 1. Exact Match Cache (keyed on the query AND the set of documents being searched)
    doc_scope = ",".join(sorted(request.document_ids or []) + sorted(request.filenames or []))
    if not history:
        cache_key = get_cache_key(f"{request.query}||{doc_scope}")
        if cache_key in query_cache:
            cached_result = query_cache[cache_key]
            
            session_memory[session_id] = [
                {"role": "user", "content": request.query},
                {"role": "assistant", "content": cached_result["answer"]}
            ]
            
            # Observability Log
            log_rag_trace(session_id, request.query, True, 0.0, 0.0, 1.0, "SUCCESS")
            
            return ChatResponse(
                query=request.query,
                answer=cached_result["answer"],
                sources=cached_result["sources"],
                cached=True,
                session_id=session_id
            )
            
    # 2. Query Rewriting 
    logger.info(f"[{session_id}] Rewriting query using history...")
    search_query = await rewrite_query_with_history(request.query, history)
    
    # 3. Retrieve & Rerank
    search_start = time.time()
    overview = is_overview_query(request.query)
    top_chunks = await hybrid_search(query=search_query, limit=8, document_ids=request.document_ids, filenames=request.filenames)
    if overview:
        # Broad questions: lead with the document's opening chunks, then the best semantic matches
        opening = await get_overview_chunks(request.document_ids, request.filenames, limit=8)
        seen = {c["chunk_id"] for c in opening}
        top_chunks = opening + [c for c in top_chunks if c["chunk_id"] not in seen][:4]
    search_time = time.time() - search_start
    
    # Get top confidence score for observability
    top_score = max((c["reranker_score"] for c in top_chunks), default=0.0)
    
    # 4. Generate (the model answers only from these chunks, or returns NOT_FOUND)
    gen_start = time.time()
    answer = await generate_answer(query=request.query, chunks=top_chunks, history=history)
    gen_time = time.time() - gen_start
    
    status = "ABSTAINED" if answer == NOT_FOUND else "SUCCESS"
    
    # Observability Log
    log_rag_trace(session_id, request.query, False, search_time, gen_time, top_score, status)
    
    # 5. Update Conversational History
    history.append({"role": "user", "content": request.query})
    history.append({"role": "assistant", "content": answer})
    session_memory[session_id] = history
    
    # 6. Cache standalone query
    if len(history) <= 2 and status == "SUCCESS":
        query_cache[get_cache_key(f"{request.query}||{doc_scope}")] = {
            "answer": answer,
            "sources": top_chunks
        }
        
    return ChatResponse(
        query=request.query,
        answer=answer,
        sources=top_chunks if status == "SUCCESS" else [],
        cached=False,
        session_id=session_id
    )
