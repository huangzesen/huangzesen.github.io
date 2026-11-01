#!/usr/bin/env python3
"""Build the zesen.me pages from _src/ into the repository root.

Each page in _src/pages/*.html starts with one line:
    <!--meta {"title": ..., "description": ..., "path": "/research/", "nav": "research"} -->
The rest of the file is the page body. The shared header, nav and footer live in
_src/layout.html. Run from anywhere:  python3 -I _src/build.py
Folders starting with "_" are not published by GitHub Pages (Jekyll), so _src/ stays private.
"""
import datetime
import json
import pathlib
import re

SRC = pathlib.Path(__file__).resolve().parent
ROOT = SRC.parent

NAV = [
    ("about", "About", "/", []),
    ("research", "Research", "/research/", [
        ("Alfvénons", "/research/alfvenons/"),
        ("LingTai 灵台", "/research/lingtai/"),
        ("ScienceIDE", "/research/scienceide/"),
        ("Agent Last Exam: Astronomy", "/research/ale-astronomy/"),
        ("Solar-wind turbulence", "/research/solar-wind/"),
    ]),
    ("publications", "Publications", "/publications/", []),
    ("cv", "CV", "/cv/", []),
    ("software", "Software", "/software/", []),
    ("miscellany", "Miscellany", "/miscellany/", []),
]


def nav_html(active):
    out = []
    for key, label, href, subs in NAV:
        cls = ' class="current"' if key == active else ""
        aria = ' aria-current="page"' if key == active else ""
        item = f'        <li{cls}><a href="{href}"{aria}>{label}</a>'
        if subs:
            item += '\n          <ul class="sub-menu">\n'
            item += "\n".join(f'            <li><a href="{h}">{t}</a></li>' for t, h in subs)
            item += "\n          </ul>\n        "
        out.append(item + "</li>")
    return "\n".join(out)


def main():
    layout = (SRC / "layout.html").read_text()
    today = datetime.date.today()
    version = today.strftime("%Y%m%d")
    updated = today.strftime("%B %Y")
    for page in sorted((SRC / "pages").glob("*.html")):
        text = page.read_text()
        m = re.match(r"<!--meta (\{.*?\}) -->\n", text)
        if not m:
            raise SystemExit(f"{page.name}: missing <!--meta {{...}} --> first line")
        meta = json.loads(m.group(1))
        body = text[m.end():]
        # <!--include partials/x.svg --> pastes a generated file (e.g. the ALE chart) in place
        body = re.sub(r"<!--include ([\w./-]+) -->",
                      lambda mm: (SRC / mm.group(1)).read_text().strip(), body)
        hm = re.search(r'\s*<header class="post-header">(.*?)</header>\n?', body, re.S)
        hero = hm.group(1).strip() if hm else ""
        if hm:
            body = body[:hm.start()] + "\n" + body[hm.end():]
        html = layout
        for k, v in {
            "title": meta["title"],
            "description": meta["description"],
            "path": meta["path"],
            "slug": meta["nav"],
            "nav": nav_html(meta["nav"]),
            "version": version,
            "updated": updated,
            "content": body.rstrip(),
            "hero": hero,
            "scripts": "".join(f'<script src="{u}?v={version}" defer></script>\n' for u in meta.get("scripts", [])),
        }.items():
            html = html.replace("{{" + k + "}}", v)
        leftover = re.findall(r"\{\{[a-z]+\}\}", html)
        if leftover:
            raise SystemExit(f"{page.name}: unreplaced {leftover}")
        out = ROOT / meta["path"].lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print(f"wrote {out.relative_to(ROOT)}  ({len(html):,} bytes)")


if __name__ == "__main__":
    main()
