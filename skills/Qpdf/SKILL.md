---
name: Qpdf
description: Comprehensive PDF processing toolkit. Use when extracting text/tables, creating new PDFs, merging/splitting, rotating, watermarking, form filling, encrypting, running OCR, or extracting images from PDFs.
metadata: 
source: "https://github.com/tfriedel/claude-office-skills"
author: tfriedel
version: 2.0.0
triggers: pdf, PDF, merge pdf, split pdf, extract text, OCR, watermark, form fill
related-skills: Qdocx, Qdoc-converter
keywords: pdf, pypdf, pdfplumber, reportlab, OCR, merge, split, watermark, form
invocation_trigger: When framework initialization, maintenance, or audit is required.
recommendedModel: haiku
---

# PDF — Comprehensive PDF Processing Guide

## Quick Reference

| Task | Tool | Command/Code |
|------|------|-----------|
| Extract text | pdfplumber | `page.extract_text()` |
| Extract tables | pdfplumber | `page.extract_tables()` |
| Merge | pypdf | `writer.add_page(page)` |
| Split | pypdf | Create files per page |
| Generate | reportlab | Canvas or Platypus |
| CLI merge | qpdf | `qpdf --empty --pages ...` |
| OCR | pytesseract | PDF→image→OCR |
| Fill forms | pypdf / pdf-lib | See FORMS.md |

## Text & Table Extraction

### pdfplumber (Recommended)

```python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    for page in pdf.pages:
        # Text
        print(page.extract_text())

        # Tables
        for table in page.extract_tables():
            for row in table:
                print(row)
```

### Table → Excel Conversion

```python
import pdfplumber
import pandas as pd

with pdfplumber.open("document.pdf") as pdf:
    all_tables = []
    for page in pdf.pages:
        for table in page.extract_tables():
            if table:
                df = pd.DataFrame(table[1:], columns=table[0])
                all_tables.append(df)

    if all_tables:
        combined = pd.concat(all_tables, ignore_index=True)
        combined.to_excel("extracted.xlsx", index=False)
```

### Metadata

```python
from pypdf import PdfReader
reader = PdfReader("document.pdf")
meta = reader.metadata
print(f"Title: {meta.title}, Author: {meta.author}")
```

## Merge & Split

### Merge

```python
from pypdf import PdfWriter, PdfReader

writer = PdfWriter()
for pdf_file in ["doc1.pdf", "doc2.pdf", "doc3.pdf"]:
    for page in PdfReader(pdf_file).pages:
        writer.add_page(page)

with open("merged.pdf", "wb") as f:
    writer.write(f)
```

### Split

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
for i, page in enumerate(reader.pages):
    writer = PdfWriter()
    writer.add_page(page)
    with open(f"page_{i+1}.pdf", "wb") as f:
        writer.write(f)
```

### Page Rotation

```python
from pypdf import PdfReader, PdfWriter

reader = PdfReader("input.pdf")
writer = PdfWriter()
page = reader.pages[0]
page.rotate(90)  # Clockwise 90 degrees
writer.add_page(page)
with open("rotated.pdf", "wb") as f:
    writer.write(f)
```

## PDF Generation

### Basic Generation (reportlab)

```python
from reportlab.lib.pagesizes import letter, A4
from reportlab.pdfgen import canvas

c = canvas.Canvas("output.pdf", pagesize=A4)
width, height = A4
c.drawString(100, height - 100, "Hello World!")
c.save()
```

### Report Generation (Platypus)

```python
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet

doc = SimpleDocTemplate("report.pdf", pagesize=A4)
styles = getSampleStyleSheet()
story = []

story.append(Paragraph("Report Title", styles['Title']))
story.append(Spacer(1, 12))
story.append(Paragraph("Body content here. " * 20, styles['Normal']))
story.append(PageBreak())
story.append(Paragraph("Page 2", styles['Heading1']))

doc.build(story)
```

**Note**: Do not use Unicode subscripts/superscripts in ReportLab. Use `<sub>`, `<super>` tags instead.

## Watermark

```python
from pypdf import PdfReader, PdfWriter

watermark = PdfReader("watermark.pdf").pages[0]
reader = PdfReader("document.pdf")
writer = PdfWriter()

for page in reader.pages:
    page.merge_page(watermark)
    writer.add_page(page)

with open("watermarked.pdf", "wb") as f:
    writer.write(f)
```

## Encryption & Decryption

```python
from pypdf import PdfReader, PdfWriter

# Encrypt
writer = PdfWriter()
for page in PdfReader("input.pdf").pages:
    writer.add_page(page)
writer.encrypt("userpassword", "ownerpassword")
with open("encrypted.pdf", "wb") as f:
    writer.write(f)
```

```bash
# CLI decrypt
qpdf --password=mypassword --decrypt encrypted.pdf decrypted.pdf
```

## OCR (Scanned Documents)

```python
import pytesseract
from pdf2image import convert_from_path

images = convert_from_path('scanned.pdf')
for i, image in enumerate(images):
    text = pytesseract.image_to_string(image, lang='eng+kor')
    print(f"Page {i+1}:\n{text}\n")
```

## Image Extraction

```bash
# Poppler tools
pdfimages -j input.pdf output_prefix
# Result: output_prefix-000.jpg, output_prefix-001.jpg, ...
```

## CLI Tools

```bash
# pdftotext — Extract text
pdftotext input.pdf output.txt
pdftotext -layout input.pdf output.txt    # Preserve layout
pdftotext -f 1 -l 5 input.pdf output.txt  # Pages 1-5 only

# qpdf — Merge/split
qpdf --empty --pages file1.pdf file2.pdf -- merged.pdf
qpdf input.pdf --pages . 1-5 -- first5.pdf
qpdf input.pdf output.pdf --rotate=+90:1  # Rotate page 1
```

## Dependencies

| Tool | Install | Purpose |
|------|---------|---------|
| pypdf | `pip install pypdf` | Merge, split, encrypt |
| pdfplumber | `pip install pdfplumber` | Text & table extraction |
| reportlab | `pip install reportlab` | PDF generation |
| pytesseract | `pip install pytesseract pdf2image` | OCR |
| poppler | `brew install poppler` | pdftotext, pdfimages |
| qpdf | `brew install qpdf` | CLI merge/split |
