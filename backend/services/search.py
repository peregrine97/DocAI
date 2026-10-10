import asyncio
import re
from backend.db.qdrant import qdrant_client, COLLECTION_NAME
from backend.services import gemini
from qdrant_client.http.models import Filter, FieldCondition, MatchAny, Range
from typing import List, Dict, Optional

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
    Performs a Search on Qdrant using Gemini embeddings.
    When document_ids is given, retrieval is restricted to those documents.
    """
    vectors = await gemini.embed([query])
    query_vector = vectors[0]
    
    search_response = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        query=query_vector,
        using="dense",
        query_filter=_doc_filter(document_ids, filenames),
        limit=limit,
        with_payload=True
    )
    
    if not search_response.points:
        return []
        
    results = [
        _to_result(hit, hit.payload.get("text", ""), float(hit.score), hit.score)
        for hit in search_response.points
    ]
    
    return results


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
