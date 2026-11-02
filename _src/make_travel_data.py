#!/usr/bin/env python3
"""Write data/travel/*.json for the /travel/ page from the data files of the private claude.ai
dashboard "Where I've Been" (totals per region and block, worked out from Photos library metadata).

Download each asset below from the dashboard into one folder, and Natural Earth 5.1.2 (public domain,
github.com/nvkelso/natural-earth-vector, geojson/) ne_10m_land and ne_10m_admin_0_boundary_lines_land
into another, then:
    python3 -I _src/make_travel_data.py <assets folder> <natural earth folder> [--drop-block-size 0.1]

The dashboard's two rest-of-the-world layers are not used: its `land` and its `world-0` lines carry false
world-spanning bands at the latitudes of Fiji (16.1-17 S) and eastern Russia (65-71.5 N), and `world-0` has no
outline for Russia, Greenland or Indonesia. They are rebuilt here from Natural Earth, which is cut cleanly at
180 degrees. The boundary maps of mapped countries and all personal totals are copied unchanged.

Only the columns the page reads are kept. This repository is public and git keeps history, so whatever this
script writes and gets pushed stays public: choose --drop-block-size before committing.
"""
import argparse
import json
import math
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent

# dataset -> asset id in the dashboard (as of 2026-11-02)
ASSETS = {
    "summary": "e944c5794a5ee8d174e572537c483f00",
    "years": "4cf30de1705b536746cd01567e852139",
    "countries": "149a2cd6c3c6cdb7603a84337f167e51",
    "adm1": "87fd8c629d9aa2090541d5ee9e9d528a",
    "adm2": "40e46e87ae91fce8f095c39873f46940",
    "regions": "568b008a0f89b4f0c1ea756e3df460c4",
    "blocks": "ffabe4aa8f41352919ea76cbbebc1f4e",
    "block_years": "67eca479dca426d618eb927e918b1c6b",
    "grid_stats": "0f0cc997e6a986e8c758ed708f4cae50",
    "shapes": "0dea40c4334305bf967c2cbdf8810502",
    "boundaries": "58f79ab49adb996d26f7ea2300e0f07c",
    "boundaries2": "44f9c0623b8e3336764394b877a149ee",
    "disputed": "a27a97a7ec6e688e1173f90d673b278c",
}
# map layers: keep only what js/travel.js reads
KEEP = {
    "shapes": ("id", "level", "rings"),
    "boundaries": ("level", "rings"),
    "boundaries2": ("rings",),
    "disputed": ("name", "note", "rings"),
}
HAS_BLOCK_SIZE = ("blocks", "block_years", "grid_stats")

BOTTOM = -58  # the page's map stops here
TOLERANCE = 0.02  # degrees, about 2 km; the rest of the world is only background
CELL = 0.1  # degrees: Natural Earth lines this close to a mapped country's outline are left to that outline
NOT_BORDERS = ("Overlay limit", "Lease limit")


def simplify(line, tol=TOLERANCE):
    """Douglas-Peucker, iterative. Rounded to 3 decimals like the dashboard's own layers."""
    keep = [False] * len(line)
    keep[0] = keep[-1] = True
    stack = [(0, len(line) - 1)]
    while stack:
        a, z = stack.pop()
        if z - a < 2:
            continue
        ax, ay = line[a][:2]
        dx, dy = line[z][0] - ax, line[z][1] - ay
        norm = math.hypot(dx, dy)
        worst, at = -1.0, a
        for i in range(a + 1, z):
            px, py = line[i][0] - ax, line[i][1] - ay
            d = abs(dx * py - dy * px) / norm if norm else math.hypot(px, py)
            if d > worst:
                worst, at = d, i
        if worst > tol:
            keep[at] = True
            stack += [(a, at), (at, z)]
    return [[round(p[0], 3), round(p[1], 3)] for p, k in zip(line, keep) if k]


def polygons(path):
    for f in json.loads(path.read_text())["features"]:
        g = f["geometry"]
        for poly in g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]:
            yield from poly


def land_rings(folder):
    """All of it, Antarctica included for the globe in js/travel-sky.js; the flat map skips what is south of its edge."""
    rings = []
    for ring in polygons(folder / "ne_10m_land.geojson"):
        s = simplify(ring)
        if len(s) >= 4:
            rings.append(s)
    return rings


def mapped_cells(rows):
    """Cells within one cell of a mapped country's outline (level 0 lines other than world-0)."""
    cells = set()
    for r in rows:
        if r["level"] != 0 or r["id"] == "world-0":
            continue
        for line in r["rings"]:
            for (x0, y0), (x1, y1) in zip(line, line[1:]):
                if abs(x1 - x0) > 180:
                    continue
                n = max(1, int(max(abs(x1 - x0), abs(y1 - y0)) / (CELL / 2)))
                for i in range(n + 1):
                    cx = math.floor((x0 + (x1 - x0) * i / n) / CELL)
                    cy = math.floor((y0 + (y1 - y0) * i / n) / CELL)
                    cells.update((cx + a, cy + b) for a in (-1, 0, 1) for b in (-1, 0, 1))
    return cells


def outside(line, cells):
    """The parts of a line whose points are not in the given cells, and not running along the 180 degree cut."""
    parts, cur = [], []
    for p in line:
        if (math.floor(p[0] / CELL), math.floor(p[1] / CELL)) in cells:
            parts.append(cur)
            cur = []
            continue
        if cur and abs(p[0]) == 180 and abs(cur[-1][0]) == 180:
            parts.append(cur)
            cur = []
        cur.append(p)
    parts.append(cur)
    return [c for c in parts if len(c) >= 2]


def world_lines(folder, land, boundaries):
    """Coasts (from the same rings as the land fill) and land borders outside the mapped countries."""
    cells = mapped_cells(boundaries)
    lines = [part for ring in land if max(p[1] for p in ring) >= BOTTOM for part in outside(ring, cells)]
    for f in json.loads((folder / "ne_10m_admin_0_boundary_lines_land.geojson").read_text())["features"]:
        if f["properties"]["FEATURECLA"] in NOT_BORDERS:
            continue
        g = f["geometry"]
        for line in g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]:
            if max(p[1] for p in line) >= BOTTOM:
                lines += outside(simplify(line), cells)
    return lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("assets", type=pathlib.Path)
    ap.add_argument("natural_earth", type=pathlib.Path)
    ap.add_argument("--drop-block-size", help='remove the rows of this block size, e.g. "0.1"')
    args = ap.parse_args()

    out = ROOT / "data" / "travel"
    out.mkdir(parents=True, exist_ok=True)
    land = land_rings(args.natural_earth)
    data = {"land": [{"ring": r} for r in land]}
    for name, asset in ASSETS.items():
        rows = json.loads((args.assets / f"{asset}.json").read_text())
        if name == "boundaries":
            world = world_lines(args.natural_earth, land, rows)
            for r in rows:
                if r["id"] == "world-0":
                    r["rings"] = world
        if name in KEEP:
            rows = [{k: r[k] for k in KEEP[name]} for r in rows]
        if args.drop_block_size and name in HAS_BLOCK_SIZE:
            rows = [r for r in rows if str(r["size"]).rstrip("°") != args.drop_block_size]
        data[name] = rows
    for name, rows in data.items():
        text = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
        (out / f"{name}.json").write_text(text)
        print(f"{name:12} {len(rows):6} rows {len(text) / 1e6:6.2f} MB")


if __name__ == "__main__":
    main()
