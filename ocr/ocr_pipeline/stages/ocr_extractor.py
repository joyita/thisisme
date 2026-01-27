import logging

from paddleocr import PaddleOCR

from .base import PipelineStage, PipelineContext, OCRResult

logger = logging.getLogger(__name__)


class OCRExtractorStage(PipelineStage):
    def __init__(self, lang: str = "en", use_gpu: bool = True):
        self.lang = lang
        self.use_gpu = use_gpu
        self._ocr: PaddleOCR | None = None

    @property
    def name(self) -> str:
        return "OCRExtractor"

    @property
    def ocr(self) -> PaddleOCR:
        if self._ocr is None:
            device = "gpu" if self.use_gpu else "cpu"
            logger.info("Initializing PaddleOCR engine (device: %s)", device)
            self._ocr = PaddleOCR(
                lang=self.lang,
                device=device,
                use_textline_orientation=True,
            )
        return self._ocr

    def process(self, context: PipelineContext) -> PipelineContext:
        if context.image is None:
            context.errors.append("No image available for OCR")
            return context

        logger.info("Running OCR extraction")

        results = self.ocr.predict(context.image)

        if not results:
            logger.warning("No text detected in image")
            return context

        ocr_results = []
        for result in results:
            rec_texts = result.get("rec_texts", [])
            rec_scores = result.get("rec_scores", [])
            dt_polys = result.get("dt_polys", [])

            for i, text in enumerate(rec_texts):
                if not text.strip():
                    continue

                bbox = dt_polys[i].astype(int).tolist() if i < len(dt_polys) else [[0, 0], [0, 0], [0, 0], [0, 0]]
                confidence = rec_scores[i] if i < len(rec_scores) else 0.0

                ocr_results.append(
                    OCRResult(text=text, bbox=bbox, confidence=confidence)
                )

        context.ocr_results = ocr_results
        logger.info(f"Extracted {len(ocr_results)} text regions")

        return context
