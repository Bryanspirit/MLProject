import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.db import init_db

app = FastAPI(title="ProductDNA API", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

# DB init on startup
@app.on_event("startup")
async def startup():
    await init_db()

# Routers
from app.api import upload, products, duplicates, export, query
app.include_router(upload.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(duplicates.router, prefix="/api")
app.include_router(export.router, prefix="/api")
app.include_router(query.router, prefix="/api")
