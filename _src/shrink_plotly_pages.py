#!/usr/bin/env python3
"""Shrink the two standalone Plotly pages (switch_back.html, switch_back_case.html) by rounding their numbers.

Each page is a Plotly export: plotly.js (4.6 MB) and one Plotly.newPlot(id, data, layout, config) call whose data
is about 1,400 scatter3d field lines. 94% of the bytes were coordinates in a unit box printed with 17 digits.
This rounds every float in data and layout to DECIMALS places (1e-5 of the box: 0.014 px on the 1400 px figure)
and writes the page back with nothing else changed. plotly.js and the config are not touched, and the numbers
stay plain JSON, so _src/make_switchback_lines.py still reads the page.

    python3 -I _src/shrink_plotly_pages.py            # both pages, in place; safe to run again (no further change)
    python3 -I _src/shrink_plotly_pages.py --check    # report only
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["switch_back.html", "switch_back_case.html"]
DECIMALS = 5


def rounded(o):
    if isinstance(o, float):
        r = round(o, DECIMALS)
        return int(r) if r == int(r) and abs(r) < 1e15 else r
    if isinstance(o, list):
        return [rounded(v) for v in o]
    if isinstance(o, dict):
        return {k: rounded(v) for k, v in o.items()}
    return o


def dump(o):
    # as Plotly writes it: compact, and no character that could end the <script> early
    s = json.dumps(o, separators=(",", ":"))
    return s.replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def shrink(path, write):
    text = path.read_text(encoding="utf-8")
    call = text.rindex("Plotly.newPlot(")
    dec = json.JSONDecoder()
    start = text.index("[", call)
    data, end = dec.raw_decode(text, start)
    lay_start = text.index("{", end)
    layout, lay_end = dec.raw_decode(text, lay_start)
    if not re.fullmatch(r",\s*", text[end:lay_start]):
        raise SystemExit(f"{path.name}: unexpected text between data and layout")
    new = text[:start] + dump(rounded(data)) + text[end:lay_start] + dump(rounded(layout)) + text[lay_end:]
    print(f"{path.name}: {len(text) / 1e6:.1f} MB -> {len(new) / 1e6:.1f} MB, {len(data)} traces")
    if write and new != text:
        path.write_text(new, encoding="utf-8")


if __name__ == "__main__":
    for name in PAGES:
        shrink(ROOT / name, "--check" not in sys.argv)
