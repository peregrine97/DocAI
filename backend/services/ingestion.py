"""
Ingestion pipeline:  file -> pages of text -> clean -> chunks

  1. Extract : PDF text layer; scanned pages / images are OCR'd by Gemini in BATCHES
               (several pages per request = fewer API calls = faster, less quota)
  2. Clean   : fix PDF line breaks and extra spaces
  3. Chunk   : semantic chunking - start a new chunk when the topic changes
"""
import asyncio
import re
import textwrap
import time
import uuid

import numpy as np
import pymupdf
from google.genai import types
from sentence_transformers import SentenceTransformer

from backend.core.config import settings
from backend.models.schemas import Chunk, DocumentMetadata
from backend.services import gemini

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")  # 384-dim, shared with search

IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
OCR_PROMPT = (
    "Transcribe ALL text from these {n} page images exactly as written, in reading order. "
    "No summaries or commentary. Start each page with a line: <<<PAGE k>>> (k = 1..{n})."
)


# ---------- Step 1: Extract ----------

async def ocr_batch(images: list, mime: str = "image/jpeg") -> list:
    """OCR several page images in ONE Gemini call, then split the reply back into pages."""
    parts = [types.Part.from_bytes(data=img, mime_type=mime) for img in images]
    reply = await gemini.generate([OCR_PROMPT.format(n=len(images)), *parts])

    texts = [""] * len(images)
    pieces = re.split(r"<<<\s*PAGE\s*(\d+)\s*>>>", reply)  # [junk, "1", text1, "2", text2, ...]
    for k, text in zip(pieces[1::2], pieces[2::2]):
        if 0 < int(k) <= len(images):
            texts[int(k) - 1] = text.strip()
    if not any(texts):
        texts[0] = reply.strip()  # model skipped the markers: keep the text anyway
    return texts


async def extract_pdf(data: bytes) -> dict:
    """Returns {page_number: text}. Pages with no text layer (scanned) are OCR'd in batches."""
    doc = pymupdf.open(stream=data, filetype="pdf")
    pages, scanned, images = {}, [], []
    for no, page in enumerate(doc, start=1):
        text = page.get_text()
        if len(text.strip()) >= settings.MIN_PAGE_TEXT_CHARS:
            pages[no] = text
        else:  # scanned page -> render to an image for OCR
            scanned.append(no)
            images.append(page.get_pixmap(dpi=settings.OCR_DPI).tobytes("jpeg", jpg_quality=80))
    doc.close()

    # Group scanned pages into batches and OCR all batches in parallel, but limit concurrency
    size = settings.OCR_PAGES_PER_REQUEST
    batches = [range(i, min(i + size, len(scanned))) for i in range(0, len(scanned), size)]
    sem = asyncio.Semaphore(settings.OCR_MAX_WORKERS)

    async def _safe_ocr(b):
        async with sem:
            return await ocr_batch([images[i] for i in b])

    results = await asyncio.gather(*(_safe_ocr(b) for b in batches))
    for batch, texts in zip(batches, results):
        for i, text in zip(batch, texts):
            pages[scanned[i]] = text
    return pages


# ---------- Step 2: Clean ----------

def clean_text(text: str) -> str:
    text = re.sub(r"(\w)-\n(\w)", r"\1\2", text)   # "inter-\nrupt" -> "interrupt"
    text = re.sub(r"(?<!\n)\n(?!\n)", " ", text)    # single line break -> space
    text = re.sub(r"[ \t]+", " ", text)             # collapse spaces
    return text.strip()


# ---------- Step 3: Semantic chunking ----------

def split_sentences(text: str) -> list:
    """Split on sentence ends / blank lines; wrap very long pieces (notes often have no full stops)."""
    pieces = re.split(r"(?<=[.?!])\s+|\n\n+", text)
    return [line for p in pieces if p.strip() for line in textwrap.wrap(p.strip(), settings.MAX_CHUNK_CHARS // 2)]


def semantic_chunks(pages: dict, threshold: float = 0.5) -> list:
    """Embed every sentence; start a new chunk when the topic changes or the chunk gets too long."""
    sentences = [(no, s) for no, text in sorted(pages.items()) for s in split_sentences(text)]
    if not sentences:
        return []
    vectors = embedding_model.encode([s for _, s in sentences], normalize_embeddings=True)

    chunks, (page, current) = [], sentences[0]
    for i in range(1, len(sentences)):
        no, sentence = sentences[i]
        topic_changed = np.dot(vectors[i - 1], vectors[i]) < threshold and len(current) >= settings.MIN_CHUNK_CHARS
        too_long = len(current) + len(sentence) > settings.MAX_CHUNK_CHARS
        if topic_changed or too_long:
            chunks.append((page, current))
            page, current = no, sentence
        else:
            current += " " + sentence
    chunks.append((page, current))
    return [c for c in chunks if len(c[1]) >= settings.MIN_CHUNK_CHARS] or chunks


# ---------- Entry point ----------

async def process_document_with_stats(data: bytes, filename: str):
    start, doc_id = time.time(), str(uuid.uuid4())
    ext = "." + filename.lower().rsplit(".", 1)[-1]

    if ext == ".pdf":
        pages = await extract_pdf(data)
    elif ext in IMAGE_TYPES:
        pages = {1: (await ocr_batch([data], IMAGE_TYPES[ext]))[0]}
    else:
        pages = {1: data.decode("utf-8", errors="ignore")}

    pages = {no: clean_text(t) for no, t in pages.items() if t.strip()}
    chunk_tuples = await asyncio.to_thread(semantic_chunks, pages)  # CPU work off the event loop

    metadata = DocumentMetadata(document_id=doc_id, filename=filename)
    chunks = [Chunk(chunk_id=str(uuid.uuid4()), document_id=doc_id, text=text, page_number=page,
                    chunk_index=i, metadata=metadata)
              for i, (page, text) in enumerate(chunk_tuples, start=1)]
    stats = {"filename": filename, "document_id": doc_id, "total_pages": len(pages),
             "total_chunks": len(chunks), "seconds": round(time.time() - start, 1)}
    return chunks, stats


async def process_document(data: bytes, filename: str):
    return (await process_document_with_stats(data, filename))[0]
