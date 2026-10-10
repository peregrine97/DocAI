"""
One small wrapper around the Gemini API, shared by OCR (ingestion.py) and answering (llm.py).

- Tries models in order; if one fails, moves to the next (free-tier models often hit limits).
- A model that hits its quota (429) is skipped for the rest of the run.
"""
import logging

from google import genai
from google.genai import types

from backend.core.config import settings

logger = logging.getLogger("doc_ai.gemini")

MODELS = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-flash-lite-latest"]
exhausted = set()  # models that ran out of quota

client = genai.Client(api_key=settings.GEMINI_API_KEY.strip("\"'"))


async def generate(contents) -> str:
    """Send a prompt (text and/or images) to Gemini and return the reply text ('' if every model fails)."""
    for model in [m for m in MODELS if m not in exhausted]:
        # "Thinking" makes gemini-2.5 much slower and isn't needed for OCR or grounded answers
        thinking = types.ThinkingConfig(thinking_budget=0) if "2.5" in model else None
        try:
            response = await client.aio.models.generate_content(
                model=model, contents=contents,
                config=types.GenerateContentConfig(temperature=0, thinking_config=thinking),
            )
            return response.text or ""
        except Exception as e:
            if "429" in str(e):
                exhausted.add(model)
            logger.warning(f"{model} failed ({str(e)[:80]}), trying next model")
    return ""


async def embed(texts: list[str]) -> list[list[float]]:
    """Generate embeddings for a list of strings using text-embedding-004."""
    if not texts:
        return []
    response = await client.aio.models.embed_content(
        model="text-embedding-004", contents=texts,
    )
    return [e.values for e in response.embeddings]
