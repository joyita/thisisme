import pytest
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

import numpy as np

from ocr_pipeline.pipeline import OCRPipeline, _build_output
from ocr_pipeline.config import PipelineConfig
from ocr_pipeline.stages.base import PipelineContext, FormSection, FormField


@pytest.fixture
def sample_image_path():
    cv2 = pytest.importorskip("cv2")
    image = np.ones((400, 300, 3), dtype=np.uint8) * 255
    cv2.putText(image, "PATIENT DETAILS", (20, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
    cv2.putText(image, "Name:", (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    cv2.putText(image, "Jane Brown", (100, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        cv2.imwrite(f.name, image)
        return Path(f.name)


class TestPipelineConfig:
    def test_default_values(self):
        config = PipelineConfig()
        assert config.schema_mapping_path is None
        assert config.levenshtein_threshold == 0.80
        assert config.header_height_multiplier == 1.3
        assert config.checkbox_min_area == 100
        assert config.checkbox_max_area == 2000
        assert config.lang == "en"
        assert config.use_gpu is True
        assert config.log_level == "INFO"

    def test_custom_values(self):
        config = PipelineConfig(
            levenshtein_threshold=0.90,
            header_height_multiplier=1.5,
            lang="fr",
            use_gpu=False,
        )
        assert config.levenshtein_threshold == 0.90
        assert config.header_height_multiplier == 1.5
        assert config.lang == "fr"
        assert config.use_gpu is False

    def test_string_path_converted_to_path(self):
        config = PipelineConfig(schema_mapping_path="/some/path.csv")
        assert isinstance(config.schema_mapping_path, Path)


class TestBuildOutput:
    def test_includes_metadata(self):
        context = PipelineContext(
            metadata={"name": "test", "date": "2024-01-01"},
        )
        output = _build_output(context)
        assert output["metadata"] == {"name": "test", "date": "2024-01-01"}

    def test_includes_form_data(self):
        context = PipelineContext(
            form_data={"sections": [{"name": "Test"}]},
        )
        output = _build_output(context)
        assert output["form"] == {"sections": [{"name": "Test"}]}

    def test_includes_errors_when_present(self):
        context = PipelineContext(
            errors=["Error 1", "Error 2"],
        )
        output = _build_output(context)
        assert output["errors"] == ["Error 1", "Error 2"]

    def test_excludes_errors_when_empty(self):
        context = PipelineContext()
        output = _build_output(context)
        assert "errors" not in output


class TestOCRPipeline:
    def test_initializes_with_default_config(self):
        pipeline = OCRPipeline()
        assert pipeline.config is not None
        assert len(pipeline.stages) == 5

    def test_initializes_with_custom_config(self):
        config = PipelineConfig(lang="fr")
        pipeline = OCRPipeline(config=config)
        assert pipeline.config.lang == "fr"

    def test_stages_order(self):
        pipeline = OCRPipeline()
        stage_names = [s.name for s in pipeline.stages]
        assert stage_names == [
            "ImageLoader",
            "OCRExtractor",
            "LayoutAnalyzer",
            "StructureBuilder",
            "MetadataEnricher",
        ]

    def test_process_returns_dict(self, sample_image_path):
        pipeline = OCRPipeline()
        with patch.object(pipeline.stages[1], "process") as mock_ocr:
            mock_ocr.return_value = PipelineContext(
                image_path=sample_image_path,
                image=np.ones((100, 100, 3), dtype=np.uint8),
                ocr_results=[],
            )
            result = pipeline.process(sample_image_path)
            assert isinstance(result, dict)
            assert "metadata" in result
            assert "form" in result

    def test_process_handles_stage_error(self, sample_image_path):
        pipeline = OCRPipeline()
        with patch.object(pipeline.stages[1], "process") as mock_ocr:
            mock_ocr.side_effect = Exception("OCR failed")
            result = pipeline.process(sample_image_path)
            assert "errors" in result
            assert any("OCRExtractor" in e for e in result["errors"])

    def test_process_accepts_path_string(self, sample_image_path):
        pipeline = OCRPipeline()
        with patch.object(pipeline.stages[1], "process") as mock_ocr:
            mock_ocr.return_value = PipelineContext(
                image_path=sample_image_path,
                image=np.ones((100, 100, 3), dtype=np.uint8),
                ocr_results=[],
            )
            result = pipeline.process(str(sample_image_path))
            assert isinstance(result, dict)

    def test_process_with_nonexistent_file(self):
        pipeline = OCRPipeline()
        result = pipeline.process("/nonexistent/path.png")
        assert "errors" in result
        assert any("not found" in e for e in result["errors"])


class TestPipelineIntegration:
    @pytest.mark.skip(reason="Requires PaddleOCR which is slow to initialize")
    def test_full_pipeline_execution(self, sample_image_path):
        pipeline = OCRPipeline()
        result = pipeline.process(sample_image_path)
        assert "metadata" in result
        assert "form" in result

    def test_pipeline_with_mocked_ocr(self, sample_image_path):
        from ocr_pipeline.stages.base import OCRResult

        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="PATIENT DETAILS",
                    bbox=[[20, 10], [200, 10], [200, 40], [20, 40]],
                    confidence=0.95,
                ),
                OCRResult(
                    text="Name:",
                    bbox=[[20, 60], [80, 60], [80, 80], [20, 80]],
                    confidence=0.92,
                ),
                OCRResult(
                    text="Jane Brown",
                    bbox=[[100, 60], [200, 60], [200, 80], [100, 80]],
                    confidence=0.90,
                ),
            ]
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert "metadata" in result
            assert "form" in result
            assert "sections" in result["form"]

    def test_pipeline_with_multiple_sections(self, sample_image_path):
        from ocr_pipeline.stages.base import OCRResult

        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="GP DETAILS",
                    bbox=[[20, 10], [180, 10], [180, 40], [20, 40]],
                    confidence=0.98,
                ),
                OCRResult(
                    text="Name:",
                    bbox=[[20, 60], [80, 60], [80, 80], [20, 80]],
                    confidence=0.95,
                ),
                OCRResult(
                    text="Dr. Brown",
                    bbox=[[100, 60], [200, 60], [200, 80], [100, 80]],
                    confidence=0.93,
                ),
                OCRResult(
                    text="PATIENT DETAILS",
                    bbox=[[20, 150], [220, 150], [220, 180], [20, 180]],
                    confidence=0.97,
                ),
                OCRResult(
                    text="DOB:",
                    bbox=[[20, 200], [80, 200], [80, 220], [20, 220]],
                    confidence=0.94,
                ),
                OCRResult(
                    text="01/01/1990",
                    bbox=[[100, 200], [200, 200], [200, 220], [100, 220]],
                    confidence=0.91,
                ),
            ]
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert "form" in result
            assert "sections" in result["form"]
            sections = result["form"]["sections"]
            assert len(sections) >= 1

    def test_pipeline_error_recovery(self, sample_image_path):
        """Test that pipeline continues processing after non-fatal errors."""
        from ocr_pipeline.stages.base import OCRResult

        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="TEST SECTION",
                    bbox=[[20, 10], [180, 10], [180, 40], [20, 40]],
                    confidence=0.95,
                ),
            ]
            return context

        def mock_layout_error(context):
            raise ValueError("Layout analysis failed")

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            with patch.object(pipeline.stages[2], "process", side_effect=mock_layout_error):
                result = pipeline.process(sample_image_path)

                assert "errors" in result
                assert any("LayoutAnalyzer" in e for e in result["errors"])
                assert "metadata" in result
                assert "form" in result

    def test_pipeline_output_structure(self, sample_image_path):
        """Test the complete output structure of the pipeline."""
        from ocr_pipeline.stages.base import OCRResult, FormSection, FormField

        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="FORM HEADER",
                    bbox=[[20, 10], [200, 10], [200, 40], [20, 40]],
                    confidence=0.98,
                ),
                OCRResult(
                    text="Field1:",
                    bbox=[[20, 60], [100, 60], [100, 80], [20, 80]],
                    confidence=0.95,
                ),
                OCRResult(
                    text="Value1",
                    bbox=[[120, 60], [200, 60], [200, 80], [120, 80]],
                    confidence=0.93,
                ),
            ]
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert isinstance(result, dict)
            assert "metadata" in result
            assert isinstance(result["metadata"], dict)
            assert "form" in result
            assert isinstance(result["form"], dict)

    def test_pipeline_with_empty_ocr_results(self, sample_image_path):
        """Test pipeline handles empty OCR results gracefully."""
        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = []
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert "metadata" in result
            assert "form" in result
            assert "errors" not in result or len(result.get("errors", [])) == 0

    def test_pipeline_with_schema_mapping(self, sample_image_path, tmp_path):
        """Test pipeline with a schema mapping file."""
        from ocr_pipeline.stages.base import OCRResult

        schema_file = tmp_path / "schema.csv"
        schema_file.write_text("original,mapped\nName:,patient_name\nDOB:,date_of_birth\n")

        config = PipelineConfig(schema_mapping_path=schema_file)
        pipeline = OCRPipeline(config=config)

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="PATIENT INFO",
                    bbox=[[20, 10], [200, 10], [200, 40], [20, 40]],
                    confidence=0.98,
                ),
                OCRResult(
                    text="Name:",
                    bbox=[[20, 60], [80, 60], [80, 80], [20, 80]],
                    confidence=0.95,
                ),
                OCRResult(
                    text="Jane Doe",
                    bbox=[[100, 60], [200, 60], [200, 80], [100, 80]],
                    confidence=0.93,
                ),
            ]
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert "form" in result
            assert "sections" in result["form"]

    def test_pipeline_context_propagation(self, sample_image_path):
        """Test that context is properly passed through all stages."""
        from ocr_pipeline.stages.base import OCRResult

        pipeline = OCRPipeline()
        stage_call_order = []

        original_processes = [stage.process for stage in pipeline.stages]

        def make_tracking_process(idx, original):
            def tracking_process(context):
                stage_call_order.append(idx)
                return original(context)
            return tracking_process

        def mock_ocr_process(context):
            stage_call_order.append(1)
            context.ocr_results = [
                OCRResult(
                    text="HEADER",
                    bbox=[[20, 10], [200, 10], [200, 40], [20, 40]],
                    confidence=0.95,
                ),
            ]
            return context

        with patch.object(pipeline.stages[0], "process", side_effect=make_tracking_process(0, original_processes[0])):
            with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
                with patch.object(pipeline.stages[2], "process", side_effect=make_tracking_process(2, original_processes[2])):
                    with patch.object(pipeline.stages[3], "process", side_effect=make_tracking_process(3, original_processes[3])):
                        with patch.object(pipeline.stages[4], "process", side_effect=make_tracking_process(4, original_processes[4])):
                            pipeline.process(sample_image_path)

        assert stage_call_order == [0, 1, 2, 3, 4]

    def test_pipeline_with_low_confidence_results(self, sample_image_path):
        """Test pipeline handles low-confidence OCR results."""
        from ocr_pipeline.stages.base import OCRResult

        pipeline = OCRPipeline()

        def mock_ocr_process(context):
            context.ocr_results = [
                OCRResult(
                    text="SECTION HEADER",
                    bbox=[[20, 10], [200, 10], [200, 40], [20, 40]],
                    confidence=0.3,
                ),
                OCRResult(
                    text="Field:",
                    bbox=[[20, 60], [80, 60], [80, 80], [20, 80]],
                    confidence=0.4,
                ),
                OCRResult(
                    text="Value",
                    bbox=[[100, 60], [180, 60], [180, 80], [100, 80]],
                    confidence=0.35,
                ),
            ]
            return context

        with patch.object(pipeline.stages[1], "process", side_effect=mock_ocr_process):
            result = pipeline.process(sample_image_path)

            assert "metadata" in result
            assert "form" in result
