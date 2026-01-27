import pytest

from ocr_pipeline.utils.levenshtein import levenshtein_ratio


class TestLevenshteinRatio:
    def test_identical_strings(self):
        assert levenshtein_ratio("hello", "hello") == 1.0

    def test_completely_different_strings(self):
        result = levenshtein_ratio("abc", "xyz")
        assert result == 0.0

    def test_case_insensitive(self):
        assert levenshtein_ratio("Hello", "HELLO") == 1.0

    def test_strips_whitespace(self):
        assert levenshtein_ratio("  hello  ", "hello") == 1.0

    def test_both_empty_strings(self):
        assert levenshtein_ratio("", "") == 1.0

    def test_one_empty_string(self):
        assert levenshtein_ratio("hello", "") == 0.0
        assert levenshtein_ratio("", "hello") == 0.0

    def test_whitespace_only_treated_as_empty(self):
        assert levenshtein_ratio("   ", "   ") == 1.0
        assert levenshtein_ratio("   ", "hello") == 0.0

    def test_similar_strings(self):
        ratio = levenshtein_ratio("name", "nane")
        assert 0.7 < ratio < 1.0

    def test_ocr_typical_errors(self):
        ratio = levenshtein_ratio("Patient Name:", "Patiant Name:")
        assert ratio > 0.8

        ratio = levenshtein_ratio("Address", "Addres")
        assert ratio > 0.8

    def test_returns_float(self):
        result = levenshtein_ratio("test", "testing")
        assert isinstance(result, float)
        assert 0.0 <= result <= 1.0
