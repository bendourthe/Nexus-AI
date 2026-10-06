"""v2.11.0 Phase 2 (T004) -- build the image-only "scanned" outline fixture.

Renders ``scan-source.pdf`` (written by ``generate-outline-fixtures.ts``) to
grayscale page images with pypdfium2 and saves them as an image-only PDF with
Pillow, so the OCR engine sees a real scan with no text layer. Both libraries
are already part of the OCR runtime's portable tier
(``runtimes/ocr/requirements.txt``); nothing new is installed.

Run with the OCR runtime's interpreter, for example:

    <nexus venv>/Scripts/python.exe scripts/rasterize-scan-fixture.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import pypdfium2 as pdfium
from PIL import Image

DOCS_DIR = (
    Path(__file__).resolve().parent.parent
    / "tests"
    / "fixtures"
    / "documents"
    / "outline"
    / "docs"
)
SOURCE = DOCS_DIR / "scan-source.pdf"
TARGET = DOCS_DIR / "scan-10p.pdf"
DPI = 110


def render_pages(source: Path, dpi: int) -> list[Image.Image]:
    """Render every page of ``source`` to an 8-bit grayscale image."""
    document = pdfium.PdfDocument(str(source))
    try:
        scale = dpi / 72.0
        return [page.render(scale=scale).to_pil().convert("L") for page in document]
    finally:
        document.close()


def main() -> int:
    if not SOURCE.is_file():
        print(
            f"missing {SOURCE}; run generate-outline-fixtures.ts first", file=sys.stderr
        )
        return 1
    images = render_pages(SOURCE, DPI)
    first, rest = images[0], images[1:]
    first.save(TARGET, "PDF", resolution=float(DPI), save_all=True, append_images=rest)
    print(f"wrote {TARGET.name}: {len(images)} image-only pages at {DPI} dpi")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
