# File Tools

A local web app for compressing images, compressing PDFs, and merging PDF files.

## Features

- **Compress Image** — Drag and drop an image, adjust quality with a slider, see before/after size comparison, and download.
- **Compress PDF** — Same workflow for PDF files with granular compression control.
- **Merge PDFs** — Drop multiple PDFs, reorder them by dragging, then merge into a single file.

All tabs support drag-and-drop and file picker. Progress bars show upload status. Downloads use the browser's Save As dialog.

## Requirements

- Python 3.10+
- Pillow (image processing)
- PyMuPDF (PDF processing)

## Setup

```bash
pip install -r requirements.txt
```

## Usage

```bash
python3 main.py
```

Open [http://localhost:8000](http://localhost:8000) in a browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/compress-image` | Compress an image (multipart: `file` + `quality` 1-100) |
| POST | `/api/compress-pdf` | Compress a PDF (multipart: `file` + `quality` 1-100) |
| POST | `/api/merge-pdf` | Merge PDFs (multipart: `files`, multiple) |
