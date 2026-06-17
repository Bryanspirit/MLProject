import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db import init_db, recover_stuck_extractions


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown hook (replaces the deprecated @app.on_event)."""
    await init_db()
    # Unstick any extractions interrupted by the previous restart.
    recovered = await recover_stuck_extractions()
    if recovered:
        logging.warning(
            "Recovered %d product(s) stuck in 'extracting' after restart", recovered
        )
    yield


app = FastAPI(title="ProductDNA API", version="1.0.0", lifespan=lifespan)

# CORS — origins are configurable via the CORS_ORIGINS env var (comma-separated).
# Defaults cover the local frontend ports (Vite dev 5173/5174 and the dockerised
# nginx on 3000/3001). In Docker, nginx proxies /api same-origin so CORS isn't
# exercised, but a correct list keeps direct cross-origin calls working too.
_DEFAULT_ORIGINS = (
    "http://localhost:3000,http://localhost:3001,"
    "http://localhost:5173,http://localhost:5174"
)
CORS_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "data/uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Health check
@app.get("/health")
async def health():
    return {"status": "ok"}

# Routers
from app.api import upload, products, duplicates, export, query, dashboard
app.include_router(upload.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(query.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")