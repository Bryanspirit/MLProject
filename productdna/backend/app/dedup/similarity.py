import numpy as np
from typing import List

def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Calculate cosine similarity between two vectors."""
    if np.all(a == 0) or np.all(b == 0):
        return 0.0
    dot_product = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    return float(dot_product / (norm_a * norm_b))

def find_duplicates(target_embedding: np.ndarray, candidate_embeddings: List[np.ndarray], threshold: float = 0.85) -> List[int]:
    """Find indices of candidate embeddings that are similar to the target."""
    duplicates = []
    for i, candidate in enumerate(candidate_embeddings):
        sim = cosine_similarity(target_embedding, candidate)
        if sim > threshold:
            duplicates.append(i)
    return duplicates
