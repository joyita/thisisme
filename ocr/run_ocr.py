#!/usr/bin/env python3
"""Run script for OCR pipeline."""

import argparse
import json
import logging
import sys
from pathlib import Path

from ocr_pipeline import OCRPipeline, PipelineConfig


def load_images(directory: Path, extensions: tuple[str, ...] = (".jpg", ".jpeg", ".png", ".bmp", ".tiff")) -> list[Path]:
    """Find all image files in directory."""
    images = []
    for ext in extensions:
        images.extend(directory.glob(f"*{ext}"))
        images.extend(directory.glob(f"*{ext.upper()}"))
    return sorted(images)


def main():
    parser = argparse.ArgumentParser(description="OCR Form Processing Pipeline")
    parser.add_argument(
        "input",
        nargs="?",
        default=".",
        help="Input image file or directory (default: current directory)",
    )
    parser.add_argument(
        "--schema",
        "-s",
        type=Path,
        default=Path("schema_mapping.csv"),
        help="Path to schema mapping CSV file",
    )
    parser.add_argument(
        "--threshold",
        "-t",
        type=float,
        default=0.80,
        help="Levenshtein matching threshold (default: 0.80)",
    )
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="Output file path (default: stdout)",
    )
    parser.add_argument(
        "--no-gpu",
        action="store_true",
        help="Disable GPU acceleration (GPU enabled by default)",
    )
    parser.add_argument(
        "--lang",
        default="en",
        help="OCR language (default: en)",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Enable verbose logging",
    )
    parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="Suppress all logging output",
    )

    args = parser.parse_args()

    # Configure logging
    if args.quiet:
        log_level = "ERROR"
    elif args.verbose:
        log_level = "DEBUG"
    else:
        log_level = "INFO"

    # Build config
    config = PipelineConfig(
        schema_mapping_path=args.schema if args.schema.exists() else None,
        levenshtein_threshold=args.threshold,
        lang=args.lang,
        use_gpu=not args.no_gpu,
        log_level=log_level,
    )

    # Initialize pipeline
    pipeline = OCRPipeline(config)

    # Determine input files
    input_path = Path(args.input)

    if input_path.is_file():
        image_paths = [input_path]
    elif input_path.is_dir():
        image_paths = load_images(input_path)
        if not image_paths:
            logging.error(f"No image files found in {input_path}")
            sys.exit(1)
    else:
        logging.error(f"Input path does not exist: {input_path}")
        sys.exit(1)

    logging.info(f"Processing {len(image_paths)} image(s)")

    # Process images
    results = []
    for image_path in image_paths:
        result = pipeline.process(image_path)
        result["source_file"] = str(image_path)
        results.append(result)

    # Output results
    output_data = results if len(results) > 1 else results[0]
    json_output = json.dumps(output_data, indent=2, ensure_ascii=False)

    if args.output:
        args.output.write_text(json_output)
        logging.info(f"Output written to {args.output}")
    else:
        print(json_output)


if __name__ == "__main__":
    main()
