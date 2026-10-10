from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Doc AI"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Phase 4 additions
    GEMINI_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    CONFIDENCE_THRESHOLD: float = 0.5
    
    # Ingestion Configuration
    MIN_PAGE_TEXT_CHARS: int = 50      # below this a PDF page (with an image) is treated as scanned
    MIN_CHUNK_CHARS: int = 50          # smaller chunks are dropped / not split on topic change
    MAX_CHUNK_CHARS: int = 1000        # hard cap so chunks fit MiniLM's ~256-token window
    OCR_DPI: int = 150                 # render resolution for scanned pages
    OCR_PAGES_PER_REQUEST: int = 2     # scanned pages per Gemini call (batches run in parallel)
    OCR_MAX_WORKERS: int = 3           # max concurrent Gemini API requests
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
