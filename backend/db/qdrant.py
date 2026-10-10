from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from backend.core.config import settings

# Use Qdrant Cloud if credentials are provided, otherwise fallback to local storage
if settings.QDRANT_URL and settings.QDRANT_API_KEY:
    qdrant_client = QdrantClient(
        url=settings.QDRANT_URL,
        api_key=settings.QDRANT_API_KEY,
    )
    print("Connected to Qdrant Cloud.")
else:
    qdrant_client = QdrantClient(path="qdrant_storage")
    print("Using local Qdrant storage.")

COLLECTION_NAME = "documents"

def init_qdrant():
    """Initializes the Qdrant collection with both Dense and Sparse vector configurations."""
    if not qdrant_client.collection_exists(COLLECTION_NAME):
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                # Size 768 matches the Gemini 'text-embedding-004' model
                "dense": VectorParams(size=768, distance=Distance.COSINE),
            },
            # Qdrant supports Sparse Vectors for true BM25/Lexical search. We configure the schema here.
            sparse_vectors_config={
                "bm25": {}
            }
        )
        print(f"Collection '{COLLECTION_NAME}' created successfully for Hybrid Search.")

# Run initialization on import
init_qdrant()
