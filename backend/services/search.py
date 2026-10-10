import asyncio
import re
from backend.db.qdrant import qdrant_client, COLLECTION_NAME
from backend.services.ingestion import embedding_model
from sentence_transformers import CrossEncoder
from qdrant_client.http.models import Filter, FieldCondition, MatchAny, Range
from typing import List, Dict, Optional

# Load the Cross-Encoder model globally
# This model evaluates the deep semantic relationship between a (Query, Document) pair.
reranker_model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

# Broad "tell me about this file" questions have no specific keywords, so a passage-ranking
# cross-encoder scores every chunk as irrelevant. We detect them and answer from the
# document's opening chunks (title, abstract, introduction, TOC) instead.
_OVERVIEW_RE = re.compile(
    r"\b(summar(y|ize|ise)|overview|what('?s| is| are)? (this|the) (file|doc|document|pdf|book|paper|manual|report)"
    r"|(file|doc|document|pdf|book|paper|manual|report) (is )?(all )?about|tell me (about|details)|gist|main (idea|points|topics)"
    r"|table of contents|key (points|takeaways))\b",
    re.IGNORECASE,
)


def is_overview_query(query: str) -> bool:
    return bool(_OVERVIEW_RE.search(query))


def _doc_filter(document_ids: Optional[List[str]], filenames: Optional[List[str]] = None, extra: Optional[list] = None) -> Optional[Filter]:
    must = list(extra or [])
    if document_ids:
        must.append(FieldCondition(key="document_id", match=MatchAny(any=document_ids)))
    if filenames:
        must.append(FieldCondition(key="filename", match=MatchAny(any=filenames)))
    return Filter(must=must) if must else None


def _to_result(hit, text: str, reranker_score: float, retriever_score: Optional[float]) -> Dict:
    payload = hit.payload or {}
    return {
        "chunk_id": hit.id,
        "text": text,
        "text_preview": text[:150].strip() + ("..." if len(text) > 150 else ""),
        "page_number": payload.get("page_number"),
        "chunk_index": payload.get("chunk_index"),
        "filename": payload.get("filename") or payload.get("metadata", {}).get("filename"),
        "metadata": payload.get("metadata", {}),
        "retriever_score": retriever_score,
        "reranker_score": reranker_score,
    }


async def hybrid_search(query: str, limit: int = 5, document_ids: Optional[List[str]] = None, filenames: Optional[List[str]] = None) -> List[Dict]:
    """
    Performs a Hybrid Search (Dense + BM25) on Qdrant, then Reranks the candidates.
    When document_ids is given, retrieval is restricted to those documents.
    """
    # 1. RETRIEVAL PHASE (Broad Search)
    # We ask Qdrant for a larger candidate pool (e.g., top 20) instead of just the final 'limit'
    candidate_limit = limit * 4 

    query_vector = embedding_model.encode([query], normalize_embeddings=True)[0].tolist()
    
    search_response = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        using="dense",
        query_filter=_doc_filter(document_ids, filenames),
        limit=candidate_limit,
        with_payload=True
    )
    
    if not search_response.points:
        return []
        
    # 2. RERANKING PHASE (Precise Search)
    # Prepare pairs of (Query, Candidate_Text) for the cross-encoder
    candidate_texts = [hit.payload.get("text", "") for hit in search_response.points]
    cross_encoder_inputs = [[query, text] for text in candidate_texts]
    
    # The CrossEncoder returns a raw score for each pair. Higher is more relevant.
    # Run in a thread so a rerank never blocks other requests.
    rerank_scores = await asyncio.to_thread(reranker_model.predict, cross_encoder_inputs)
    
    # 3. COMBINE & SORT
    results = [
        _to_result(hit, candidate_texts[i], float(rerank_scores[i]), hit.score)
        for i, hit in enumerate(search_response.points)
    ]
        
    # Sort descending by the new reranker_score
    results = sorted(results, key=lambda x: x["reranker_score"], reverse=True)
    
    # 4. Return only the final top 'limit' requested by the user
    return results[:limit]


async def get_overview_chunks(document_ids: Optional[List[str]], filenames: Optional[List[str]] = None, limit: int = 8) -> List[Dict]:
    """Returns the opening chunks of the scoped documents (title/abstract/intro/TOC)."""
    points, _ = qdrant_client.scroll(
        collection_name=COLLECTION_NAME,
        scroll_filter=_doc_filter(document_ids, filenames, [FieldCondition(key="chunk_index", range=Range(lte=limit))]),
        limit=limit * max(1, len(document_ids or []) + len(filenames or [])) if (document_ids or filenames) else limit,
        with_payload=True,
    )
    points = sorted(points, key=lambda p: (p.payload.get("document_id", ""), p.payload.get("chunk_index") or 0))
    return [_to_result(p, p.payload.get("text", ""), 0.0, None) for p in points]
