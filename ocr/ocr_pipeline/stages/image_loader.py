import logging
from pathlib import Path

import cv2

from .base import PipelineStage, PipelineContext

logger = logging.getLogger(__name__)


class ImageLoaderStage(PipelineStage):
    @property
    def name(self) -> str:
        return "ImageLoader"

    def process(self, context: PipelineContext) -> PipelineContext:
        if context.image_path is None:
            context.errors.append("No image path provided")
            return context

        path = Path(context.image_path)
        if not path.exists():
            context.errors.append(f"Image file not found: {path}")
            return context

        logger.info(f"Loading image: {path}")

        image = cv2.imread(str(path))
        if image is None:
            context.errors.append(f"Failed to load image: {path}")
            return context

        image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        context.image = image

        logger.debug(f"Image loaded: {image.shape}")
        return context
