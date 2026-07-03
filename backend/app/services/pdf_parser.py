"""
PDF parser service. Extracts text page-by-page from uploaded PDF reports.
Uses pdfplumber as primary, falls back to PyMuPDF.
"""
import os
from typing import List, Dict, Any


def extract_pages(file_path: str) -> List[Dict[str, Any]]:
    """Returns list of {"page_num": int, "text": str}"""
    pages = []

    try:
        import pdfplumber
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages, start=1):
                text = page.extract_text() or ""
                pages.append({"page_num": i, "text": text})
        return pages
    except Exception:
        pass

    try:
        import fitz  # PyMuPDF
        doc = fitz.open(file_path)
        for i, page in enumerate(doc, start=1):
            text = page.get_text()
            pages.append({"page_num": i, "text": text})
        doc.close()
        return pages
    except Exception:
        pass

    raise RuntimeError(f"Could not extract text from {file_path}. Install pdfplumber or PyMuPDF.")


def save_extracted_text(pages: List[Dict[str, Any]], output_path: str) -> None:
    with open(output_path, "w", encoding="utf-8") as f:
        for p in pages:
            f.write(f"\n\n=== PAGE {p['page_num']} ===\n\n")
            f.write(p["text"])
