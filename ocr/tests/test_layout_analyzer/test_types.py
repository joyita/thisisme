import pytest

from ocr_pipeline.stages.layout_analyzer.types import DetectedBox, Checkbox


class TestDetectedBox:
    def test_creation(self):
        box = DetectedBox(x=10, y=20, width=100, height=50)
        assert box.x == 10
        assert box.y == 20
        assert box.width == 100
        assert box.height == 50
        assert box.name == ""

    def test_creation_with_name(self):
        box = DetectedBox(x=0, y=0, width=100, height=100, name="Section 1")
        assert box.name == "Section 1"

    def test_y_end_property(self):
        box = DetectedBox(x=10, y=20, width=100, height=50)
        assert box.y_end == 70

    def test_y_end_at_zero(self):
        box = DetectedBox(x=0, y=0, width=100, height=100)
        assert box.y_end == 100


class TestCheckbox:
    def test_creation_filled(self):
        cb = Checkbox(x=10, y=20, width=15, height=15, filled=True)
        assert cb.x == 10
        assert cb.y == 20
        assert cb.width == 15
        assert cb.height == 15
        assert cb.filled is True

    def test_creation_unfilled(self):
        cb = Checkbox(x=10, y=20, width=15, height=15, filled=False)
        assert cb.filled is False

    def test_center_property(self):
        cb = Checkbox(x=10, y=20, width=20, height=20, filled=False)
        center_x, center_y = cb.center
        assert center_x == 20
        assert center_y == 30

    def test_center_with_odd_dimensions(self):
        cb = Checkbox(x=10, y=20, width=15, height=15, filled=False)
        center_x, center_y = cb.center
        assert center_x == 17
        assert center_y == 27

    def test_bbox_property(self):
        cb = Checkbox(x=10, y=20, width=15, height=15, filled=True)
        bbox = cb.bbox
        assert bbox == [
            [10, 20],
            [25, 20],
            [25, 35],
            [10, 35],
        ]

    def test_bbox_at_origin(self):
        cb = Checkbox(x=0, y=0, width=10, height=10, filled=False)
        bbox = cb.bbox
        assert bbox == [
            [0, 0],
            [10, 0],
            [10, 10],
            [0, 10],
        ]
