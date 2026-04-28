# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **Run server**: `python3 main.py` (serves on http://localhost:8000 with hot-reload)
- **Install dependencies**: `pip install -r requirements.txt`

## Architecture

Single-page web app with a Python FastAPI backend and vanilla JS frontend:

### Backend (`main.py`)
- **FastAPI** app serving a REST API and the static frontend
- **Compress Image** (`POST /api/compress-image`): Accepts image + quality parameter. Uses Pillow to re-encode. Converts PNG to JPEG when quality < 50 for aggressive compression. Preserves alpha on higher-quality PNGs. Handles JPEG, PNG, WebP.
- **Compress PDF** (`POST /api/compress-pdf`): Accepts PDF + quality parameter. Uses PyMuPDF to iterate page images and recompress each as JPEG via `page.replace_image()`. Skips images <1KB. Falls back to `garbage=4`, `deflate`, `clean` options on save.
- **Merge PDF** (`POST /api/merge-pdf`): Accepts multiple PDF files. Uses PyMuPDF `insert_pdf()` to concatenate pages. Saves with deflate + garbage collection.
- **Root** (`GET /`): Serves `static/index.html` directly.

### Frontend (`static/`)
- **`index.html`**: Single page with three tab sections (Compress Image, Compress PDF, Merge PDFs). Each tab has a drop zone, quality slider (image/pdf compress), controls, results panel, and progress bar.
- **`app.js`**: Vanilla JS with no framework. Tab switching via data attributes. Reusable `initCompressTab()` function for the two compress tabs. Merge tab has its own logic including drag-to-reorder list. All uploads use `XMLHttpRequest` with `upload.onprogress` for real-time progress bars.
- **`styles.css`**: Clean single-file stylesheet. Blue accent color, card-based layout.

### Key patterns
- File processing is entirely server-side; frontend sends the file and gets back a processed blob for download.
- Progress bars track upload progress only (not server processing).
- Results show original size, compressed size, and reduction percentage.
- No database, no persistence — everything is stateless request/response.
