"""Hybrid document classifier using keywords and semantic similarity."""

import logging
import re
from dataclasses import dataclass
from typing import Optional

from .categories import DOCUMENT_CATEGORIES, DocumentCategory

logger = logging.getLogger(__name__)

# Lazy load sentence transformers to avoid startup delay
_sentence_model = None


def _get_sentence_model():
    """Lazy load the sentence transformer model."""
    global _sentence_model
    if _sentence_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            logger.info("Loading sentence transformer model...")
            # all-MiniLM-L6-v2 is small (80MB), fast on CPU, good quality
            _sentence_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model loaded")
        except ImportError:
            logger.warning("sentence-transformers not installed, using keyword-only classification")
            _sentence_model = False
    return _sentence_model if _sentence_model else None


@dataclass
class ClassificationResult:
    """Result of document classification."""
    category_id: str
    category_name: str
    timeline_entry_type: str
    confidence: float
    method: str  # 'keyword', 'semantic', or 'hybrid'
    matched_keywords: list[str]


class DocumentClassifier:
    """
    Hybrid document classifier that combines:
    1. Fast keyword matching for high-confidence cases
    2. Semantic similarity for uncertain cases
    """

    def __init__(self, use_semantic: bool = True):
        """
        Initialize the classifier.

        Args:
            use_semantic: Whether to use semantic similarity (requires sentence-transformers)
        """
        self.use_semantic = use_semantic
        self.categories = DOCUMENT_CATEGORIES
        self._category_embeddings = None

    def _precompute_embeddings(self):
        """Precompute embeddings for category descriptions."""
        if self._category_embeddings is not None:
            return

        model = _get_sentence_model()
        if model is None:
            return

        descriptions = [cat.semantic_description for cat in self.categories]
        self._category_embeddings = model.encode(descriptions, convert_to_tensor=True)

    def classify(self, text: str, metadata: Optional[dict] = None) -> ClassificationResult:
        """
        Classify a document based on its text content.

        Args:
            text: The document text (from OCR or other extraction)
            metadata: Optional metadata that might help classification

        Returns:
            ClassificationResult with category and confidence
        """
        if not text or not text.strip():
            return self._default_result()

        text_lower = text.lower()

        # Step 1: Try keyword matching first (fast)
        keyword_result = self._keyword_match(text_lower)

        # If high confidence from keywords, return immediately
        if keyword_result and keyword_result.confidence >= 0.8:
            logger.debug(f"High-confidence keyword match: {keyword_result.category_name}")
            return keyword_result

        # Step 2: Try semantic matching if enabled
        semantic_result = None
        if self.use_semantic:
            semantic_result = self._semantic_match(text)

        # Step 3: Combine results
        if keyword_result and semantic_result:
            return self._combine_results(keyword_result, semantic_result)
        elif keyword_result:
            return keyword_result
        elif semantic_result:
            return semantic_result
        else:
            return self._default_result()

    def _keyword_match(self, text_lower: str) -> Optional[ClassificationResult]:
        """Match document against keyword patterns."""
        best_match = None
        best_score = 0
        best_keywords = []

        for category in self.categories:
            score = 0
            matched = []

            # Check strong keywords (high weight)
            for keyword in category.strong_keywords:
                if keyword.lower() in text_lower:
                    score += 3
                    matched.append(keyword)

            # Check weak keywords (lower weight)
            for keyword in category.weak_keywords:
                if keyword.lower() in text_lower:
                    score += 1
                    matched.append(keyword)

            if score > best_score:
                best_score = score
                best_match = category
                best_keywords = matched

        if best_match is None or best_score == 0:
            return None

        # Convert score to confidence (normalized)
        # 3+ strong keywords = 0.9+, 1 strong = 0.6, weak only = 0.3-0.5
        max_possible = len(best_match.strong_keywords) * 3 + len(best_match.weak_keywords)
        confidence = min(0.95, 0.3 + (best_score / max_possible) * 0.65)

        return ClassificationResult(
            category_id=best_match.id,
            category_name=best_match.name,
            timeline_entry_type=best_match.timeline_entry_type,
            confidence=confidence,
            method='keyword',
            matched_keywords=best_keywords[:5]  # Top 5
        )

    def _semantic_match(self, text: str) -> Optional[ClassificationResult]:
        """Match document using semantic similarity."""
        model = _get_sentence_model()
        if model is None:
            return None

        self._precompute_embeddings()
        if self._category_embeddings is None:
            return None

        try:
            # Truncate text to avoid memory issues (first 1000 chars usually enough)
            truncated = text[:2000] if len(text) > 2000 else text

            # Get embedding for document
            doc_embedding = model.encode(truncated, convert_to_tensor=True)

            # Compute similarities
            from sentence_transformers import util
            similarities = util.cos_sim(doc_embedding, self._category_embeddings)[0]

            # Find best match
            best_idx = similarities.argmax().item()
            best_score = similarities[best_idx].item()

            category = self.categories[best_idx]

            # Convert similarity to confidence (0.3-0.7 similarity -> 0.4-0.8 confidence)
            confidence = min(0.85, max(0.3, (best_score - 0.2) * 1.2))

            return ClassificationResult(
                category_id=category.id,
                category_name=category.name,
                timeline_entry_type=category.timeline_entry_type,
                confidence=confidence,
                method='semantic',
                matched_keywords=[]
            )

        except Exception as e:
            logger.error(f"Semantic matching failed: {e}")
            return None

    def _combine_results(
        self,
        keyword_result: ClassificationResult,
        semantic_result: ClassificationResult
    ) -> ClassificationResult:
        """Combine keyword and semantic results."""

        # If both agree, boost confidence
        if keyword_result.category_id == semantic_result.category_id:
            combined_confidence = min(0.95, (keyword_result.confidence + semantic_result.confidence) / 1.5)
            return ClassificationResult(
                category_id=keyword_result.category_id,
                category_name=keyword_result.category_name,
                timeline_entry_type=keyword_result.timeline_entry_type,
                confidence=combined_confidence,
                method='hybrid',
                matched_keywords=keyword_result.matched_keywords
            )

        # If they disagree, use the higher confidence one
        if keyword_result.confidence >= semantic_result.confidence:
            return keyword_result
        else:
            return semantic_result

    def _default_result(self) -> ClassificationResult:
        """Return default classification when no match found."""
        return ClassificationResult(
            category_id="general_letter",
            category_name="General Document",
            timeline_entry_type="NOTE",
            confidence=0.3,
            method='default',
            matched_keywords=[]
        )

    def classify_batch(self, texts: list[str]) -> list[ClassificationResult]:
        """Classify multiple documents efficiently."""
        return [self.classify(text) for text in texts]
