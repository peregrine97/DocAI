
import asyncio
from backend.services.ingestion import process_document

async def test():
    content = b'This is a test document. It has some text. Here is another sentence.'
    chunks = await process_document(content, 'test.txt')
    print(f'Chunks generated: {len(chunks)}')
    for c in chunks:
        print(c.text)

asyncio.run(test())
    