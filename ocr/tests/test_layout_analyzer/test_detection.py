import pytest
import numpy as np

from ocr_pipeline.stages.base import OCRResult
from ocr_pipeline.stages.layout_analyzer.types import DetectedBox
from ocr_pipeline.stages.layout_analyzer.detection import (
    detect_section_boxes,
    detect_checkboxes,
    detect_bold_text,
    _find_section_name,
    _remove_overlapping_boxes,
    _has_text_inside_box,
)


class TestDetectSectionBoxes:
    def test_returns_empty_for_blank_image(self):
        image = np.ones((500, 400, 3), dtype=np.uint8) * 255
        boxes = detect_section_boxes(image, [])
        assert boxes == []

    def test_detects_rectangle(self):
        image = np.ones((500, 400, 3), dtype=np.uint8) * 255
        cv2 = pytest.importorskip("cv2")
        cv2.rectangle(image, (50, 50), (350, 200), (0, 0, 0), 2)
        boxes = detect_section_boxes(image, [])
        assert len(boxes) >= 1

    def test_boxes_sorted_by_y(self):
        image = np.ones((600, 400, 3), dtype=np.uint8) * 255
        cv2 = pytest.importorskip("cv2")
        cv2.rectangle(image, (50, 300), (350, 450), (0, 0, 0), 2)
        cv2.rectangle(image, (50, 50), (350, 200), (0, 0, 0), 2)
        boxes = detect_section_boxes(image, [])
        if len(boxes) >= 2:
            assert boxes[0].y <= boxes[1].y


class TestDetectCheckboxes:
    def test_returns_empty_for_blank_image(self):
        image = np.ones((500, 400, 3), dtype=np.uint8) * 255
        checkboxes = detect_checkboxes(image, [], min_area=100, max_area=2000)
        assert checkboxes == []

    def test_detects_small_square(self):
        image = np.ones((500, 400, 3), dtype=np.uint8) * 255
        cv2 = pytest.importorskip("cv2")
        cv2.rectangle(image, (100, 100), (120, 120), (0, 0, 0), -1)
        checkboxes = detect_checkboxes(image, [], min_area=100, max_area=2000)
        assert len(checkboxes) >= 1


class TestDetectBoldText:
    def test_detects_thick_text_as_bold(self):
        image = np.ones((100, 200, 3), dtype=np.uint8) * 255
        cv2 = pytest.importorskip("cv2")
        cv2.putText(image, "BOLD", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 0), 3)
        result = OCRResult(text="BOLD", bbox=[[5, 20], [100, 20], [100, 60], [5, 60]], confidence=0.9)
        assert detect_bold_text(result, image) == True

    def test_thin_text_not_bold(self):
        image = np.ones((100, 200, 3), dtype=np.uint8) * 255
        cv2 = pytest.importorskip("cv2")
        cv2.putText(image, "thin", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1)
        result = OCRResult(text="thin", bbox=[[5, 30], [80, 30], [80, 60], [5, 60]], confidence=0.9)
        assert detect_bold_text(result, image) == False

    def test_handles_out_of_bounds(self):
        image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        result = OCRResult(text="test", bbox=[[-10, -10], [200, -10], [200, 200], [-10, 200]], confidence=0.9)
        is_bold = detect_bold_text(result, image)
        assert is_bold == True or is_bold == False

    def test_handles_zero_area_bbox(self):
        image = np.ones((100, 100, 3), dtype=np.uint8) * 255
        result = OCRResult(text="test", bbox=[[50, 50], [50, 50], [50, 50], [50, 50]], confidence=0.9)
        assert detect_bold_text(result, image) == False


class TestFindSectionName:
    def test_finds_name_within_box(self):
        ocr_results = [
            OCRResult(text="Section Title", bbox=[[60, 55], [200, 55], [200, 75], [60, 75]], confidence=0.9),
        ]
        name = _find_section_name(50, 50, 300, ocr_results)
        assert name == "Section Title"

    def test_returns_empty_when_no_match(self):
        ocr_results = [
            OCRResult(text="Far Away", bbox=[[500, 500], [600, 500], [600, 520], [500, 520]], confidence=0.9),
        ]
        name = _find_section_name(50, 50, 300, ocr_results)
        assert name == ""

    def test_returns_topmost_leftmost_candidate(self):
        ocr_results = [
            OCRResult(text="Second", bbox=[[100, 60], [180, 60], [180, 80], [100, 80]], confidence=0.9),
            OCRResult(text="First", bbox=[[60, 55], [140, 55], [140, 75], [60, 75]], confidence=0.9),
        ]
        name = _find_section_name(50, 50, 300, ocr_results)
        assert name == "First"


class TestRemoveOverlappingBoxes:
    def test_keeps_non_overlapping(self):
        boxes = [
            DetectedBox(x=0, y=0, width=100, height=100),
            DetectedBox(x=200, y=0, width=100, height=100),
        ]
        result = _remove_overlapping_boxes(boxes)
        assert len(result) == 2

    def test_removes_smaller_overlapping(self):
        boxes = [
            DetectedBox(x=0, y=0, width=200, height=200),
            DetectedBox(x=10, y=10, width=50, height=50),
        ]
        result = _remove_overlapping_boxes(boxes)
        assert len(result) == 1
        assert result[0].width == 200

    def test_handles_empty_list(self):
        result = _remove_overlapping_boxes([])
        assert result == []


class TestHasTextInsideBox:
    def test_text_inside(self):
        ocr_results = [
            OCRResult(text="X", bbox=[[110, 110], [120, 110], [120, 120], [110, 120]], confidence=0.9),
        ]
        assert _has_text_inside_box(100, 100, 50, 50, ocr_results) is True

    def test_text_outside(self):
        ocr_results = [
            OCRResult(text="X", bbox=[[300, 300], [310, 300], [310, 310], [300, 310]], confidence=0.9),
        ]
        assert _has_text_inside_box(100, 100, 50, 50, ocr_results) is False

    def test_empty_text_ignored(self):
        ocr_results = [
            OCRResult(text="   ", bbox=[[110, 110], [120, 110], [120, 120], [110, 120]], confidence=0.9),
        ]
        assert _has_text_inside_box(100, 100, 50, 50, ocr_results) is False
