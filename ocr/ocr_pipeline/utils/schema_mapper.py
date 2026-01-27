import csv
import logging
from pathlib import Path

from .levenshtein import levenshtein_ratio

logger = logging.getLogger(__name__)


class SchemaMapper:
    def __init__(self, mapping_path: Path | None = None, threshold: float = 0.80):
        self.threshold = threshold
        self.mappings: dict[str, str] = {}
        self._cache: dict[str, str] = {}

        if mapping_path and mapping_path.exists():
            self._load_mappings(mapping_path)
            logger.info(f"Loaded {len(self.mappings)} schema mappings from {mapping_path}")

    def _load_mappings(self, path: Path) -> None:
        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ocr_text = row.get("ocr_text", "").strip()
                standard_key = row.get("standard_key", "").strip()
                if ocr_text and standard_key:
                    self.mappings[ocr_text.lower()] = standard_key

    def map_key(self, raw_text: str) -> str:
        if not raw_text:
            return raw_text

        cleaned = raw_text.strip()
        cache_key = cleaned.lower()

        if cache_key in self._cache:
            return self._cache[cache_key]

        if cache_key in self.mappings:
            result = self.mappings[cache_key]
            self._cache[cache_key] = result
            return result

        best_match = None
        best_ratio = 0.0

        for ocr_text, standard_key in self.mappings.items():
            ratio = levenshtein_ratio(cache_key, ocr_text)
            if ratio > best_ratio:
                best_ratio = ratio
                best_match = standard_key

        if best_match and best_ratio >= self.threshold:
            logger.debug(f"Mapped '{raw_text}' -> '{best_match}' (ratio: {best_ratio:.2f})")
            self._cache[cache_key] = best_match
            return best_match

        self._cache[cache_key] = cleaned
        return cleaned
