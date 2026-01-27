import logging
from typing import Any

from .base import PipelineStage, PipelineContext, FormSection, FormField
from ..utils.schema_mapper import SchemaMapper
from .layout_analyzer.constants import SAME_ROW_Y_TOLERANCE

logger = logging.getLogger(__name__)

MIN_MULTIPLE_CHOICE_COUNT = 2


class StructureBuilderStage(PipelineStage):
    def __init__(self, schema_mapper: SchemaMapper):
        self.schema_mapper = schema_mapper

    @property
    def name(self) -> str:
        return "StructureBuilder"

    def process(self, context: PipelineContext) -> PipelineContext:
        if not context.sections:
            logger.warning("No sections to build structure from")
            return context

        logger.info("Building structured output")

        form_data = {"sections": []}

        for section in context.sections:
            section_data = self._build_section(section)
            form_data["sections"].append(section_data)

        context.form_data = form_data
        return context

    def _build_section(self, section: FormSection) -> dict[str, Any]:
        section_data = {
            "name": self.schema_mapper.map_key(section.name),
            "fields": [],
        }

        multiple_choice_groups = self._identify_multiple_choice_groups(section.fields)
        field_to_group = self._build_field_to_group_map(multiple_choice_groups)
        processed_indices: set[int] = set()

        for i, field in enumerate(section.fields):
            if i in processed_indices:
                continue

            group_key = field_to_group.get(i)

            if group_key is not None:
                group_indices = multiple_choice_groups[group_key]
                choices = {}

                for idx in group_indices:
                    f = section.fields[idx]
                    choice_key = self.schema_mapper.map_key(f.key)
                    choices[choice_key] = f.value
                    processed_indices.add(idx)

                mapped_question = self.schema_mapper.map_key(group_key)
                section_data["fields"].append({
                    "question": mapped_question,
                    "answer": choices,
                })
            else:
                mapped_question = self.schema_mapper.map_key(field.key)
                section_data["fields"].append({
                    "question": mapped_question,
                    "answer": field.value,
                })

        return section_data

    def _identify_multiple_choice_groups(
        self, fields: list[FormField]
    ) -> dict[str, list[int]]:
        groups: dict[str, list[int]] = {}

        checkbox_indices = [
            i for i, f in enumerate(fields) if f.field_type == "checkbox"
        ]

        if len(checkbox_indices) < MIN_MULTIPLE_CHOICE_COUNT:
            return groups

        current_group: list[int] = []
        group_y: int | None = None

        for idx in checkbox_indices:
            field = fields[idx]
            y_pos = field.bbox[0][1] if field.bbox else 0

            if group_y is None:
                current_group = [idx]
                group_y = y_pos
            elif abs(y_pos - group_y) < SAME_ROW_Y_TOLERANCE:
                current_group.append(idx)
            else:
                if len(current_group) >= MIN_MULTIPLE_CHOICE_COUNT:
                    group_name = self._find_group_label(fields, current_group)
                    groups[group_name] = current_group

                current_group = [idx]
                group_y = y_pos

        if len(current_group) >= MIN_MULTIPLE_CHOICE_COUNT:
            group_name = self._find_group_label(fields, current_group)
            groups[group_name] = current_group

        return groups

    def _build_field_to_group_map(
        self, groups: dict[str, list[int]]
    ) -> dict[int, str]:
        field_to_group: dict[int, str] = {}
        for key, indices in groups.items():
            for idx in indices:
                field_to_group[idx] = key
        return field_to_group

    def _find_group_label(self, fields: list[FormField], indices: list[int]) -> str:
        if not indices:
            return "choices"

        first_idx = min(indices)
        first_field = fields[first_idx]

        for i in range(first_idx - 1, -1, -1):
            if fields[i].field_type != "checkbox":
                return fields[i].key

        return f"choice_group_{first_field.bbox[0][1] if first_field.bbox else 0}"
