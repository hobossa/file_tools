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

def _recompress_pdf_images(doc: fitz.Document, quality: int):
    """Recompress every image in the PDF as JPEG with the given quality."""
    for page in doc:
        for img in page.get_images():
            xref = img[0]
            pix = fitz.Pixmap(doc, xref)

            # Skip images smaller than 1KB — unlikely to benefit
            if pix.n < 4:
                try:
                    raw_len = len(pix.tobytes())
                except Exception:
                    raw_len = 0
                if raw_len < 1024:
                    continue

            try:
                # Convert to RGB if needed (JPEG doesn't support CMYK / alpha)
                if pix.n > 3:
                    pix = fitz.Pixmap(fitz.csRGB, pix)

                compressed_img = pix.tobytes("jpeg", jpg_quality=quality)

                # Only replace if the compressed version is actually smaller
                if len(compressed_img) < pix.n * pix.w * pix.h:
                    page.replace_image(xref, stream=compressed_img)
            except Exception:
                pass  # Skip images that can't be recompressed

    return doc


@app.post("/api/compress-pdf")
async def compress_pdf(file: UploadFile = File(...), quality: int = Form(80)):
    contents = await file.read()
    doc = fitz.open(stream=contents, filetype="pdf")

    doc = _recompress_pdf_images(doc, quality)

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
