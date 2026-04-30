# File Tools

A self-hosted web app for compressing images, compressing PDFs, and merging PDFs — all processed locally in your browser.

## Features

- **Compress Image** — Drag and drop an image, adjust the quality slider (1–100), and download the result. JPEGs are re-encoded with the chosen quality. PNGs with quality ≥ 50 keep transparency; below 50 they convert to JPEG for aggressive size reduction. WebP is preserved natively.
- **Compress PDF** — Quality slider (1–100) plus a Target DPI slider (72–300). Images above the target DPI are downsampled; images already below it are compressed more aggressively since extra quality wouldn't be visible. Duplicate images (shared xrefs) are processed only once.
- **Merge PDFs** — Upload multiple PDFs, reorder them by drag-and-drop, remove individual files, then merge into a single PDF.
- **i18n** — 7 languages: English, Français, 中文 (简体), 中文 (繁體), 한국어, 日本語, हिन्दी. Auto-detected from the browser; manually switchable.
- **Real-time upload progress** — Progress bars track upload status for all operations.
- **Before/after stats** — Original size, compressed size, and reduction percentage (or file count + result size for merges).

All processing happens on your machine. Nothing is uploaded to the cloud.

## Requirements

- Python 3.10+
- [Pillow](https://python-pillow.org/) — image processing
- [PyMuPDF](https://pymupdf.readthedocs.io/) — PDF processing

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```bash
python3 main.py
```

Open [http://localhost:8000](http://localhost:8000) in your browser.

## API Endpoints

| Method | Path | Parameters | Description |
|--------|------|------------|-------------|
| POST | `/api/compress-image` | `file` (multipart), `quality` (1–100) | Compress an image |
| POST | `/api/compress-pdf` | `file` (multipart), `quality` (1–100), `dpi` (72–300) | Compress a PDF |
| POST | `/api/merge-pdf` | `files` (multipart, multiple) | Merge multiple PDFs |

All endpoints return the processed file as a streaming download response.

## Project Structure

```
file_tools/
├── main.py              # FastAPI backend
├── requirements.txt     # Python dependencies
├── static/
│   ├── index.html       # Single-page frontend
│   ├── app.js           # Vanilla JS (tabs, upload, drag-and-drop)
│   ├── i18n.js          # i18n engine with auto-detection
│   ├── styles.css       # Stylesheet
│   └── lang/            # Per-locale JSON translation files
└── README.md
```

## License

MIT
