from cachetools import TTLCache
import hashlib

# Cache up to 1000 queries. 
# TTL (Time To Live) is set to 3600 seconds (1 hour). 
# After 1 hour, the cached answer expires.
query_cache = TTLCache(maxsize=1000, ttl=3600)

def get_cache_key(query: str) -> str:
    """
    Creates a consistent MD5 hash for the query string.
    Lowercasing and stripping whitespace ensures 'Refund policy?' and 'refund policy ' hit the same cache.
    """
    normalized_query = query.lower().strip()
    return hashlib.md5(normalized_query.encode('utf-8')).hexdigest()

# Session memory to hold chat history for up to 24 hours
session_memory = TTLCache(maxsize=1000, ttl=86400)
