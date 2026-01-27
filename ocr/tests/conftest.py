import pytest
import numpy as np

from ocr_pipeline.stages.base import OCRResult, FormSection, FormField, PipelineContext
from ocr_pipeline.stages.layout_analyzer import DetectedBox, Checkbox


@pytest.fixture
def sample_ocr_result():
    return OCRResult(
        text="Sample Text",
        bbox=[[10, 20], [100, 20], [100, 40], [10, 40]],
        confidence=0.95,
    )


@pytest.fixture
def sample_ocr_results():
    return [
        OCRResult(
            text="GP DETAILS",
            bbox=[[10, 10], [150, 10], [150, 40], [10, 40]],
            confidence=0.98,
        ),
        OCRResult(
            text="Name:",
            bbox=[[20, 60], [80, 60], [80, 80], [20, 80]],
            confidence=0.95,
        ),
        OCRResult(
            text="Jane Brown",
            bbox=[[100, 60], [200, 60], [200, 80], [100, 80]],
            confidence=0.92,
        ),
        OCRResult(
            text="Address:",
            bbox=[[20, 100], [100, 100], [100, 120], [20, 120]],
            confidence=0.94,
        ),
        OCRResult(
            text="123 Main St",
            bbox=[[120, 100], [250, 100], [250, 120], [120, 120]],
            confidence=0.90,
        ),
        OCRResult(
            text="CONSENT",
            bbox=[[10, 200], [120, 200], [120, 230], [10, 230]],
            confidence=0.97,
        ),
        OCRResult(
            text="Yes",
            bbox=[[50, 260], [80, 260], [80, 280], [50, 280]],
            confidence=0.96,
        ),
        OCRResult(
            text="No",
            bbox=[[120, 260], [150, 260], [150, 280], [120, 280]],
            confidence=0.96,
        ),
    ]


@pytest.fixture
def sample_form_section():
    return FormSection(
        name="GP DETAILS",
        fields=[
            FormField(key="Name:", value="Jane Brown", field_type="text"),
            FormField(key="Address:", value="123 Main St", field_type="text"),
        ],
        y_start=40,
        y_end=200,
    )


@pytest.fixture
def sample_checkboxes():
    return [
        Checkbox(x=30, y=255, width=15, height=15, filled=True),
        Checkbox(x=100, y=255, width=15, height=15, filled=False),
    ]


@pytest.fixture
def sample_detected_box():
    return DetectedBox(x=10, y=10, width=300, height=400, name="Section 1")


@pytest.fixture
def sample_image():
    return np.zeros((500, 400, 3), dtype=np.uint8) + 255


@pytest.fixture
def sample_pipeline_context(sample_image, sample_ocr_results):
    return PipelineContext(
        image=sample_image,
        ocr_results=sample_ocr_results,
    )
