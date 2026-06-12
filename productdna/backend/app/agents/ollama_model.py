"""Helper for building a pydantic-ai model backed by local Ollama.

pydantic-ai's ``ollama:<name>`` shortcut targets Ollama's OpenAI-compatible
API but, in this version, resolves the base URL from OLLAMA_BASE_URL without
the required ``/v1`` suffix — which makes Ollama return 404. We construct the
model explicitly so requests go to ``<host>/v1/chat/completions``.

OLLAMA_BASE_URL itself is left as the bare host (e.g. http://localhost:11434)
because app/tools/vision.py uses Ollama's *native* ``/api/chat`` endpoint.
"""

import os
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.ollama import OllamaProvider


def ollama_model(model_name: str) -> OpenAIChatModel:
    base = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
    return OpenAIChatModel(model_name, provider=OllamaProvider(base_url=f"{base}/v1"))
