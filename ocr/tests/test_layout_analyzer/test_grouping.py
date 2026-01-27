import pytest

from ocr_pipeline.stages.base import OCRResult, FormSection
from ocr_pipeline.stages.layout_analyzer.types import DetectedBox, Checkbox
from ocr_pipeline.stages.layout_analyzer.grouping import (
    group_into_sections,
    _create_sections,
    _assign_to_section,
    _build_field,
    _find_checkbox_left_of,
    _is_label,
    _find_value_for_label,
)


class TestGroupIntoSections:
    def test_groups_results_into_sections(self, sample_ocr_results):
        headers = [sample_ocr_results[0], sample_ocr_results[5]]
        sections = group_into_sections(
            sample_ocr_results, headers, [], []
        )
        assert len(sections) == 2
        assert sections[0].name == "GP DETAILS"
        assert sections[1].name == "CONSENT"

    def test_excludes_headers_from_fields(self, sample_ocr_results):
        headers = [sample_ocr_results[0]]
        sections = group_into_sections(sample_ocr_results, headers, [], [])
        field_texts = [f.key for s in sections for f in s.fields]
        assert "GP DETAILS" not in field_texts

    def test_empty_results(self):
        sections = group_into_sections([], [], [], [])
        assert len(sections) == 1
        assert sections[0].name == "Form Data"


class TestCreateSections:
    def test_creates_sections_from_headers(self):
        headers = [
            OCRResult(text="Section A", bbox=[[0, 10], [100, 10], [100, 30], [0, 30]], confidence=0.9),
            OCRResult(text="Section B", bbox=[[0, 200], [100, 200], [100, 220], [0, 220]], confidence=0.9),
        ]
        sections = _create_sections(headers, [])
        assert len(sections) == 2
        assert sections[0].name == "Section A"
        assert sections[0].y_start == 30
        assert sections[0].y_end == 200
        assert sections[1].name == "Section B"

    def test_creates_sections_from_boxes_when_no_headers(self):
        boxes = [
            DetectedBox(x=0, y=10, width=300, height=100, name="Box 1"),
            DetectedBox(x=0, y=150, width=300, height=100, name="Box 2"),
        ]
        sections = _create_sections([], boxes)
        assert len(sections) == 2
        assert sections[0].name == "Box 1"
        assert sections[1].name == "Box 2"

    def test_creates_default_section_when_empty(self):
        sections = _create_sections([], [])
        assert len(sections) == 1
        assert sections[0].name == "Form Data"

    def test_headers_take_priority_over_boxes(self):
        headers = [
            OCRResult(text="Header", bbox=[[0, 10], [100, 10], [100, 30], [0, 30]], confidence=0.9),
        ]
        boxes = [DetectedBox(x=0, y=50, width=300, height=100, name="Box")]
        sections = _create_sections(headers, boxes)
        assert len(sections) == 1
        assert sections[0].name == "Header"


class TestAssignToSection:
    def test_assigns_to_correct_section(self):
        sections = [
            FormSection(name="A", y_start=0, y_end=100),
            FormSection(name="B", y_start=100, y_end=200),
        ]
        result = OCRResult(text="test", bbox=[[0, 50], [50, 50], [50, 70], [0, 70]], confidence=0.9)
        section = _assign_to_section(result, sections)
        assert section.name == "A"

    def test_assigns_to_last_section_when_past_all(self):
        sections = [
            FormSection(name="A", y_start=0, y_end=100),
            FormSection(name="B", y_start=100, y_end=200),
        ]
        result = OCRResult(text="test", bbox=[[0, 300], [50, 300], [50, 320], [0, 320]], confidence=0.9)
        section = _assign_to_section(result, sections)
        assert section.name == "B"


class TestBuildField:
    def test_creates_checkbox_field_when_checkbox_nearby(self):
        result = OCRResult(text="Option A", bbox=[[50, 100], [120, 100], [120, 120], [50, 120]], confidence=0.9)
        checkboxes = [Checkbox(x=20, y=95, width=15, height=15, filled=True)]
        field = _build_field(result, checkboxes, [result])
        assert field.field_type == "checkbox"
        assert field.value == "selected"

    def test_creates_text_field_for_label(self):
        label = OCRResult(text="Name:", bbox=[[10, 100], [60, 100], [60, 120], [10, 120]], confidence=0.9)
        value = OCRResult(text="Jane", bbox=[[80, 100], [130, 100], [130, 120], [80, 120]], confidence=0.9)
        field = _build_field(label, [], [label, value])
        assert field.field_type == "text"
        assert field.key == "Name:"
        assert field.value == "Jane"

    def test_creates_empty_text_field_for_non_label(self):
        result = OCRResult(text="Some text", bbox=[[10, 100], [100, 100], [100, 120], [10, 120]], confidence=0.9)
        field = _build_field(result, [], [result])
        assert field.field_type == "text"
        assert field.value == "empty"


class TestFindCheckboxLeftOf:
    def test_finds_checkbox_to_left(self):
        result = OCRResult(text="Option", bbox=[[100, 50], [150, 50], [150, 70], [100, 70]], confidence=0.9)
        checkboxes = [Checkbox(x=70, y=50, width=15, height=15, filled=True)]
        cb = _find_checkbox_left_of(result, checkboxes)
        assert cb is not None
        assert cb.filled is True

    def test_ignores_checkbox_to_right(self):
        result = OCRResult(text="Option", bbox=[[50, 50], [100, 50], [100, 70], [50, 70]], confidence=0.9)
        checkboxes = [Checkbox(x=120, y=50, width=15, height=15, filled=True)]
        cb = _find_checkbox_left_of(result, checkboxes)
        assert cb is None

    def test_ignores_distant_checkbox(self):
        result = OCRResult(text="Option", bbox=[[300, 50], [350, 50], [350, 70], [300, 70]], confidence=0.9)
        checkboxes = [Checkbox(x=10, y=50, width=15, height=15, filled=True)]
        cb = _find_checkbox_left_of(result, checkboxes)
        assert cb is None

    def test_returns_nearest_checkbox(self):
        result = OCRResult(text="Option", bbox=[[100, 50], [150, 50], [150, 70], [100, 70]], confidence=0.9)
        checkboxes = [
            Checkbox(x=50, y=50, width=15, height=15, filled=False),
            Checkbox(x=80, y=50, width=15, height=15, filled=True),
        ]
        cb = _find_checkbox_left_of(result, checkboxes)
        assert cb is not None
        assert cb.x == 80


class TestIsLabel:
    def test_colon_suffix(self):
        assert _is_label("Name:") is True

    def test_question_mark_suffix(self):
        assert _is_label("Are you sure?") is True

    def test_name_suffix(self):
        assert _is_label("Patient Name") is True

    def test_date_suffix(self):
        assert _is_label("Birth Date") is True

    def test_address_suffix(self):
        assert _is_label("Home Address") is True

    def test_number_suffix(self):
        assert _is_label("Phone Number") is True

    def test_no_suffix(self):
        assert _is_label("Some random text") is False


class TestFindValueForLabel:
    def test_finds_value_to_right(self):
        label = OCRResult(text="Name:", bbox=[[10, 100], [60, 100], [60, 120], [10, 120]], confidence=0.9)
        value = OCRResult(text="Jane Brown", bbox=[[80, 100], [180, 100], [180, 120], [80, 120]], confidence=0.9)
        result = _find_value_for_label(label, [label, value])
        assert result == "Jane Brown"

    def test_returns_none_when_no_value(self):
        label = OCRResult(text="Name:", bbox=[[10, 100], [60, 100], [60, 120], [10, 120]], confidence=0.9)
        result = _find_value_for_label(label, [label])
        assert result is None

    def test_ignores_value_on_different_line(self):
        label = OCRResult(text="Name:", bbox=[[10, 100], [60, 100], [60, 120], [10, 120]], confidence=0.9)
        value = OCRResult(text="Jane", bbox=[[80, 200], [130, 200], [130, 220], [80, 220]], confidence=0.9)
        result = _find_value_for_label(label, [label, value])
        assert result is None

    def test_finds_closest_value(self):
        label = OCRResult(text="Name:", bbox=[[10, 100], [60, 100], [60, 120], [10, 120]], confidence=0.9)
        value1 = OCRResult(text="Jane", bbox=[[80, 100], [120, 100], [120, 120], [80, 120]], confidence=0.9)
        value2 = OCRResult(text="Brown", bbox=[[150, 100], [200, 100], [200, 120], [150, 120]], confidence=0.9)
        result = _find_value_for_label(label, [label, value1, value2])
        assert result == "Jane"
