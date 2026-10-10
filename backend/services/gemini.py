"""
One small wrapper around the Gemini API, shared by OCR (ingestion.py) and answering (llm.py).

- Tries models in order; if one fails, moves to the next (free-tier models often hit limits).
- A model that hits its quota (429) is skipped for the rest of the run.
"""
import logging
import time

from google import genai
from google.genai import types

from backend.core.config import settings

logger = logging.getLogger("doc_ai.gemini")

MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-flash-latest", "gemini-flash-lite-latest"]
exhausted_until: dict[str, float] = {}  # model -> cooldown timestamp

client = genai.Client(api_key=settings.GEMINI_API_KEY.strip("\"'"))


async def generate(contents) -> str:
    """Send a prompt (text and/or images) to Gemini and return the reply text ('' if every model fails)."""
    now = time.time()
    # Prefer models that are not currently in a 429 rate limit cooldown
    available = [m for m in MODELS if exhausted_until.get(m, 0) <= now]
    if not available:
        # If all hit rate limits recently, pick the one with earliest cooldown expiry
        available = sorted(MODELS, key=lambda m: exhausted_until.get(m, 0))

    for model in available:
        # "Thinking" makes gemini-2.5 much slower and isn't needed for OCR or grounded answers
        thinking = types.ThinkingConfig(thinking_budget=0) if "2.5" in model else None
        try:
            response = await client.aio.models.generate_content(
                model=model, contents=contents,
                config=types.GenerateContentConfig(temperature=0, thinking_config=thinking),
            )
            return response.text or ""
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg:
                # Rate limit cooldown: reset after 60 seconds (standard free tier RPM window)
                exhausted_until[model] = time.time() + 60
            logger.warning(f"{model} failed ({err_msg[:80]}), trying next model")
    return ""


async def embed(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of strings using gemini-embedding-2."""
    if not texts:
        return []
        
    all_embeddings = []
    # Gemini API has a hard limit of 100 items per batch
    batch_size = 100
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        # In Google GenAI SDK, wrap each string in types.Content so the API returns individual
        # embeddings for each text rather than aggregating them into a single vector.
        contents = [types.Content(parts=[types.Part.from_text(text=t)]) for t in batch]
        response = await client.aio.models.embed_content(
            model="gemini-embedding-2",
            contents=contents,
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
        all_embeddings.extend([e.values for e in response.embeddings])
        
    return all_embeddings
