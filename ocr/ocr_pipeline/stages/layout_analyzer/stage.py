import logging
import re

import numpy as np

from ..base import PipelineStage, PipelineContext, OCRResult
from .detection import detect_section_boxes, detect_checkboxes, detect_bold_text
from .grouping import group_into_sections
from .constants import HEADER_PATTERNS

logger = logging.getLogger(__name__)


class LayoutAnalyzerStage(PipelineStage):
    def __init__(
        self,
        header_height_multiplier: float = 1.3,
        checkbox_min_area: int = 100,
        checkbox_max_area: int = 2000,
    ):
        self.header_height_multiplier = header_height_multiplier
        self.checkbox_min_area = checkbox_min_area
        self.checkbox_max_area = checkbox_max_area

    @property
    def name(self) -> str:
        return "LayoutAnalyzer"

    def process(self, context: PipelineContext) -> PipelineContext:
        if not context.ocr_results:
            logger.warning("No OCR results to analyze")
            return context

        logger.info("Analyzing form layout")

        avg_height = sum(r.height for r in context.ocr_results) / len(context.ocr_results)

        section_boxes = []
        if context.image is not None:
            section_boxes = detect_section_boxes(context.image, context.ocr_results)

        headers = self._identify_headers(context.ocr_results, avg_height, context.image)

        checkboxes = []
        if context.image is not None:
            checkboxes = detect_checkboxes(
                context.image,
                context.ocr_results,
                self.checkbox_min_area,
                self.checkbox_max_area,
            )

        sections = group_into_sections(
            context.ocr_results, headers, section_boxes, checkboxes
        )

        context.sections = sections
        logger.info(f"Identified {len(sections)} sections with {sum(len(s.fields) for s in sections)} fields")

        return context

    def _identify_headers(
        self, results: list[OCRResult], avg_height: float, image: np.ndarray | None
    ) -> list[OCRResult]:
        headers = []
        threshold = avg_height * self.header_height_multiplier

        for result in results:
            is_header = False

            if result.height > threshold:
                is_header = True

            for pattern in HEADER_PATTERNS:
                if re.match(pattern, result.text.upper()):
                    is_header = True
                    break

            if not is_header and image is not None:
                is_header = detect_bold_text(result, image)

            if is_header:
                headers.append(result)

        return headers
