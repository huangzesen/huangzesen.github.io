#!/usr/bin/env python3
"""Write _src/partials/pubs-*.html from Crossref (works carrying ORCID 0000-0001-9570-5975).

Run: python3 -I _src/make_pubs.py   (needs network). Review the output before building.
"""
import html, json, pathlib, re, urllib.request

ORCID = "0000-0001-9570-5975"
OUT = pathlib.Path(__file__).resolve().parent / "partials"
SKIP = {"10.1002/essoar.10509398.1"}  # 2021 preprint of the ApJ 935, 60 wave-action paper
CJK = re.compile(r"[㐀-鿿]+")

def name(a):
    fam = CJK.sub("", a.get("family", "")).strip()
    giv = CJK.sub("", a.get("given", "")).strip()
    ini = " ".join(p[0] + "." for p in re.split(r"[\s-]+", giv) if p)
    return f"{fam}, {ini}".strip(", ")

def is_me(a):
    return CJK.sub("", a.get("family", "")).strip().lower() == "huang" and a.get("given", "").lower().startswith("zesen")

def authors(au):
    names = [(f"<b>{html.escape(name(a))}</b>" if is_me(a) else html.escape(name(a))) for a in au]
    me = next((i for i, a in enumerate(au) if is_me(a)), None)
    if len(au) <= 6:
        return ", ".join(names[:-1]) + (", &amp; " if len(names) > 1 else "") + names[-1]
    s = ", ".join(names[:3]) + ", et al."
    if me is not None and me >= 3:
        k = me + 1
        suf = "th" if 10 <= k % 100 <= 20 else {1: "st", 2: "nd", 3: "rd"}.get(k % 10, "th")
        s += f" (incl. {names[me]}, {k}{suf} of {len(au)})"
    else:
        s += f" ({len(au)} authors)"
    return s

def main():
    url = (f"https://api.crossref.org/works?filter=orcid:{ORCID}&rows=100&sort=published&order=desc"
           "&select=DOI,title,container-title,published,author,volume,page,article-number,type")
    items = json.load(urllib.request.urlopen(url, timeout=60))["message"]["items"]
    first, co, pre = [], [], []
    for w in items:
        if w["DOI"].lower() in SKIP:
            continue
        au = w.get("author", [])
        y = w.get("published", {}).get("date-parts", [[0]])[0][0]
        title = re.sub(r"<[^>]+>", "", (w.get("title") or [""])[0])
        title = re.sub(r"\b1/f\b", "1/<i>f</i>", html.escape(title))
        jour = (w.get("container-title") or [""])[0]
        vol, pg = w.get("volume", ""), w.get("article-number") or w.get("page", "")
        doi = w["DOI"]
        if jour:
            ve = f"<em>{html.escape(jour)}</em>" + (f" {vol}" if vol else "") + (f", {pg}" if pg else "")
        else:
            ve = "<em>Preprint</em> (Research Square)"
        li = (f'<li><span class="yr">{y}</span><span class="ti">{title}</span><br>'
              f'<span class="au">{authors(au)}</span><br>'
              f'<span class="ve">{ve} · <a href="https://doi.org/{doi}">doi:{doi}</a></span></li>')
        if not jour:
            pre.append(li)
        elif au and is_me(au[0]):
            first.append(li)
        else:
            co.append(li)
    OUT.mkdir(exist_ok=True)
    for key, lst in (("first", first), ("co", co), ("pre", pre)):
        (OUT / f"pubs-{key}.html").write_text('<ul class="pubs">\n' + "\n".join(lst) + "\n</ul>\n")
        print(key, len(lst))

if __name__ == "__main__":
    main()
