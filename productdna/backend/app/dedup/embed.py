from sentence_transformers import SentenceTransformer
import numpy as np
from typing import List

# Use the recommended model: all-MiniLM-L6-v2
model = SentenceTransformer('all-MiniLM-L6-v2')

def get_embedding(text: str) -> np.ndarray:
    """Generate embedding for a given text."""
    if not text:
        return np.zeros(384) # all-MiniLM-L6-v2 dimension is 384
    return model.encode(text)

def get_embeddings(texts: List[str]) -> np.ndarray:
    """Generate embeddings for a list of texts."""
    return model.encode(texts)
