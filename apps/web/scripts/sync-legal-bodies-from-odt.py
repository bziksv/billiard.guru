#!/usr/bin/env python3
"""Sync RU legal document bodies from ODT sources in политики-billiard-word/."""

from __future__ import annotations

import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

TEXT_NS = "{urn:oasis:names:tc:opendocument:xmlns:text:1.0}"
TABLE_NS = "{urn:oasis:names:tc:opendocument:xmlns:table:1.0}"
OFFICE_NS = "{urn:oasis:names:tc:opendocument:xmlns:office:1.0}"

ROOT = Path(__file__).resolve().parents[3]
ODT_DIR = ROOT / "политики-billiard-word"
OUTPUT = Path(__file__).resolve().parents[1] / "src/lib/legal/ru/bodies.generated.ts"

MAPPING: dict[str, str] = {
    "politics-billiard.odt": "privacy",
    "cookies-billiard.odt": "cookies",
    "rules-recommendation-billiard.odt": "recommendation-technologies",
}

PUBLIC_LEGAL_DIR = Path(__file__).resolve().parents[1] / "public/legal"

DEFAULT_UPDATED_AT = {
    "privacy": "2026-07-09",
    "cookies": "2026-07-13",
    "recommendation-technologies": "2026-07-13",
}


def normalize_text(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    text = re.sub(r"^okie-", "cookie-", text, flags=re.I)
    text = re.sub(r"\bookie-файл", "cookie-файл", text, flags=re.I)
    text = re.sub(r"\bookies\b", "cookies", text, flags=re.I)
    text = re.sub(r"\bookie\b", "cookie", text, flags=re.I)
    text = re.sub(r"Coookie", "Cookie", text)
    text = re.sub(r"cВаш", "Ваш", text)
    text = re.sub(r'(\w)"(\w)', r'\1" \2', text)
    text = re.sub(r"\.c\.?$", ".", text)
    text = re.sub(r" ([cC])\.?$", ".", text)
    return text


def paragraph_text(paragraph: ET.Element) -> str:
    parts: list[str] = []
    if paragraph.text:
        parts.append(paragraph.text)
    for child in paragraph.iter():
        if child.tag.endswith("}line-break") or child.tag.endswith("}tab"):
            parts.append(" ")
        if child is not paragraph and child.text:
            parts.append(child.text)
        if child is not paragraph and child.tail:
            parts.append(child.tail)
    return normalize_text("".join(parts))


def cell_text(cell: ET.Element) -> str:
    parts = [paragraph_text(paragraph) for paragraph in cell.findall(f".//{TEXT_NS}p")]
    return normalize_text(" ".join(part for part in parts if part))


def extract_table(table: ET.Element) -> dict[str, object]:
    rows: list[list[str]] = []
    for row in table.findall(f"{TABLE_NS}table-row"):
        cells: list[str] = []
        for cell in row.findall(f"{TABLE_NS}table-cell"):
            text = cell_text(cell)
            repeat = int(cell.attrib.get(f"{TABLE_NS}number-columns-repeated", "1"))
            for _ in range(repeat):
                cells.append(text)
        if any(cell for cell in cells):
            rows.append(cells)

    if not rows:
        return {"headers": [], "rows": []}

    column_count = max(len(row) for row in rows)
    normalized_rows: list[list[str]] = []
    for row in rows:
        padded = [""] * (column_count - len(row)) + row if len(row) < column_count else row
        normalized_rows.append(padded[:column_count])

    headers = normalized_rows[0]
    body_rows = normalized_rows[1:]
    return {"headers": headers, "rows": body_rows}


def extract_list(list_element: ET.Element) -> list[str]:
    items: list[str] = []
    for list_item in list_element.findall(f".//{TEXT_NS}list-item"):
        parts: list[str] = []
        for paragraph in list_item.findall(f".//{TEXT_NS}p"):
            text = paragraph_text(paragraph)
            if text:
                parts.append(text)
        if parts:
            items.append(normalize_text(" ".join(parts)))
    return items


def extract_blocks(path: Path) -> list[dict[str, object]]:
    with zipfile.ZipFile(path) as archive:
        root = ET.fromstring(archive.read("content.xml"))

    text_root = root.find(f".//{OFFICE_NS}text")
    if text_root is None:
        return []

    blocks: list[dict[str, object]] = []
    for child in text_root:
        tag = child.tag.split("}")[-1]
        if tag == "p":
            text = paragraph_text(child)
            if not text:
                continue
            blocks.append(
                {
                    "kind": "paragraph",
                    "style": child.attrib.get(f"{TEXT_NS}style-name", ""),
                    "text": text,
                }
            )
            continue
        if tag == "table":
            table = extract_table(child)
            if table["headers"]:
                blocks.append({"kind": "table", **table})
            continue
        if tag == "list":
            for item in extract_list(child):
                blocks.append(
                    {
                        "kind": "paragraph",
                        "style": "List",
                        "text": item,
                    }
                )

    return blocks


def is_section_title(block: dict[str, object], slug: str) -> bool:
    if block["kind"] != "paragraph":
        return False
    text = str(block["text"])
    style = str(block["style"])

    if slug == "privacy":
        if style == "P2":
            return True
        return style == "P3" and text.startswith("Приложение")

    return False


def group_sections(blocks: list[dict[str, object]], slug: str) -> list[dict[str, object]]:
    sections: list[dict[str, object]] = []
    current: dict[str, object] = {"title": None, "paragraphs": [], "tables": []}

    def flush() -> None:
        nonlocal current
        paragraphs = current["paragraphs"]
        tables = current["tables"]
        if current["title"] or paragraphs or tables:
            section: dict[str, object] = {
                "title": current["title"],
                "paragraphs": paragraphs,
            }
            if tables:
                section["tables"] = tables
            sections.append(section)
        current = {"title": None, "paragraphs": [], "tables": []}

    for block in blocks:
        if is_section_title(block, slug):
            flush()
            current["title"] = block["text"]
            continue
        if block["kind"] == "paragraph":
            current["paragraphs"].append(block["text"])
            continue
        if block["kind"] == "table":
            current["tables"].append(
                {"headers": block["headers"], "rows": block["rows"]}
            )

    flush()
    return sections


def detect_updated_at(blocks: list[dict[str, object]], slug: str) -> str:
    for block in blocks[:8]:
        if block["kind"] != "paragraph":
            continue
        match = re.search(r"Версия от (\d{2})\.(\d{2})\.(\d{4})", str(block["text"]))
        if match:
            day, month, year = match.groups()
            return f"{year}-{month}-{day}"
    return DEFAULT_UPDATED_AT[slug]


def json_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\n", "\\n")
        .replace("\r", "")
        .replace("\t", "\\t")
    )


def render_table(table: dict[str, object]) -> str:
    headers = table["headers"]
    rows = table["rows"]
    chunks = ["        {", '          headers: [']
    for header in headers:
        chunks.append(f'            "{json_escape(str(header))}",')
    chunks.append("          ],")
    chunks.append("          rows: [")
    for row in rows:
        chunks.append("            [")
        for cell in row:
            chunks.append(f'              "{json_escape(str(cell))}",')
        chunks.append("            ],")
    chunks.append("          ],")
    chunks.append("        },")
    return "\n".join(chunks)


def render_sections(sections: list[dict[str, object]]) -> str:
    chunks: list[str] = []
    for section in sections:
        chunks.append("      {")
        title = section.get("title")
        if title:
            chunks.append(f'        title: "{json_escape(str(title))}",')
        chunks.append("        paragraphs: [")
        for paragraph in section["paragraphs"]:
            chunks.append(f'          "{json_escape(str(paragraph))}",')
        chunks.append("        ],")
        tables = section.get("tables")
        if tables:
            chunks.append("        tables: [")
            for table in tables:
                chunks.append(render_table(table))
            chunks.append("        ],")
        chunks.append("      },")
    return "\n".join(chunks)


def render_file(bodies: dict[str, dict[str, object]]) -> str:
    parts = [
        "// Generated by scripts/sync-legal-bodies-from-odt.py — do not edit manually.",
        'import type { LegalDocSlug } from "@/lib/legal";',
        'import type { LegalDocBody } from "@/lib/legal-bodies";',
        "",
        "export const LEGAL_BODIES_RU_GENERATED: Partial<Record<LegalDocSlug, LegalDocBody>> = {",
    ]

    for slug in ("privacy", "cookies", "recommendation-technologies"):
        body = bodies[slug]
        parts.append(f'  "{slug}": {{')
        parts.append(f'    updatedAt: "{body["updatedAt"]}",')
        parts.append("    sections: [")
        parts.append(render_sections(body["sections"]))  # type: ignore[arg-type]
        parts.append("    ],")
        parts.append("  },")

    parts.append("};")
    parts.append("")
    return "\n".join(parts)


def main() -> int:
    if not ODT_DIR.is_dir():
        print(f"Missing ODT directory: {ODT_DIR}", file=sys.stderr)
        return 1

    bodies: dict[str, dict[str, object]] = {}
    for filename, slug in MAPPING.items():
        path = ODT_DIR / filename
        if not path.is_file():
            print(f"Missing ODT file: {path}", file=sys.stderr)
            return 1
        blocks = extract_blocks(path)
        sections = group_sections(blocks, slug)
        table_count = sum(len(section.get("tables", [])) for section in sections)
        paragraph_count = sum(len(section["paragraphs"]) for section in sections)
        bodies[slug] = {
            "updatedAt": detect_updated_at(blocks, slug),
            "sections": sections,
        }
        print(
            f"{slug}: {len(sections)} sections, {paragraph_count} paragraphs, {table_count} tables"
        )

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(render_file(bodies), encoding="utf-8")
    print(f"Wrote {OUTPUT}")

    PUBLIC_LEGAL_DIR.mkdir(parents=True, exist_ok=True)
    for filename, slug in MAPPING.items():
        source = ODT_DIR / filename
        target = PUBLIC_LEGAL_DIR / f"{slug}.odt"
        target.write_bytes(source.read_bytes())
        print(f"Copied {target.name}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
