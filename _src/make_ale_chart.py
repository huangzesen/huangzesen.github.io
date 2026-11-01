#!/usr/bin/env python3
"""Write the ALE astronomy figure (inline SVG) from the harvest and verdict counts.

Counts are from ~/work/projects/ale-astronomy (harvest/problems.db and verdict/LIST.json, 2026-10-24 build).
Re-run with --live to recount from those files.
"""
import json, pathlib, sys, sqlite3, collections

OUT = pathlib.Path(__file__).resolve().parent / "partials"
ROWS = [  # arXiv category, label, directions, problems, strong seeds, possible seeds
    ("astro-ph.EP", "Earth & planetary", 12, 315, 30, 112),
    ("astro-ph.HE", "High-energy phenomena", 11, 301, 27, 104),
    ("astro-ph.IM", "Instrumentation & methods", 11, 277, 43, 131),
    ("astro-ph.GA", "Galaxies", 10, 244, 28, 83),
    ("astro-ph.SR", "Solar & stellar", 10, 238, 32, 92),
    ("astro-ph.CO", "Cosmology", 10, 217, 39, 80),
    ("physics.space-ph", "Heliosphere (space physics)", 7, 187, 26, 64),
]

def live():
    base = pathlib.Path.home() / "work/projects/ale-astronomy"
    t = json.load(open(base / "data/taxonomy.json"))["root"]
    cat = {}
    for f in t["children"]:
        for a in f.get("children", []):
            cat[a["id"]] = f["arxiv"]
            for d in a.get("children", []):
                cat[d["id"]] = f["arxiv"]
    db = sqlite3.connect(base / "harvest/problems.db")
    probs = collections.Counter(cat.get(l or n, cat.get(n)) for n, l in db.execute("select node_id, leaf_id from problems"))
    seeds = collections.defaultdict(collections.Counter)
    for s in json.load(open(base / "verdict/LIST.json"))["seeds"]:
        seeds[s["category"]][s["verdict"]] += 1
    return [(c, lab, d, probs[c], seeds[c]["strong"], seeds[c]["possible"]) for c, lab, d, *_ in ROWS]

def full(rows):
    W, x0, bw = 900, 268, 470
    top, rh = 64, 46
    H = top + rh * len(rows) + 34
    mx = max(r[3] for r in rows)
    sc = bw / mx
    tp = sum(r[3] for r in rows); ts = sum(r[4] for r in rows); tq = sum(r[5] for r in rows)
    o = [f'<svg viewBox="0 0 {W} {H}" role="img" aria-labelledby="ale-t ale-d" xmlns="http://www.w3.org/2000/svg" font-family="Helvetica Neue, Helvetica, Arial, sans-serif">',
         f'<title id="ale-t">Agent Last Exam astronomy track: open problems and RSI task seeds by arXiv category</title>',
         f'<desc id="ale-d">{tp:,} open problems and {ts+tq} RSI task seeds ({ts} strong, {tq} possible) across seven arXiv categories.</desc>',
         f'<rect width="{W}" height="{H}" fill="#fff"/>',
         # legend
         f'<g font-size="13" fill="#444"><rect x="{x0}" y="20" width="14" height="10" fill="#d5dee6"/><text x="{x0+20}" y="29">open problems harvested</text>',
         f'<rect x="{x0+190}" y="20" width="14" height="10" fill="#005587"/><text x="{x0+210}" y="29">strong RSI seeds</text>',
         f'<rect x="{x0+340}" y="20" width="14" height="10" fill="#8db5d2"/><text x="{x0+360}" y="29">possible RSI seeds</text></g>',
         f'<line x1="{x0}" y1="{top-12}" x2="{x0}" y2="{top + rh*len(rows) - 8}" stroke="#bbb"/>']
    for i, (c, lab, d, p, s, q) in enumerate(rows):
        y = top + i * rh
        o.append(f'<text x="{x0-14}" y="{y+12}" text-anchor="end" font-size="15" fill="#161616" font-weight="600">{lab}</text>')
        o.append(f'<text x="{x0-14}" y="{y+29}" text-anchor="end" font-size="12" fill="#777" font-family="Menlo, monospace">{c} · {d} directions</text>')
        o.append(f'<rect x="{x0}" y="{y}" width="{p*sc:.1f}" height="15" fill="#d5dee6"/>')
        o.append(f'<text x="{x0+p*sc+7:.1f}" y="{y+12}" font-size="13" fill="#555">{p}</text>')
        o.append(f'<rect x="{x0}" y="{y+18}" width="{s*sc:.1f}" height="15" fill="#005587"/>')
        o.append(f'<rect x="{x0+s*sc:.1f}" y="{y+18}" width="{q*sc:.1f}" height="15" fill="#8db5d2"/>')
        o.append(f'<text x="{x0+(s+q)*sc+7:.1f}" y="{y+30}" font-size="13" fill="#555">{s} + {q}</text>')
    yb = top + rh * len(rows) + 14
    o.append(f'<text x="{x0}" y="{yb}" font-size="13" fill="#444"><tspan font-weight="600">Total</tspan>  {tp:,} problems · {ts+tq} seeds ({ts} strong, {tq} possible) · 32 areas · 71 research directions</text>')
    o.append('</svg>')
    return "\n".join(o)

def thumb(rows):
    W, H, x0, bw = 320, 180, 22, 270
    mx = max(r[3] for r in rows); sc = bw / mx
    o = [f'<svg viewBox="0 0 {W} {H}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><rect width="{W}" height="{H}" fill="#fff"/>']
    for i, (c, lab, d, p, s, q) in enumerate(rows):
        y = 20 + i * 21
        o.append(f'<rect x="{x0}" y="{y}" width="{p*sc:.1f}" height="7" fill="#d5dee6"/>')
        o.append(f'<rect x="{x0}" y="{y+8}" width="{s*sc:.1f}" height="7" fill="#005587"/><rect x="{x0+s*sc:.1f}" y="{y+8}" width="{q*sc:.1f}" height="7" fill="#8db5d2"/>')
    o.append('</svg>')
    return "".join(o)

if __name__ == "__main__":
    rows = live() if "--live" in sys.argv else ROWS
    OUT.mkdir(exist_ok=True)
    (OUT / "ale-chart.svg").write_text(full(rows) + "\n")
    (OUT / "ale-thumb.svg").write_text(thumb(rows) + "\n")
    print("wrote", OUT / "ale-chart.svg", OUT / "ale-thumb.svg")
