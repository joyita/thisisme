import logging

import cv2
import numpy as np

from ..base import OCRResult
from .types import DetectedBox, Checkbox
from .constants import (
    SECTION_NAME_Y_TOLERANCE,
    BOLD_INK_DENSITY_THRESHOLD,
    CHECKBOX_FILL_THRESHOLD,
    CHECKBOX_ASPECT_MIN,
    CHECKBOX_ASPECT_MAX,
    SECTION_BOX_ASPECT_MIN,
    SECTION_BOX_MIN_HEIGHT,
    MIN_BOX_AREA_RATIO,
    MAX_BOX_AREA_RATIO,
    OVERLAP_THRESHOLD,
    TEXT_BOX_MARGIN,
    CANNY_THRESHOLD_LOW,
    CANNY_THRESHOLD_HIGH,
    CONTOUR_APPROX_EPSILON,
    DILATE_KERNEL_SIZE,
    BINARY_THRESHOLD,
)

logger = logging.getLogger(__name__)


def detect_section_boxes(
    image: np.ndarray, ocr_results: list[OCRResult]
) -> list[DetectedBox]:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(gray, CANNY_THRESHOLD_LOW, CANNY_THRESHOLD_HIGH)

    kernel = np.ones((DILATE_KERNEL_SIZE, DILATE_KERNEL_SIZE), np.uint8)
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    img_area = image.shape[0] * image.shape[1]
    min_box_area = img_area * MIN_BOX_AREA_RATIO
    max_box_area = img_area * MAX_BOX_AREA_RATIO

    boxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_box_area < area < max_box_area:
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, CONTOUR_APPROX_EPSILON * peri, True)

            if len(approx) >= 4:
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h if h > 0 else 0

                if aspect_ratio > SECTION_BOX_ASPECT_MIN and h > SECTION_BOX_MIN_HEIGHT:
                    box_name = _find_section_name(x, y, w, ocr_results)
                    boxes.append(DetectedBox(x=x, y=y, width=w, height=h, name=box_name))

    boxes = _remove_overlapping_boxes(boxes)
    boxes.sort(key=lambda b: b.y)

    logger.debug(f"Detected {len(boxes)} section boxes")
    return boxes


def detect_checkboxes(
    image: np.ndarray,
    ocr_results: list[OCRResult],
    min_area: int,
    max_area: int,
) -> list[Checkbox]:
    gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, BINARY_THRESHOLD, 255, cv2.THRESH_BINARY_INV)

    contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)

    checkboxes = []
    for contour in contours:
        area = cv2.contourArea(contour)
        if min_area < area < max_area:
            x, y, w, h = cv2.boundingRect(contour)
            aspect_ratio = w / h if h > 0 else 0

            if CHECKBOX_ASPECT_MIN < aspect_ratio < CHECKBOX_ASPECT_MAX:
                roi = binary[y : y + h, x : x + w]
                fill_ratio = np.sum(roi > 0) / (w * h) if w * h > 0 else 0
                pixel_filled = fill_ratio > CHECKBOX_FILL_THRESHOLD

                has_ocr_text = _has_text_inside_box(x, y, w, h, ocr_results)
                is_filled = pixel_filled or has_ocr_text

                checkboxes.append(Checkbox(x=x, y=y, width=w, height=h, filled=is_filled))

    return checkboxes


def detect_bold_text(result: OCRResult, image: np.ndarray) -> bool:
    x1, y1 = result.x_min, result.y_min
    x2, y2 = result.x_max, result.y_max

    x1, y1 = max(0, x1), max(0, y1)
    x2, y2 = min(image.shape[1], x2), min(image.shape[0], y2)

    if x2 <= x1 or y2 <= y1:
        return False

    roi = image[y1:y2, x1:x2]
    if roi.size == 0:
        return False

    gray = cv2.cvtColor(roi, cv2.COLOR_RGB2GRAY)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    ink_density = np.sum(binary > 0) / binary.size
    return ink_density > BOLD_INK_DENSITY_THRESHOLD


def _find_section_name(
    box_x: int, box_y: int, box_w: int, ocr_results: list[OCRResult]
) -> str:
    candidates = []
    for result in ocr_results:
        if (box_x <= result.x_min <= box_x + box_w and
            abs(result.y_min - box_y) < SECTION_NAME_Y_TOLERANCE):
            candidates.append(result)

    if candidates:
        candidates.sort(key=lambda r: (r.y_min, r.x_min))
        return candidates[0].text.strip()
    return ""


def _remove_overlapping_boxes(boxes: list[DetectedBox]) -> list[DetectedBox]:
    if not boxes:
        return boxes

    boxes_sorted = sorted(boxes, key=lambda b: b.width * b.height, reverse=True)
    kept = []

    for box in boxes_sorted:
        overlaps = False
        for kept_box in kept:
            x_overlap = max(0, min(box.x + box.width, kept_box.x + kept_box.width) - max(box.x, kept_box.x))
            y_overlap = max(0, min(box.y + box.height, kept_box.y + kept_box.height) - max(box.y, kept_box.y))
            overlap_area = x_overlap * y_overlap
            box_area = box.width * box.height

            if box_area > 0 and overlap_area / box_area > OVERLAP_THRESHOLD:
                overlaps = True
                break

        if not overlaps:
            kept.append(box)

    return kept


def _has_text_inside_box(
    x: int, y: int, w: int, h: int, ocr_results: list[OCRResult]
) -> bool:
    for result in ocr_results:
        result_cx = (result.x_min + result.x_max) / 2
        result_cy = (result.y_min + result.y_max) / 2

        if (x - TEXT_BOX_MARGIN <= result_cx <= x + w + TEXT_BOX_MARGIN and
            y - TEXT_BOX_MARGIN <= result_cy <= y + h + TEXT_BOX_MARGIN):
            if result.text.strip():
                return True
    return False
