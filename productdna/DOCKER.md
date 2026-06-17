# Running ProductDNA with Docker

Two containers — a FastAPI **backend** and an nginx-served React **frontend**.
Ollama is **not** containerized: it stays on the host so it keeps GPU access and
your already-pulled models. The backend reaches it via `host.docker.internal`.

## Prerequisites
- Docker Desktop running.
- Ollama running on the host with the models pulled:
  `qwen2.5vl:7b`, `gemma4:latest` (or override in `.env`).

## Quick start
```bash
docker compose up --build
```
Then open:

| Service  | URL                     | Notes                              |
|----------|-------------------------|------------------------------------|
| Frontend | http://localhost:3000   | nginx; proxies `/api` to backend   |
| Backend  | http://localhost:8080   | direct API access (e.g. `/health`) |

These ports are intentionally different from the dev servers (5173 / 8000), so
you can run Docker and `npm run dev` / `uvicorn` at the same time.

To change ports or models, copy `.env.docker.example` to `.env` and edit it.

Stop with `docker compose down` (data is preserved). Rebuild after code changes
with `docker compose up --build`.

## How the app is wired
- The browser only talks to the **frontend** (port 3000). nginx reverse-proxies
  `/api` and `/static` to the backend, so there's no CORS and the frontend bundle
  is port-agnostic (`VITE_API_BASE_URL=/api`, baked at build time).
- The backend talks to host Ollama at `http://host.docker.internal:11434`.

## Caching / speed techniques used
1. **Layered image builds** — dependencies and ML model weights are separate
   layers from the application code, so editing code rebuilds only the small
   final layer (seconds, not minutes).
2. **ML weights baked into the image** — `all-MiniLM-L6-v2` (embeddings) and the
   EasyOCR English models are downloaded at *build* time into the image, so
   containers start instantly and never re-download them.
3. **Persistent volumes** — the SQLite DB, uploaded images, and the extraction
   `demo_cache` are mounted from the host, so they survive rebuilds and restarts;
   cached extractions are reused.
4. **nginx asset caching** — content-hashed JS/CSS are served `immutable` with a
   1-year cache; uploaded images get a short browser cache.
5. **Warm models** — the vision model is requested with `keep_alive=10m` so
   Ollama keeps it resident between uploads instead of reloading per request.
6. **In-process lookup cache** — Open Food Facts barcode results are memoized for
   the life of the backend process.

## Notes
- OCR runs on CPU inside the container (no GPU passthrough). The heavy vision
  inference runs on the host GPU via Ollama, so this is fine.
- First build is large (torch + EasyOCR ≈ a few GB) and takes several minutes;
  subsequent builds are fast thanks to layer caching.
