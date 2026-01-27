import logging
import re
from datetime import datetime, timezone

from .base import PipelineStage, PipelineContext, FormSection
from ..services import ClassificationService, NameService, MockClassificationService, MockNameService

logger = logging.getLogger(__name__)

DATE_PATTERNS = [
    r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}",
    r"\d{1,2}\s+\w+\s+\d{4}",
    r"\d{4}[/-]\d{1,2}[/-]\d{1,2}",
]

DATE_FIELD_KEYWORDS = ["date", "dob", "d.o.b"]


class MetadataEnricherStage(PipelineStage):
    def __init__(
        self,
        classification_service: ClassificationService | None = None,
        name_service: NameService | None = None,
    ):
        self.classification_service = classification_service or MockClassificationService()
        self.name_service = name_service or MockNameService()

    @property
    def name(self) -> str:
        return "MetadataEnricher"

    def process(self, context: PipelineContext) -> PipelineContext:
        logger.info("Enriching with metadata")

        extracted_date = _extract_date(context.sections)

        context.metadata.update({
            "name": self.name_service.get_name(),
            "classification": self.classification_service.get_classification(),
            "date": extracted_date,
            "upload_date": datetime.now(timezone.utc).isoformat(),
        })

        return context


def _extract_date(sections: list[FormSection]) -> str | None:
    for section in sections:
        for field in section.fields:
            key_lower = field.key.lower()
            if any(kw in key_lower for kw in DATE_FIELD_KEYWORDS):
                value = str(field.value)
                for pattern in DATE_PATTERNS:
                    match = re.search(pattern, value)
                    if match:
                        return match.group()

            value = str(field.value)
            for pattern in DATE_PATTERNS:
                match = re.search(pattern, value)
                if match:
                    return match.group()

    return None
