# OCR Pipeline

Extract text and form data from images using PaddleOCR.

## Install

```bash
pip install -r requirements.txt
```

## Usage

```bash
# Process single image
python run_ocr.py image.jpg

# Process directory of images
python run_ocr.py ./images/

# Save output to file
python run_ocr.py image.jpg -o output.json

# Disable GPU (GPU enabled by default)
python run_ocr.py image.jpg --no-gpu

# With custom schema mapping
python run_ocr.py image.jpg --schema schema_mapping.csv
```

## Tests

```bash
# Run test suite
python -m pytest tests/test_pipeline.py
```

## Options

| Flag | Description |
|------|-------------|
| `-o, --output` | Output file path (default: stdout) |
| `-s, --schema` | Schema mapping CSV file |
| `-t, --threshold` | Levenshtein threshold (default: 0.80) |
| `--no-gpu` | Disable GPU (enabled by default) |
| `--lang` | OCR language (default: en) |
| `-v, --verbose` | Verbose logging |
| `-q, --quiet` | Suppress logging |
