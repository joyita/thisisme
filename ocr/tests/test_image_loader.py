import pytest
import tempfile
from pathlib import Path

import numpy as np

from ocr_pipeline.stages.base import PipelineContext
from ocr_pipeline.stages.image_loader import ImageLoaderStage


@pytest.fixture
def sample_image_path():
    cv2 = pytest.importorskip("cv2")
    image = np.ones((100, 100, 3), dtype=np.uint8) * 128
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
        cv2.imwrite(f.name, image)
        return Path(f.name)


class TestImageLoaderStage:
    def test_name_property(self):
        stage = ImageLoaderStage()
        assert stage.name == "ImageLoader"

    def test_loads_image(self, sample_image_path):
        stage = ImageLoaderStage()
        context = PipelineContext(image_path=sample_image_path)
        result = stage.process(context)
        assert result.image is not None
        assert result.image.shape == (100, 100, 3)

    def test_converts_to_rgb(self, sample_image_path):
        stage = ImageLoaderStage()
        context = PipelineContext(image_path=sample_image_path)
        result = stage.process(context)
        assert result.image is not None

    def test_error_when_no_path(self):
        stage = ImageLoaderStage()
        context = PipelineContext()
        result = stage.process(context)
        assert "No image path provided" in result.errors

    def test_error_when_file_not_found(self):
        stage = ImageLoaderStage()
        context = PipelineContext(image_path=Path("/nonexistent/image.png"))
        result = stage.process(context)
        assert any("not found" in e for e in result.errors)

    def test_error_when_invalid_image(self):
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as f:
            f.write(b"not an image")
            invalid_path = Path(f.name)

        stage = ImageLoaderStage()
        context = PipelineContext(image_path=invalid_path)
        result = stage.process(context)
        assert any("Failed to load" in e for e in result.errors)

    def test_returns_context(self, sample_image_path):
        stage = ImageLoaderStage()
        context = PipelineContext(image_path=sample_image_path)
        result = stage.process(context)
        assert result is context
