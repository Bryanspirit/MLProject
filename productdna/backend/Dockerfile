# syntax=docker/dockerfile:1
FROM python:3.11-slim

# Native libraries the Python stack needs at runtime:
#   libzbar0            -> pyzbar (barcode decoding)
#   libgl1, libglib2.0-0 -> OpenCV used by EasyOCR
#   libgomp1            -> OpenMP runtime for torch / numpy
RUN apt-get update && apt-get install -y --no-install-recommends \
        libzbar0 \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    # Bake ML model weights into the image at these paths so containers start
    # fast and never re-download them at runtime.
    HF_HOME=/opt/models/hf \
    EASYOCR_MODULE_PATH=/opt/models/easyocr

WORKDIR /app

# --- Dependency layer: cached unless requirements.txt changes ---------------
COPY requirements.txt .
# Install the GPU build of torch/torchvision from PyTorch's own CDN first.
# easyocr and sentence-transformers depend on torch transitively; pinning it
# here (and from download.pytorch.org, not PyPI) means the slow/unstable PyPI
# CUDA wheels are never fetched, and requirements.txt sees torch as satisfied.
RUN pip install --upgrade pip \
 && pip install --index-url https://download.pytorch.org/whl/cu126 \
        torch==2.12.0 torchvision==0.27.0 \
 && pip install -r requirements.txt

# --- Model layer: pre-download weights so first request isn't a cold download -
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')" \
 && python -c "import easyocr; easyocr.Reader(['en'], gpu=False)"

# --- Application layer: changes most often, so copy last --------------------
COPY . .

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
