"""
Answer generation:
  1. rewrite_query_with_history : turns a follow-up ("what about it?") into a standalone search query
  2. generate_answer            : answers ONLY from the retrieved chunks, or says it couldn't find it
"""
from typing import Dict, List

from backend.services import gemini

NOT_FOUND = "I couldn't find this in the uploaded documents. Try rephrasing your question."

PROMPT_TEMPLATE = """You are Doc AI, a professional document assistant. Answer using ONLY the document excerpts below.

INSTRUCTIONS:
1. By default, answer using ONLY the document excerpts below.
2. IF the user explicitly asks for your own knowledge (e.g., "tell me more from your knowledge", "explain outside the document"), you MAY use your internal knowledge to supplement or provide the answer.
3. Combine information into a clear, well-organized answer.
4. STRICT FORMATTING RULES:
   - Use clear standalone lines for main headings/titles (e.g., **Heading** or ### Heading).
   - NEVER put bullet points on headings or titles.
   - ONLY use bullet points for the actual content, details, or explanations beneath the headings.
5. Do not mention excerpts, chunk IDs or sources.
6. The excerpts may come from OCR of handwritten notes: ignore odd symbols and fix obvious typos.
7. If the excerpts do not contain the answer AND the user hasn't explicitly asked for your own knowledge, reply with exactly: {not_found}

PREVIOUS CONVERSATION:
{history}

DOCUMENT EXCERPTS:
{context}

USER QUESTION: {query}

Answer:"""

REWRITE_PROMPT = """Rewrite the follow-up question into a standalone search query using the conversation.
Do not answer it.

Conversation:
{history}

Follow-up Question: {query}

Standalone Query:"""


def format_history(history: List[Dict]) -> str:
    return "\n".join(f"{m['role'].capitalize()}: {m['content']}" for m in history)


async def rewrite_query_with_history(query: str, history: List[Dict[str, str]]) -> str:
    if not history:
        return query
    rewritten = await gemini.generate(REWRITE_PROMPT.format(history=format_history(history), query=query))
    return rewritten.strip() or query


async def generate_answer(query: str, chunks: List[Dict], history: List[Dict] = None) -> str:
    context = "\n\n".join(f"Excerpt (page {c.get('page_number') or '?'}):\n{c['text']}" for c in chunks) if chunks else "No excerpts found."
    prompt = PROMPT_TEMPLATE.format(context=context, query=query, not_found=NOT_FOUND,
                                    history=format_history(history) if history else "None")
    answer = await gemini.generate(prompt)
    return answer.strip() or "The AI service is busy right now (free-tier limit). Please try again in a minute."
