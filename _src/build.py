#!/usr/bin/env python3
"""Build the zesen.me pages from _src/ into the repository root.

Each page in _src/pages/*.html (English) and _src/pages-wen/*.html (文言, served under /wen/) starts with one line:
    <!--meta {"title": ..., "description": ..., "path": "/research/", "nav": "research"} -->
The rest of the file is the page body. The shared header, nav and footer live in
_src/layout.html. Run from anywhere:  python3 -I _src/build.py
Folders starting with "_" are not published by GitHub Pages (Jekyll), so _src/ stays private.
"""
import datetime
import hashlib
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
    ("projects", "Projects", "/projects/", []),
    ("travel", "Travel", "/travel/", []),
]

# the 文言 site under /wen/ (Zesen, 2026-11-01: a 文言 version, no modern-Chinese one); pages in _src/pages-wen/
NAV_WEN = [
    ("about", "自述", "/wen/", []),
    ("research", "所究", "/wen/research/", [
        ("阿尔芬子", "/wen/research/alfvenons/"),
        ("灵台", "/wen/research/lingtai/"),
        ("ScienceIDE", "/wen/research/scienceide/"),
        ("器灵终试·天文", "/wen/research/ale-astronomy/"),
        ("太阳风之湍流", "/wen/research/solar-wind/"),
    ]),
    ("publications", "著述", "/wen/publications/", []),
    ("cv", "履历", "/wen/cv/", []),
    ("projects", "器用杂录", "/wen/projects/", []),
    ("travel", "行迹", "/wen/travel/", []),
]

# per-page look (Zesen, 2026-11-02: "add fancy themes to other pages", then "full screen rendering like travel, no white spaces"):
# English path -> scene in js/hero-scene.js and reach. "th-full" = fixed behind the whole page; "th-dark" = the page's text is light.
THEMES = {
    "/": ("about", "th-full th-dark"),
    "/research/": ("research", "th-full th-dark"),
    "/research/alfvenons/": ("alfvenons", "th-full th-dark"),
    "/research/lingtai/": ("lingtai", "th-full"),
    "/research/scienceide/": ("scienceide", "th-full th-dark"),
    "/research/ale-astronomy/": ("ale", "th-full th-dark"),
    "/research/solar-wind/": ("solar", "th-full th-dark"),
    "/publications/": ("publications", "th-full th-dark"),
    "/cv/": ("cv", "th-full th-dark"),
    "/projects/": ("projects", "th-full th-dark"),
    "/travel/": ("travel", ""),
}

# data figures with a dark version (_src/make_dark_figures.py): on th-dark pages the screen shows it, print and enlarge the original
FIGURES_DARK = {
    "/images/research/alfvenon-propagation.png": "/images/research/alfvenon-propagation-dark.webp",
    "/images/research/alfvenon-theta.png": "/images/research/alfvenon-theta-dark.webp",
    "/images/research/psp-5min-e22.jpg": "/images/research/psp-5min-e22-dark.webp",
}

# the collision movies and their posters; every mention on a th-dark page is swapped, and print shows the original poster instead of a frame
MOVIES_DARK = {
    "/images/research/collision-small-2d-bmag.mp4": "/images/research/collision-small-2d-bmag-dark.mp4",
    "/images/research/collision-small-2d-theta.mp4": "/images/research/collision-small-2d-theta-dark.mp4",
    "/images/research/collision-small-2d-bmag-poster.jpg": "/images/research/collision-small-2d-bmag-dark-poster.jpg",
    "/images/research/collision-small-2d-theta-poster.jpg": "/images/research/collision-small-2d-theta-dark-poster.jpg",
}

# pages that moved: old address -> new one, so links already out there keep working
REDIRECTS = {
    "/software/": "/projects/#software",
    "/miscellany/": "/projects/#more",
    "/wen/software/": "/wen/projects/#software",
    "/wen/miscellany/": "/wen/projects/#more",
}

LANGS = {
    "en": {"dir": "pages", "prefix": "", "html": "en", "nav": NAV, "home": "/",
           "brand": 'Zesen Huang<span class="zh">黄泽森</span>', "skip": "Skip to content",
           "footer": "<span>© 2026 Zesen Huang · Department of Earth, Planetary, and Space Sciences, UCLA</span>\n    "
                     '<span><a href="mailto:zesenhuang@g.ucla.edu">Email</a> · <a href="https://github.com/huangzesen">GitHub</a> · '
                     '<a href="https://orcid.org/0000-0001-9570-5975">ORCID</a> · Updated {updated}</span>'},
    "wen": {"dir": "pages-wen", "prefix": "/wen", "html": "lzh", "nav": NAV_WEN, "home": "/wen/",
            "brand": '黄泽森<span class="zh">Zesen Huang</span>', "skip": "径至正文",
            "footer": "<span>© 2026 黄泽森 · 洛城加州大学 地球行星与空间科学系</span>\n    "
                      '<span><a href="mailto:zesenhuang@g.ucla.edu">书信</a> · <a href="https://github.com/huangzesen">GitHub</a> · '
                      '<a href="https://orcid.org/0000-0001-9570-5975">ORCID</a> · {updated}修订</span>'},
}


def use_dark_figures(body):
    def swap(m):
        dark = FIGURES_DARK.get(m.group(1))
        if not dark:
            return m.group(0)
        return f'<picture class="dark-fig"><source media="screen" srcset="{dark}">{m.group(0)}</picture>'
    body = re.sub(r'<img\b[^>]*?\bsrc="([^"]+)"[^>]*>', swap, body)
    for original, dark in MOVIES_DARK.items():
        body = body.replace(original + '"', dark + '"')
    return re.sub(r'(<video id="small-collision-video"[^>]*>.*?</video>)',
                  lambda m: m.group(1) + '<img class="movie-print" src="/images/research/collision-small-2d-bmag-poster.jpg" alt="">',
                  body, flags=re.S)


def write_redirects():
    for old, new in REDIRECTS.items():
        out = ROOT / old.lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(f"""<!DOCTYPE html>
<html lang="{'lzh' if old.startswith('/wen/') else 'en'}">
<head>
<meta charset="utf-8">
<title>{new}</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="https://zesen.me{new.split('#')[0]}">
<meta http-equiv="refresh" content="0; url={new}">
<script>location.replace({new!r} + location.search)</script>
</head>
<body><a href="{new}">{new}</a></body>
</html>
""")
        print(f"wrote {out.relative_to(ROOT)}  (redirect to {new})")


def asset_version():
    """Changes whenever a stylesheet or script does, so a second publish on one day still reaches browsers."""
    h = hashlib.sha1()
    for f in sorted([*(ROOT / "css").glob("*.css"), *(ROOT / "js").glob("*.js")]):
        h.update(f.read_bytes())
    return h.hexdigest()[:10]


def nav_html(active, nav=NAV):
    out = []
    for key, label, href, subs in nav:
        cls = ' class="current"' if key == active else ""
        aria = ' aria-current="page"' if key == active else ""
        item = f'        <li{cls}><a href="{href}"{aria}>{label}</a>'
        if subs:
            item += '\n          <ul class="sub-menu">\n'
            item += "\n".join(f'            <li><a href="{h}">{t}</a></li>' for t, h in subs)
            item += "\n          </ul>\n        "
        out.append(item + "</li>")
    return "\n".join(out)


def lang_switch(lang, path, wen_paths, en_paths):
    """EN | 文 links to the same page in the other language (or its home page if there is no twin)."""
    if lang == "en":
        other = "/wen" + path if "/wen" + path in wen_paths else "/wen/"
        return (f'<div class="lang-switch"><a href="{path}" lang="en" aria-current="true">EN</a>'
                f'<a href="{other}" lang="lzh" hreflang="lzh" title="文言">文</a></div>')
    eng = path[len("/wen"):] or "/"
    eng = eng if eng in en_paths else "/"
    return (f'<div class="lang-switch"><a href="{eng}" lang="en" hreflang="en">EN</a>'
            f'<a href="{path}" lang="lzh" aria-current="true" title="文言">文</a></div>')


def main():
    layout = (SRC / "layout.html").read_text()
    today = datetime.date.today()
    version = asset_version()
    updated = {"en": today.strftime("%B %Y"), "wen": f"{today.year}年{today.month}月"}
    pages = {}
    for lang, cfg in LANGS.items():
        for page in sorted((SRC / cfg["dir"]).glob("*.html")):
            text = page.read_text()
            m = re.match(r"<!--meta (\{.*?\}) -->\n", text)
            if not m:
                raise SystemExit(f"{page.name}: missing <!--meta {{...}} --> first line")
            pages[(lang, page.name)] = (json.loads(m.group(1)), text[m.end():])
    en_paths = {meta["path"] for (lang, _), (meta, _) in pages.items() if lang == "en"}
    wen_paths = {meta["path"] for (lang, _), (meta, _) in pages.items() if lang == "wen"}
    for (lang, name), (meta, body) in pages.items():
        cfg = LANGS[lang]
        # <!--include partials/x.svg --> pastes a generated file (e.g. the ALE chart) in place
        for _ in range(4):  # partials may include partials
            body = re.sub(r"<!--include ([\w./-]+) -->",
                          lambda mm: (SRC / mm.group(1)).read_text().strip(), body)
        hm = re.search(r'\s*<header class="post-header">(.*?)</header>\n?', body, re.S)
        hero = hm.group(1).strip() if hm else ""
        if hm:
            body = body[:hm.start()] + "\n" + body[hm.end():]
        twin = ("/wen" + meta["path"]) if lang == "en" else (meta["path"][len("/wen"):] or "/")
        alternates = ""
        if twin in (wen_paths if lang == "en" else en_paths):
            hl = "lzh" if lang == "en" else "en"
            alternates = f'<link rel="alternate" hreflang="{hl}" href="https://zesen.me{twin}">\n'
        html = layout
        english_path = meta["path"][len("/wen"):] or "/" if lang == "wen" else meta["path"]
        theme, reach = THEMES[english_path]
        if "th-dark" in reach:
            body = use_dark_figures(body)
        for k, v in {
            "title": meta["title"],
            "description": meta["description"],
            "path": meta["path"],
            "slug": meta["nav"],
            "theme": f"theme-{theme} {reach}".strip(),
            "lang": cfg["html"],
            "home": cfg["home"],
            "brand": cfg["brand"],
            "skip": cfg["skip"],
            "alternates": alternates,
            "langswitch": lang_switch(lang, meta["path"], wen_paths, en_paths),
            "footer": cfg["footer"].replace("{updated}", updated[lang]),
            "nav": nav_html(meta["nav"], cfg["nav"]),
            "version": version,
            "updated": updated[lang],
            "content": body.rstrip(),
            "hero": hero,
            "scripts": "".join(f'<script src="{u}?v={version}" defer></script>\n' for u in meta.get("scripts", [])),
        }.items():
            html = html.replace("{{" + k + "}}", v)
        leftover = re.findall(r"\{\{[a-z]+\}\}", html)
        if leftover:
            raise SystemExit(f"{lang}/{name}: unreplaced {leftover}")
        out = ROOT / meta["path"].lstrip("/") / "index.html"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(html)
        print(f"wrote {out.relative_to(ROOT)}  ({len(html):,} bytes)")
    write_redirects()


if __name__ == "__main__":
    main()
