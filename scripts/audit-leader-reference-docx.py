#!/usr/bin/env python3
"""Lightweight structural audit for the generated leader reference DOCX."""

from __future__ import annotations

import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / "project-team-leaders-reference.docx"
DATA = ROOT / "scripts" / "sheet-data.json"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def main():
    with zipfile.ZipFile(DOCX) as zf:
        names = set(zf.namelist())
        document_xml = zf.read("word/document.xml")
        root = ET.fromstring(document_xml)
        text = "".join(node.text or "" for node in root.iter(W + "t"))
        tables = list(root.iter(W + "tbl"))
        rows = list(root.iter(W + "tr"))

    required = [
        "كشف قادة الفرق وبيانات التسجيل",
        "نظام تأجير الدراجات الذكية",
        "ريم أحمد أحمد الغزاوي",
    ]
    forbidden = [
        "رسالة العميد لقادة الفرق",
        "أبنائي الطلاب",
        "https://dam-rs.vercel.app/register",
    ]
    missing = [value for value in required if value not in text]
    present = [value for value in forbidden if value in text]
    media = [name for name in names if name.startswith("word/media/")]

    if missing:
        raise SystemExit(f"Missing expected text: {missing}")
    if present:
        raise SystemExit(f"Found removed message text: {present}")
    if len(media) < 2:
        raise SystemExit(f"Expected at least two embedded logo images, found {len(media)}")
    if len(tables) < 2:
        raise SystemExit(f"Expected header and project tables; found {len(tables)}")
    if len(rows) < 50:
        raise SystemExit(f"Expected project table rows plus header rows; found {len(rows)}")

    print("DOCX structural audit passed")
    print(f"embedded media: {len(media)}")
    print(f"tables: {len(tables)}")
    print(f"table rows: {len(rows)}")


if __name__ == "__main__":
    main()
