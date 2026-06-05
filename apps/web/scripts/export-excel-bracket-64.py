#!/usr/bin/env python3
"""Экспорт #N из 64-16 ×2gr.xls → excel-bracket-64-reference.json"""
import json
import re
import sys
from pathlib import Path

try:
    import xlrd
except ImportError:
    print("pip install xlrd (или apps/web/.venv-xls)", file=sys.stderr)
    sys.exit(1)

root = Path(__file__).resolve().parents[1]  # apps/web
xls = root.parent.parent / "64-16 ×2gr.xls"
out = root / "src/lib/excel-bracket-64-reference.json"


def cell(sh, r, c):
    if r < 0 or c < 0 or r >= sh.nrows or c >= sh.ncols:
        return ""
    v = sh.cell_value(r, c)
    s = str(v).strip() if v else ""
    if re.match(r"^\d+\.0$", s):
        s = s[:-2]
    return s


def footer_at(sh, r, c):
    for dr in range(1, 9):
        t = cell(sh, r + dr, c)
        if t and (
            "место" in t.lower()
            or "побед" in t.lower()
            or "проиг" in t.lower()
        ):
            return t
    return None


def seeds_at(sh, r, c):
    if c != 21:
        return None, None
    a, b = cell(sh, r + 1, c), cell(sh, r + 2, c)
    if a.isdigit() and b.isdigit():
        return int(a), int(b)
    return None, None


wb = xlrd.open_workbook(str(xls), encoding_override="cp1251")
sh = wb.sheet_by_index(0)
matches = {}
for r in range(sh.nrows):
    for c in range(sh.ncols):
        m = re.match(r"^#(\d+)$", cell(sh, r, c))
        if m:
            n = int(m.group(1))
            if n not in matches:
                matches[n] = {"no": n, "row": r, "col": c}

for n, m in matches.items():
    r, c = m["row"], m["col"]
    f = footer_at(sh, r, c)
    if f:
        m["footer"] = f
        mo = re.search(r"на\s*#(\d+)", f, re.I)
        if mo:
            m["linkTo"] = int(mo.group(1))
    s1, s2 = seeds_at(sh, r, c)
    if s1 is not None:
        m["seed1"], m["seed2"] = s1, s2

col_labels = {}
for c in sorted({m["col"] for m in matches.values()}):
    for r in range(6, 14):
        t = cell(sh, r, c)
        if not t or len(t) <= 3:
            continue
        if re.match(r"^#?\d", t):
            continue
        col_labels[str(c)] = t
        break

data = {
    "source": "64-16 ×2gr.xls",
    "title": "тест с эксельки",
    "sheet": sh.name,
    "colLabels": col_labels,
    "matches": sorted(matches.values(), key=lambda x: x["no"]),
}
out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Wrote {len(data['matches'])} matches → {out}")
