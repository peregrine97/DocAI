from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams
from backend.core.config import settings

# For MVP/development, we'll use a local file-based Qdrant instance in the "qdrant_storage" folder.
# In production, this would point to a Qdrant Docker container or Qdrant Cloud.
qdrant_client = QdrantClient(path="qdrant_storage")

COLLECTION_NAME = "documents"

def init_qdrant():
    """Initializes the Qdrant collection with both Dense and Sparse vector configurations."""
    if not qdrant_client.collection_exists(COLLECTION_NAME):
        qdrant_client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config={
                # Size 384 matches the 'all-MiniLM-L6-v2' model we used for semantic chunking
                "dense": VectorParams(size=384, distance=Distance.COSINE),
            },
            # Qdrant supports Sparse Vectors for true BM25/Lexical search. We configure the schema here.
            sparse_vectors_config={
                "bm25": {}
            }
        )
        print(f"Collection '{COLLECTION_NAME}' created successfully for Hybrid Search.")

# Run initialization on import
init_qdrant()
