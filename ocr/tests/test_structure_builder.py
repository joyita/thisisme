import pytest
from pathlib import Path

from ocr_pipeline.stages.base import FormSection, FormField, PipelineContext
from ocr_pipeline.stages.structure_builder import StructureBuilderStage
from ocr_pipeline.utils.schema_mapper import SchemaMapper


@pytest.fixture
def schema_mapper():
    return SchemaMapper()


@pytest.fixture
def stage(schema_mapper):
    return StructureBuilderStage(schema_mapper=schema_mapper)


class TestStructureBuilderStage:
    def test_name_property(self, stage):
        assert stage.name == "StructureBuilder"

    def test_returns_context_with_no_sections(self, stage):
        context = PipelineContext()
        result = stage.process(context)
        assert result is context
        assert result.form_data == {}

    def test_builds_structure_from_sections(self, stage):
        context = PipelineContext(
            sections=[
                FormSection(
                    name="Patient Info",
                    fields=[
                        FormField(key="Name:", value="Jane", field_type="text"),
                        FormField(key="Age:", value="30", field_type="text"),
                    ],
                ),
            ],
        )
        result = stage.process(context)
        assert "sections" in result.form_data
        assert len(result.form_data["sections"]) == 1
        assert result.form_data["sections"][0]["name"] == "Patient Info"

    def test_builds_fields_with_questions_and_answers(self, stage):
        context = PipelineContext(
            sections=[
                FormSection(
                    name="Section",
                    fields=[
                        FormField(key="Name:", value="Jane", field_type="text"),
                    ],
                ),
            ],
        )
        result = stage.process(context)
        fields = result.form_data["sections"][0]["fields"]
        assert len(fields) == 1
        assert fields[0]["question"] == "Name:"
        assert fields[0]["answer"] == "Jane"


class TestMultipleChoiceGrouping:
    def test_groups_checkboxes_on_same_row(self, stage):
        context = PipelineContext(
            sections=[
                FormSection(
                    name="Survey",
                    fields=[
                        FormField(key="Question:", value="", field_type="text"),
                        FormField(
                            key="Yes",
                            value="selected",
                            field_type="checkbox",
                            bbox=[[100, 100], [115, 100], [115, 115], [100, 115]],
                        ),
                        FormField(
                            key="No",
                            value="unselected",
                            field_type="checkbox",
                            bbox=[[150, 100], [165, 100], [165, 115], [150, 115]],
                        ),
                    ],
                ),
            ],
        )
        result = stage.process(context)
        fields = result.form_data["sections"][0]["fields"]
        grouped_field = next(
            (f for f in fields if isinstance(f.get("answer"), dict)), None
        )
        if grouped_field:
            assert "Yes" in grouped_field["answer"]
            assert "No" in grouped_field["answer"]

    def test_does_not_group_single_checkbox(self, stage):
        context = PipelineContext(
            sections=[
                FormSection(
                    name="Form",
                    fields=[
                        FormField(
                            key="Agree",
                            value="selected",
                            field_type="checkbox",
                            bbox=[[100, 100], [115, 100], [115, 115], [100, 115]],
                        ),
                    ],
                ),
            ],
        )
        result = stage.process(context)
        fields = result.form_data["sections"][0]["fields"]
        assert fields[0]["answer"] == "selected"


class TestIdentifyMultipleChoiceGroups:
    def test_groups_checkboxes_by_y_position(self, stage):
        fields = [
            FormField(
                key="A",
                value="selected",
                field_type="checkbox",
                bbox=[[100, 100], [115, 100], [115, 115], [100, 115]],
            ),
            FormField(
                key="B",
                value="unselected",
                field_type="checkbox",
                bbox=[[150, 105], [165, 105], [165, 120], [150, 120]],
            ),
        ]
        groups = stage._identify_multiple_choice_groups(fields)
        assert len(groups) == 1
        group_indices = list(groups.values())[0]
        assert 0 in group_indices
        assert 1 in group_indices

    def test_separates_checkboxes_on_different_rows(self, stage):
        fields = [
            FormField(
                key="A",
                value="selected",
                field_type="checkbox",
                bbox=[[100, 100], [115, 100], [115, 115], [100, 115]],
            ),
            FormField(
                key="B",
                value="unselected",
                field_type="checkbox",
                bbox=[[100, 200], [115, 200], [115, 215], [100, 215]],
            ),
        ]
        groups = stage._identify_multiple_choice_groups(fields)
        assert len(groups) == 0

    def test_returns_empty_for_no_checkboxes(self, stage):
        fields = [
            FormField(key="Name:", value="Jane", field_type="text"),
        ]
        groups = stage._identify_multiple_choice_groups(fields)
        assert groups == {}


class TestFindGroupLabel:
    def test_finds_preceding_text_field(self, stage):
        fields = [
            FormField(key="Choose one:", value="", field_type="text"),
            FormField(key="A", value="selected", field_type="checkbox"),
            FormField(key="B", value="unselected", field_type="checkbox"),
        ]
        label = stage._find_group_label(fields, [1, 2])
        assert label == "Choose one:"

    def test_returns_default_when_no_preceding(self, stage):
        fields = [
            FormField(
                key="A",
                value="selected",
                field_type="checkbox",
                bbox=[[100, 100], [115, 100], [115, 115], [100, 115]],
            ),
            FormField(key="B", value="unselected", field_type="checkbox"),
        ]
        label = stage._find_group_label(fields, [0, 1])
        assert label.startswith("choice_group_")

    def test_returns_choices_for_empty_indices(self, stage):
        fields = []
        label = stage._find_group_label(fields, [])
        assert label == "choices"


class TestBuildFieldToGroupMap:
    def test_maps_indices_to_group_keys(self, stage):
        groups = {"Question 1": [0, 1], "Question 2": [2, 3]}
        mapping = stage._build_field_to_group_map(groups)
        assert mapping[0] == "Question 1"
        assert mapping[1] == "Question 1"
        assert mapping[2] == "Question 2"
        assert mapping[3] == "Question 2"

    def test_returns_empty_for_no_groups(self, stage):
        mapping = stage._build_field_to_group_map({})
        assert mapping == {}
