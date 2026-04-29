import io
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
import fitz  # PyMuPDF

app = FastAPI(title="File Tools")

app.mount("/static", StaticFiles(directory="static"), name="static")

# ---------- Image Compression ----------

@app.post("/api/compress-image")
async def compress_image(file: UploadFile = File(...), quality: int = Form(80)):
    contents = await file.read()
    img = Image.open(io.BytesIO(contents))

    original_format = img.format or "JPEG"
    # Preserve alpha channel if present
    needs_convert = original_format in ("PNG", "WEBP")

    buf = io.BytesIO()
    if original_format == "PNG":
        if quality < 50:
            # Convert to JPEG for aggressive compression
            img = img.convert("RGB")
            buf = io.BytesIO()
            img.save(buf, format="JPEG", quality=quality, optimize=True)
            ext = "jpg"
            content_type = "image/jpeg"
        else:
            img.save(buf, format="PNG", optimize=True)
            ext = "png"
            content_type = "image/png"
    elif original_format == "WEBP":
        img.save(buf, format="WEBP", quality=quality)
        ext = "webp"
        content_type = "image/webp"
    else:
        # JPEG and others
        if img.mode in ("P", "RGBA"):
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=quality, optimize=True)
        ext = "jpg"
        content_type = "image/jpeg"

    buf.seek(0)
    stem = file.filename.rsplit(".", 1)[0] if file.filename else "image"
    return StreamingResponse(
        buf,
        media_type=content_type,
        headers={"Content-Disposition": f'attachment; filename="{stem}_compressed.{ext}"'},
    )


# ---------- PDF Compression ----------

def _recompress_pdf_images(doc: fitz.Document, quality: int, target_dpi: int = 150):
    """Recompress images in the PDF, accounting for effective DPI.

    Images whose effective DPI exceeds *target_dpi* are downsampled to that
    resolution before JPEG re-encoding.  Images below the target DPI are
    kept at their original pixel dimensions but compressed at a proportionally
    lower quality — the visual quality is already pixel-limited, so more
    aggressive compression is safe.
    """
    processed_xrefs: set[int] = set()

    for page in doc:
        for img in page.get_images():
            xref = img[0]
            if xref in processed_xrefs:
                continue
            processed_xrefs.add(xref)

            try:
                pix = fitz.Pixmap(doc, xref)
            except Exception:
                continue

            # Determine where (and how large) the image is displayed.
            img_rects = page.get_image_rects(xref)
            if not img_rects:
                continue

            # Use the largest placement for quality decisions.
            display_rect = max(img_rects, key=lambda r: r.width * r.height)
            display_w_in = display_rect.width / 72   # points → inches
            display_h_in = display_rect.height / 72

            if display_w_in <= 0 or display_h_in <= 0:
                continue

            effective_dpi = max(pix.w / display_w_in, pix.h / display_h_in)

            # Convert to PIL for high-quality resize + JPEG encoding.
            if pix.n > 3:
                try:
                    pix = fitz.Pixmap(fitz.csRGB, pix)
                except Exception:
                    continue

            mode = {1: "L", 2: "LA", 3: "RGB", 4: "RGBA"}.get(pix.n, "RGB")
            try:
                pil_img = Image.frombytes(mode, (pix.w, pix.h), pix.samples)
            except Exception:
                continue

            dpi_ratio = effective_dpi / target_dpi

            if dpi_ratio > 1:
                # Oversampled — downsample to target DPI.
                target_w = max(1, int(display_w_in * target_dpi))
                target_h = max(1, int(display_h_in * target_dpi))
                pil_img = pil_img.resize((target_w, target_h), Image.LANCZOS)
                effective_quality = quality
            else:
                # Undersampled — already pixel-limited, compress more aggressively.
                effective_quality = max(10, int(quality * dpi_ratio))

            if pil_img.mode != "RGB":
                pil_img = pil_img.convert("RGB")

            buf = io.BytesIO()
            pil_img.save(buf, format="JPEG", quality=effective_quality, optimize=True)
            compressed = buf.getvalue()

            # Compare against the actual stored stream size.
            try:
                original_size = len(doc.xref_stream(xref))
            except Exception:
                original_size = pix.w * pix.h * pix.n

            if len(compressed) < original_size:
                page.replace_image(xref, stream=compressed)

    return doc


@app.post("/api/compress-pdf")
async def compress_pdf(file: UploadFile = File(...), quality: int = Form(80), dpi: int = Form(150)):
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")

    doc = _recompress_pdf_images(doc, quality, target_dpi=dpi)

    buf = io.BytesIO()
    doc.save(buf, garbage=4, deflate=True, clean=True)
    doc.close()
    buf.seek(0)

    stem = file.filename.rsplit(".", 1)[0] if file.filename else "document"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{stem}_compressed.pdf"'},
    )


# ---------- PDF Merge ----------

@app.post("/api/merge-pdf")
async def merge_pdf(files: list[UploadFile] = File(...)):
    merger = fitz.open()

    for f in files:
        contents = await f.read()
        src = fitz.open(stream=contents, filetype="pdf")
        merger.insert_pdf(src)
        src.close()

    buf = io.BytesIO()
    merger.save(buf, deflate=True, garbage=4)
    merger.close()
    buf.seek(0)

    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="merged.pdf"'},
    )


# ---------- Serve index ----------

from fastapi.responses import HTMLResponse
from pathlib import Path

@app.get("/")
async def index():
    return HTMLResponse(
        (Path(__file__).parent / "static" / "index.html").read_text()
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
