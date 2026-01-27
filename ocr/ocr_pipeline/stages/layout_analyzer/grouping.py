import logging

from ..base import OCRResult, FormSection, FormField
from .types import DetectedBox, Checkbox
from .constants import (
    MAX_Y_COORDINATE,
    MAX_CHECKBOX_DISTANCE,
    LABEL_SUFFIXES,
)

logger = logging.getLogger(__name__)


def group_into_sections(
    results: list[OCRResult],
    headers: list[OCRResult],
    section_boxes: list[DetectedBox],
    checkboxes: list[Checkbox],
) -> list[FormSection]:
    sorted_results = sorted(results, key=lambda r: r.y_min)
    sorted_headers = sorted(headers, key=lambda h: h.y_min)
    header_ids = set(id(h) for h in headers)

    sections = _create_sections(sorted_headers, section_boxes)

    for result in sorted_results:
        if id(result) in header_ids:
            continue

        target_section = _assign_to_section(result, sections)
        field = _build_field(result, checkboxes, sorted_results)
        target_section.fields.append(field)

    return sections


def _create_sections(
    sorted_headers: list[OCRResult], section_boxes: list[DetectedBox]
) -> list[FormSection]:
    sections = []

    if sorted_headers:
        for i, header in enumerate(sorted_headers):
            y_end = sorted_headers[i + 1].y_min if i + 1 < len(sorted_headers) else MAX_Y_COORDINATE
            sections.append(
                FormSection(
                    name=header.text.strip(),
                    y_start=header.y_max,
                    y_end=y_end,
                )
            )
        logger.debug(f"Using {len(sorted_headers)} header-based sections")
    elif section_boxes:
        for box in section_boxes:
            sections.append(
                FormSection(
                    name=box.name or "Section",
                    y_start=box.y,
                    y_end=box.y_end,
                )
            )
        logger.debug(f"Using {len(section_boxes)} visual section boxes")
    else:
        sections.append(FormSection(name="Form Data", y_start=0, y_end=MAX_Y_COORDINATE))

    return sections


def _assign_to_section(result: OCRResult, sections: list[FormSection]) -> FormSection:
    for section in sections:
        if section.y_start <= result.y_min < section.y_end:
            return section
    return sections[-1]


def _build_field(
    result: OCRResult,
    checkboxes: list[Checkbox],
    all_results: list[OCRResult],
) -> FormField:
    checkbox = _find_checkbox_left_of(result, checkboxes)

    if checkbox:
        return FormField(
            key=result.text.strip(),
            value="selected" if checkbox.filled else "unselected",
            field_type="checkbox",
            bbox=result.bbox,
        )

    text = result.text.strip()
    if _is_label(text):
        value = _find_value_for_label(result, all_results)
        return FormField(
            key=text,
            value=value if value else "empty",
            field_type="text",
            bbox=result.bbox,
        )

    return FormField(
        key=text,
        value="empty",
        field_type="text",
        bbox=result.bbox,
    )


def _find_checkbox_left_of(
    result: OCRResult, checkboxes: list[Checkbox]
) -> Checkbox | None:
    text_left_edge = result.x_min
    text_center_y = result.center_y

    nearest = None
    min_dist = float("inf")

    for cb in checkboxes:
        cb_center_x, cb_center_y = cb.center
        if cb_center_x < text_left_edge:
            dist = (
                (text_left_edge - cb_center_x) ** 2
                + (text_center_y - cb_center_y) ** 2
            ) ** 0.5

            if dist < min_dist and dist < MAX_CHECKBOX_DISTANCE:
                min_dist = dist
                nearest = cb

    return nearest


def _is_label(text: str) -> bool:
    return any(text.endswith(suffix) or text.endswith(suffix + " ") for suffix in LABEL_SUFFIXES)


def _find_value_for_label(
    label: OCRResult, all_results: list[OCRResult]
) -> str | None:
    same_line_threshold = label.height * 0.5
    candidates = []

    for result in all_results:
        if result is label:
            continue

        if abs(result.center_y - label.center_y) < same_line_threshold:
            if result.x_min > label.x_max:
                distance = result.x_min - label.x_max
                candidates.append((distance, result))

    if candidates:
        candidates.sort(key=lambda c: c[0])
        return candidates[0][1].text.strip()

    return None
