# ProductDNA

**AI-assisted product master-data extraction and stewardship.**

ProductDNA turns raw product-packaging photos into structured catalog records.
Upload an image of a product, and a vision model reads the pack and fills in a
standard set of attributes; the result is routed to a human data steward to
verify, deduplicate, approve, and export.

It extracts **10 master-data attributes** per product:

`barcode` · `category` · `segment` · `manufacturer` · `brand` · `product_name` ·
`weight` · `packaging` · `country_of_origin` · `marketing_message`

---

## How it works

When you upload an image, the backend stores it, creates a product in
`extracting` status, and runs a **deterministic extraction pipeline** in the
background:

1. **Vision** — one call to a vision LLM (`qwen2.5vl`) returns all 10 attributes
   as JSON plus a per-field confidence. Printed fields are left null if not
   clearly visible; `category`/`segment` are always *inferred* from the product.
2. **OCR** — EasyOCR reads the full image text as a second signal.
3. **Barcode scan** — `pyzbar` decodes the bar pattern directly (authoritative);
   falls back to check-digit-valid digits from OCR/vision.
4. **Barcode lookup** — a valid barcode is looked up on Open Food Facts to
   backfill manufacturer/country.
5. **Confidence** — a final per-field confidence is derived from these signals,
   and the product moves to `needs_review`.

A steward then reviews each record (editing fields as needed), the system flags
likely **duplicates**, and approved products **export to Excel**.

### Status lifecycle

```
extracting ──▶ needs_review ──▶ approved ──▶ (Excel export)
     │               │
     ▼               ▼
   failed       merged / kept_separate   (via duplicate detection)
```

### Key behaviours

- **Batch / merge upload** — several photos of the *same* product (different
  angles) are extracted individually and consolidated into one record, keeping
  the highest-confidence reading of each field.
- **Duplicate detection** — new products are matched against existing ones by
  exact barcode (near-certain) and semantic text similarity (brand + name +
  weight + category embeddings via `sentence-transformers`). Matches become
  pending candidates a steward can **merge** or **keep separate**.
- **Live progress** — extraction progress streams to the UI over SSE with the
  real pipeline stage (vision → ocr → barcode → lookup).
- **Confidence auto-approve** *(opt-in)* — extractions whose mean confidence
  clears a threshold can skip manual review (`AUTO_APPROVE_THRESHOLD`).
- **Retry** — a failed extraction can be re-run from the stored image, no
  re-upload needed.
- **Ask** — a natural-language query page turns questions into SQL over the
  product table (`qwen2.5:7b`).

---

## Architecture

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TypeScript + Tailwind, served by nginx (hash routing) |
| Backend | FastAPI (async) + SQLAlchemy + SQLite (`aiosqlite`) |
| Vision | `qwen2.5vl:7b` on **Ollama** (runs on the host, GPU) |
| OCR | EasyOCR |
| Barcodes | `pyzbar` + Open Food Facts lookup |
| Dedup | `sentence-transformers` (all-MiniLM-L6-v2) |
| Packaging | Docker Compose (backend + frontend); Ollama on host |

nginx serves the SPA and reverse-proxies `/api` to the backend, so the browser
talks to a single origin.

### Data model (SQLite)

- `products` — one row per product; `{value, confidence, reasoning, source}` per
  attribute, plus `status`.
- `product_images` — uploaded files (with a `sha256` so identical re-uploads are
  deduped).
- `duplicate_candidates` — pending / merged / kept-separate pairs.
- `agent_traces` — reasoning-step records.

---

## Quick start (Docker)

Prerequisites: Docker Desktop, and **Ollama running on the host** with the
models pulled:

```bash
ollama pull qwen2.5vl:7b   # vision — core extraction
ollama pull qwen2.5:7b     # text  — the "Ask" page (optional feature)
```

Then, from `productdna/`:

```bash
docker compose up -d --build
```

- Frontend: http://localhost:3001
- Backend API + docs: http://localhost:8080/docs

See [DOCKER.md](DOCKER.md) for full deployment details.

> **No GPU / no models?** Set `DEMO_MODE=true` to run the upload flow against a
> deterministic mock extractor that never calls the model backend.

---

## Running from a fresh clone (e.g. for judges/reviewers)

**Prerequisites:** [Docker Desktop](https://www.docker.com/products/docker-desktop/)
running. For the full AI pipeline, also [Ollama](https://ollama.com/) on the host
(see Option A). No GPU? Use Option B.

```bash
# 1. Clone and enter the app directory
git clone https://github.com/Bryanspirit/MLProject.git
cd MLProject/productdna
git checkout feat/dashboard-ui
```

### Option A — Full setup (real AI extraction; needs Ollama + ideally a GPU)

```bash
# Pull the models into the host's Ollama (one-time)
ollama pull qwen2.5vl:7b    # vision model — does the extraction
ollama pull qwen2.5:7b      # text model — powers the "Ask" page (optional)

# Build and start (first build downloads ML deps — allow a few minutes)
docker compose up -d --build
```

### Option B — Demo mode (no GPU, no Ollama, no models)

Runs the upload/review/export flow against a built-in mock extractor:

```bash
# macOS/Linux:
DEMO_MODE=true docker compose up -d --build

# Windows PowerShell:
#   $env:DEMO_MODE="true"; docker compose up -d --build
```

### Open the app

- **Frontend:** http://localhost:3000
- **Backend API docs:** http://localhost:8080/docs

> If port 3000 is taken, start with `FRONTEND_PORT=3001 docker compose up -d`
> and open http://localhost:3001.

### Try it

1. Go to **Upload** and drop in a product image (or several angles with
   "Merge into one product").
2. Watch the live extraction progress, then open **Review** to verify and
   approve the extracted attributes.
3. Check **Duplicates** for flagged matches and **Dashboard** for stats.

Stop everything with `docker compose down`.

---

## Configuration

Set via environment variables (a `.env` file in `productdna/` is read by
compose; see `.env.docker.example`).

| Variable | Default | Purpose |
|----------|---------|---------|
| `FRONTEND_PORT` | `3000` | Host port for the frontend |
| `BACKEND_PORT` | `8080` | Host port for the backend |
| `OLLAMA_BASE_URL` | `http://host.docker.internal:11434` | Host Ollama endpoint |
| `VISION_MODEL` | `qwen2.5vl:7b` | Vision model for extraction |
| `TEXT_MODEL` | `qwen2.5:7b` | Text model for the Ask page |
| `MAX_CONCURRENT_EXTRACTIONS` | `2` | Cap on simultaneous extractions |
| `AUTO_APPROVE_THRESHOLD` | `0` (off) | Mean confidence to auto-approve |
| `DEDUP_THRESHOLD` | `0.85` | Cosine similarity for duplicate flagging |
| `CORS_ORIGINS` | localhost dev ports | Allowed CORS origins (comma-separated) |
| `DEMO_MODE` | `false` | Use the mock extractor (no model backend) |

---

## Project structure

```
productdna/
├── backend/                # FastAPI service
│   └── app/
│       ├── api/            # routes: upload, products, duplicates, export, query, dashboard
│       ├── agents/         # extraction_agent (pipeline), query_agent, ollama_model
│       ├── tools/          # vision, ocr, barcode_decode, barcode_lookup, web_search
│       ├── dedup/          # detect, embed, similarity
│       ├── validation/     # confidence, barcode
│       ├── models.py       # SQLAlchemy models
│       ├── schemas.py      # Pydantic schemas
│       └── main.py         # app + lifespan startup
├── frontend/               # React + Vite SPA (nginx in prod)
│   └── src/
│       ├── pages/          # Dashboard, Upload, Review, Products, Duplicates, Ask, …
│       ├── components/     # ProductReviewPanel, tables, nav, …
│       └── api/client.ts   # typed API client
├── docker-compose.yml
└── DOCKER.md
```

---

## Development

- **Backend**: `uvicorn app.main:app --reload` (from `backend/`, with a Python
  venv and `pip install -r requirements.txt`).
- **Frontend**: `npm install && npm run dev` (from `frontend/`); it calls the
  backend at `http://localhost:8080` by default (override with
  `VITE_API_BASE_URL`).
