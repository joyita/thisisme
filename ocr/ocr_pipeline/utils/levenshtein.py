from rapidfuzz.distance import Levenshtein


def levenshtein_ratio(s1: str, s2: str) -> float:
    s1_lower = s1.lower().strip()
    s2_lower = s2.lower().strip()

    if not s1_lower and not s2_lower:
        return 1.0
    if not s1_lower or not s2_lower:
        return 0.0

    return Levenshtein.normalized_similarity(s1_lower, s2_lower)
