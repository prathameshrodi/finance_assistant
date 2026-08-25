import json
import logging
import re

import easyocr
import numpy as np
import pypdfium2 as pdfium

logger = logging.getLogger(__name__)
ocr_reader = easyocr.Reader(["en"], gpu=True)


def extract_pdf_text_helper(file_path) -> dict:
    """
    Smart Hybrid Extractor:
    1. Extracts digital text instantly if present.
    2. Automatically falls back to EasyOCR if the PDF is scanned/rasterized.
    """
    logger.info(f"Processing PDF: {file_path}")
    chunks = []

    pdf = pdfium.PdfDocument(file_path)

    for page_idx, page in enumerate(pdf):
        # 1. Try instant digital vector text extraction
        textpage = page.get_textpage()
        digital_text = textpage.get_text_range().strip()

        if len(digital_text) > 50:
            logger.info(f"Page {page_idx + 1}: Extracted digital text ({len(digital_text)} chars).")
            chunks.append(digital_text)
        else:
            # 2. Fallback to OCR for scanned/image pages
            logger.info(f"Page {page_idx + 1}: No embedded text found. Running GPU EasyOCR...")
            pil_image = page.render(scale=2.0).to_pil()
            results = ocr_reader.readtext(np.array(pil_image), detail=0, paragraph=True)
            ocr_text = "\n".join(results).strip()

            if ocr_text:
                chunks.append(ocr_text)

    logger.info(f"Extracted {len(chunks)} pages total.")
    return chunks


def clean_and_parse_json(content: str) -> list:
    """Robust JSON parser that auto-fixes common LLM formatting flaws."""
    content = content.strip()

    # 1. Try standard extract of [ ... ]
    match = re.search(r"\[.*\]", content, re.DOTALL)
    candidate = match.group(0) if match else content

    # 2. Fix trailing commas before closing brackets/braces (e.g. ", ]" -> " ]")
    candidate = re.sub(r",\s*([\]}])", r"\1", candidate)

    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, list):
            return parsed
        elif isinstance(parsed, dict):
            # If wrapped like {"transactions": [...]}
            for val in parsed.values():
                if isinstance(val, list):
                    return val
            return [parsed]
    except Exception:
        pass
    # 3. Fallback: Parse individual objects matching { ... }
    extracted_objects = []
    object_matches = re.finditer(r"\{[^{}]*\}", content)
    for m in object_matches:
        obj_str = m.group(0)
        obj_str = re.sub(r",\s*\}", "}", obj_str)
        try:
            item = json.loads(obj_str)
            extracted_objects.append(item)
        except Exception:
            continue

    return extracted_objects
