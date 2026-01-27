import pytest
import numpy as np

from ocr_pipeline.stages.base import OCRResult, PipelineContext
from ocr_pipeline.stages.layout_analyzer import LayoutAnalyzerStage


class TestLayoutAnalyzerStage:
    def test_name_property(self):
        stage = LayoutAnalyzerStage()
        assert stage.name == "LayoutAnalyzer"

    def test_default_parameters(self):
        stage = LayoutAnalyzerStage()
        assert stage.header_height_multiplier == 1.3
        assert stage.checkbox_min_area == 100
        assert stage.checkbox_max_area == 2000

    def test_custom_parameters(self):
        stage = LayoutAnalyzerStage(
            header_height_multiplier=1.5,
            checkbox_min_area=50,
            checkbox_max_area=3000,
        )
        assert stage.header_height_multiplier == 1.5
        assert stage.checkbox_min_area == 50
        assert stage.checkbox_max_area == 3000

    def test_returns_context_with_empty_ocr_results(self):
        stage = LayoutAnalyzerStage()
        context = PipelineContext()
        result = stage.process(context)
        assert result is context
        assert result.sections == []

    def test_creates_sections_from_ocr_results(self, sample_pipeline_context):
        stage = LayoutAnalyzerStage()
        result = stage.process(sample_pipeline_context)
        assert len(result.sections) > 0

    def test_identifies_headers_by_pattern(self):
        stage = LayoutAnalyzerStage()
        image = np.ones((300, 400, 3), dtype=np.uint8) * 255
        context = PipelineContext(
            image=image,
            ocr_results=[
                OCRResult(text="GP DETAILS", bbox=[[10, 10], [150, 10], [150, 30], [10, 30]], confidence=0.9),
                OCRResult(text="Name:", bbox=[[20, 50], [80, 50], [80, 70], [20, 70]], confidence=0.9),
                OCRResult(text="CONSENT", bbox=[[10, 150], [120, 150], [120, 170], [10, 170]], confidence=0.9),
                OCRResult(text="Yes", bbox=[[20, 200], [50, 200], [50, 220], [20, 220]], confidence=0.9),
            ],
        )
        result = stage.process(context)
        section_names = [s.name for s in result.sections]
        assert "GP DETAILS" in section_names or "CONSENT" in section_names

    def test_identifies_headers_by_height(self):
        stage = LayoutAnalyzerStage(header_height_multiplier=1.2)
        image = np.ones((300, 400, 3), dtype=np.uint8) * 255
        context = PipelineContext(
            image=image,
            ocr_results=[
                OCRResult(text="Big Header", bbox=[[10, 10], [200, 10], [200, 50], [10, 50]], confidence=0.9),
                OCRResult(text="small text", bbox=[[20, 70], [100, 70], [100, 85], [20, 85]], confidence=0.9),
            ],
        )
        result = stage.process(context)
        assert len(result.sections) >= 1
        assert any("Big Header" in s.name for s in result.sections)

    def test_process_without_image(self):
        stage = LayoutAnalyzerStage()
        context = PipelineContext(
            ocr_results=[
                OCRResult(text="Header", bbox=[[10, 10], [100, 10], [100, 30], [10, 30]], confidence=0.9),
                OCRResult(text="Value", bbox=[[20, 50], [80, 50], [80, 70], [20, 70]], confidence=0.9),
            ],
        )
        result = stage.process(context)
        assert len(result.sections) >= 1


class TestIdentifyHeaders:
    def test_identifies_section_pattern(self):
        stage = LayoutAnalyzerStage()
        results = [
            OCRResult(text="SECTION 1", bbox=[[10, 10], [150, 10], [150, 30], [10, 30]], confidence=0.9),
            OCRResult(text="Normal text", bbox=[[20, 50], [120, 50], [120, 70], [20, 70]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=20, image=None)
        header_texts = [h.text for h in headers]
        assert "SECTION 1" in header_texts

    def test_identifies_part_pattern(self):
        stage = LayoutAnalyzerStage()
        results = [
            OCRResult(text="PART 2", bbox=[[10, 10], [100, 10], [100, 30], [10, 30]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=20, image=None)
        assert len(headers) == 1

    def test_identifies_details_pattern(self):
        stage = LayoutAnalyzerStage()
        results = [
            OCRResult(text="PATIENT DETAILS", bbox=[[10, 10], [200, 10], [200, 30], [10, 30]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=20, image=None)
        assert len(headers) == 1

    def test_identifies_consent_pattern(self):
        stage = LayoutAnalyzerStage()
        results = [
            OCRResult(text="CONSENT", bbox=[[10, 10], [120, 10], [120, 30], [10, 30]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=20, image=None)
        assert len(headers) == 1

    def test_identifies_referral_pattern(self):
        stage = LayoutAnalyzerStage()
        results = [
            OCRResult(text="REASON FOR REFERRAL", bbox=[[10, 10], [250, 10], [250, 30], [10, 30]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=20, image=None)
        assert len(headers) == 1

    def test_identifies_by_height(self):
        stage = LayoutAnalyzerStage(header_height_multiplier=1.3)
        results = [
            OCRResult(text="Tall Item", bbox=[[10, 10], [100, 10], [100, 50], [10, 50]], confidence=0.9),
            OCRResult(text="Normal", bbox=[[20, 60], [80, 60], [80, 80], [20, 80]], confidence=0.9),
        ]
        headers = stage._identify_headers(results, avg_height=25, image=None)
        header_texts = [h.text for h in headers]
        assert "Tall Item" in header_texts
