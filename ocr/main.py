"""FastAPI microservice wrapper for OCR pipeline and document classification."""

import logging
import tempfile
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ocr_pipeline import OCRPipeline, PipelineConfig
from classification import DocumentClassifier

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="ThisIsMe OCR & Classification Service",
    description="Document OCR, form extraction, and classification microservice",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services on startup
pipeline: Optional[OCRPipeline] = None
classifier: Optional[DocumentClassifier] = None


class HealthResponse(BaseModel):
    status: str
    version: str
    services: dict


class ClassificationResponse(BaseModel):
    category_id: str
    category_name: str
    timeline_entry_type: str
    confidence: float
    method: str
    matched_keywords: list[str]


class OCRResponse(BaseModel):
    success: bool
    data: dict
    classification: Optional[ClassificationResponse] = None
    source_file: Optional[str] = None


@app.on_event("startup")
async def startup_event():
    """Initialize OCR pipeline and classifier on startup."""
    global pipeline, classifier

    logger.info("Initializing OCR pipeline...")
    schema_path = Path("schema_mapping.csv")
    config = PipelineConfig(
        schema_mapping_path=schema_path if schema_path.exists() else None,
        levenshtein_threshold=0.80,
        lang="en",
        use_gpu=False,  # CPU mode for broader compatibility
        log_level="INFO",
    )
    pipeline = OCRPipeline(config)
    logger.info("OCR pipeline initialized")

    logger.info("Initializing document classifier...")
    classifier = DocumentClassifier(use_semantic=True)
    logger.info("Document classifier initialized")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        version="1.1.0",
        services={
            "ocr": pipeline is not None,
            "classification": classifier is not None,
        }
    )


@app.post("/ocr", response_model=OCRResponse)
async def process_image(
    file: UploadFile = File(..., description="Image file to process"),
    threshold: float = Query(0.80, ge=0.0, le=1.0, description="Matching threshold"),
    lang: str = Query("en", description="OCR language"),
    classify: bool = Query(True, description="Also classify the document"),
):
    """Process an image file, extract structured data, and optionally classify."""
    if pipeline is None:
        raise HTTPException(status_code=503, detail="OCR pipeline not initialized")

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        contents = await file.read()

        with tempfile.NamedTemporaryFile(suffix=Path(file.filename or "image.jpg").suffix, delete=False) as tmp:
            tmp.write(contents)
            tmp_path = Path(tmp.name)

        try:
            result = pipeline.process(tmp_path)

            # Classify the document if requested
            classification = None
            if classify and classifier is not None:
                # Build text from OCR result for classification
                text_parts = []
                if "form" in result:
                    for key, value in result["form"].items():
                        text_parts.append(f"{key}: {value}")
                if "metadata" in result:
                    if "raw_text" in result["metadata"]:
                        text_parts.append(result["metadata"]["raw_text"])

                full_text = "\n".join(text_parts)
                if full_text.strip():
                    class_result = classifier.classify(full_text)
                    classification = ClassificationResponse(
                        category_id=class_result.category_id,
                        category_name=class_result.category_name,
                        timeline_entry_type=class_result.timeline_entry_type,
                        confidence=class_result.confidence,
                        method=class_result.method,
                        matched_keywords=class_result.matched_keywords,
                    )

            return OCRResponse(
                success=True,
                data=result,
                classification=classification,
                source_file=file.filename,
            )
        finally:
            tmp_path.unlink(missing_ok=True)

    except Exception as e:
        logger.exception("OCR processing failed")
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")


class ClassifyRequest(BaseModel):
    text: str


@app.post("/classify", response_model=ClassificationResponse)
async def classify_text(request: ClassifyRequest):
    """Classify document text without OCR."""
    if classifier is None:
        raise HTTPException(status_code=503, detail="Classifier not initialized")

    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        result = classifier.classify(request.text)
        return ClassificationResponse(
            category_id=result.category_id,
            category_name=result.category_name,
            timeline_entry_type=result.timeline_entry_type,
            confidence=result.confidence,
            method=result.method,
            matched_keywords=result.matched_keywords,
        )
    except Exception as e:
        logger.exception("Classification failed")
        raise HTTPException(status_code=500, detail=f"Classification failed: {str(e)}")


@app.post("/ocr/batch", response_model=list[OCRResponse])
async def process_batch(
    files: list[UploadFile] = File(..., description="Image files to process"),
    threshold: float = Query(0.80, ge=0.0, le=1.0, description="Matching threshold"),
):
    """Process multiple image files."""
    results = []
    for file in files:
        try:
            result = await process_image(file, threshold)
            results.append(result)
        except HTTPException as e:
            results.append(OCRResponse(
                success=False,
                data={"error": e.detail},
                source_file=file.filename,
            ))
    return results


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)
