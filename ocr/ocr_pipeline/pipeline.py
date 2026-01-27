import logging
from pathlib import Path
from typing import Any

from .config import PipelineConfig
from .stages import (
    PipelineContext,
    ImageLoaderStage,
    OCRExtractorStage,
    LayoutAnalyzerStage,
    StructureBuilderStage,
    MetadataEnricherStage,
)
from .utils import SchemaMapper
from .services import MockClassificationService, MockNameService

logger = logging.getLogger(__name__)


def _build_output(context: PipelineContext) -> dict[str, Any]:
    output = {
        "metadata": context.metadata,
        "form": context.form_data,
    }

    if context.errors:
        output["errors"] = context.errors

    return output


class OCRPipeline:
    def __init__(self, config: PipelineConfig | None = None):
        self.config = config or PipelineConfig()
        self._setup_logging()
        self._initialize_stages()

    def _setup_logging(self) -> None:
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        )

    def _initialize_stages(self) -> None:
        self.schema_mapper = SchemaMapper(
            mapping_path=self.config.schema_mapping_path,
            threshold=self.config.levenshtein_threshold,
        )
        self.classification_service = MockClassificationService()
        self.name_service = MockNameService()

        self.stages = [
            ImageLoaderStage(),
            OCRExtractorStage(lang=self.config.lang, use_gpu=self.config.use_gpu),
            LayoutAnalyzerStage(
                header_height_multiplier=self.config.header_height_multiplier,
                checkbox_min_area=self.config.checkbox_min_area,
                checkbox_max_area=self.config.checkbox_max_area,
            ),
            StructureBuilderStage(schema_mapper=self.schema_mapper),
            MetadataEnricherStage(
                classification_service=self.classification_service,
                name_service=self.name_service,
            ),
        ]

    def process(self, image_path: str | Path) -> dict[str, Any]:
        logger.info(f"Processing form: {image_path}")

        context = PipelineContext(image_path=Path(image_path))

        for stage in self.stages:
            logger.debug(f"Running stage: {stage.name}")
            try:
                context = stage.process(context)
            except Exception as e:
                logger.error(f"Stage {stage.name} failed: {e}")
                context.errors.append(f"{stage.name}: {str(e)}")

            if context.errors:
                logger.warning(f"Errors encountered: {context.errors}")

        return _build_output(context)
