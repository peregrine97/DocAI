import logging
import sys

# Configure a standard logger for Observability (Phase 8)
logger = logging.getLogger("RAG_OBSERVABILITY")
logger.setLevel(logging.INFO)

handler = logging.StreamHandler(sys.stdout)
formatter = logging.Formatter(
    fmt="[%(asctime)s] [%(levelname)s] - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
handler.setFormatter(formatter)
logger.addHandler(handler)

def log_rag_trace(session_id: str, query: str, cache_hit: bool, search_time: float, 
                  gen_time: float, top_score: float, answer_status: str):
    """
    Structured logging function to trace a single RAG request.
    This fulfills Phase 8: Observability (tracing the retrieval path and latency).
    """
    total_time = search_time + gen_time
    
    log_msg = (
        f"Trace ID: {session_id} | "
        f"Query: '{query}' | "
        f"Status: [{answer_status}] | "
        f"Cache: {cache_hit} | "
        f"Top Confidence: {top_score:.2f} | "
        f"Latency: {total_time:.2f}s (Search: {search_time:.2f}s, Gen: {gen_time:.2f}s)"
    )
    logger.info(log_msg)
