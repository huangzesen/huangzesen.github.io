#!/usr/bin/env python3
"""Write data/travel/trips.json for /travel/trips/ from the Google Earth trip files in Zesen's UCLA Drive
(My Drive/Google Earth KMZ Projects/Photo-mapped Trips, made 2026-11-10; its README.txt explains them).

    python3 -I _src/make_trips_data.py ["<folder of the KMZ files>"]

Each dated KMZ is one trip: day folders of photo-GPS clusters (about 650 m grid) and road lines that are saved
plans or typical OSRM routes, not recorded tracks. This repository and its history are public, so only this
much is written:
  - routes, simplified to about 150 m and rounded to 3 decimals;
  - stops per day: place name, photo and video counts, position rounded to 0.01 degree (about 1 km);
  - NOTHING within HOME_KM of the Los Angeles city-centre reference: routes are cut at that circle and joined
    to the centre by a straight line, stops inside it are dropped. Saved plans start at a street address;
    this keeps home and daily-life places out;
  - no photo captions, media ids, exact photo positions, saved pins (lodging) or hidden layers.
"2025 Business Trip" (no dates, no route) is left out.
"""
import json
import math
import pathlib
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = pathlib.Path.home() / "Library/CloudStorage/GoogleDrive-zesenhuang@g.ucla.edu/My Drive/Google Earth KMZ Projects/Photo-mapped Trips"
K = "{http://www.opengis.net/kml/2.2}"
LA = (-118.2437, 34.0522)  # public city-centre reference, not a home
HOME_KM = 35
TOL_KM = 0.15
SKIP = ("2025 Business Trip",)

# file stem -> title on the page (the saved-plan names are working titles); others use the KMZ's own name
TITLES = {
    "2023-03-25 Hemet and March Field - Day Trip": "Hemet: poppies by the lake",  # Zesen, 2026-11-10: a real trip, "went to a lake to see poppy flowers"
    "2024-10-07 2024-Oct Road Trip": "Southern Utah and the San Juan Mountains",
    "2024-11-18 2024-Nov Egypt": "Egypt: Cairo, Luxor and Aswan",
    "2024-12-23 2025-new-year-vegas-moab-trip": "Las Vegas, Moab and southern Utah",
    "2025-06-07 Jun 2025 SoCal 5day road trip": "Death Valley, Yosemite and Hearst Castle",
    "2025-07-12 Jul 2025 CA OR": "California and Oregon loop",
    "2025-08-17 Aug 2025 Seattle WA": "Washington: Rainier, Olympic and the Cascades",
    "2025-09-19 Sep 2025 San Jose US395": "San Jose and US-395",
    "2025-10 Big Bear and Joshua Tree - Date Uncertain": "Big Bear and Joshua Tree",
    "2025-12-25 2026 New Year Trip Diary": "Arizona and Utah over New Year",
    "2026-01-15 2026-01 CA-1 LA to monterey": "Highway 1 to Monterey",
    "2026-05-25 2026 May June Silicon Valley - mammoth lakes": "Silicon Valley and Mammoth Lakes",
}
LODGING = re.compile(r"\b(inn|hotel|motel|resort|lodge|lodging|suites?|villa|hostel|airbnb|alila|hilton|marriott|hyatt|ranch at|estates?)\b", re.I)
# the base map only needs the parts of the world the trips touch: [west, south, east, north]
REGIONS = ([-172, 22, -62, 72], [22, 18, 40, 34])


def km(a, b):
    la1, la2 = math.radians(a[1]), math.radians(b[1])
    dx = math.radians(b[0] - a[0]) * math.cos((la1 + la2) / 2)
    return 6371.0 * math.hypot(dx, la2 - la1)


def simplify(line, tol_km=TOL_KM):
    if len(line) < 3:
        return line
    k = math.cos(math.radians(line[0][1])) * 111.2
    xy = [(p[0] * k, p[1] * 111.2) for p in line]
    keep = [False] * len(line)
    keep[0] = keep[-1] = True
    stack = [(0, len(line) - 1)]
    while stack:
        a, b = stack.pop()
        if b - a < 2:
            continue
        ax, ay = xy[a]
        bx, by = xy[b]
        dx, dy = bx - ax, by - ay
        n = math.hypot(dx, dy) or 1e-12
        best, at = 0, None
        for i in range(a + 1, b):
            d = abs((xy[i][0] - ax) * dy - (xy[i][1] - ay) * dx) / n if n > 1e-9 else math.hypot(xy[i][0] - ax, xy[i][1] - ay)
            if d > best:
                best, at = d, i
        if best > tol_km:
            keep[at] = True
            stack += [(a, at), (at, b)]
    return [p for p, k_ in zip(line, keep) if k_]


def cut_home(line):
    """Pieces of the line outside the home circle; where it enters or leaves, a straight leg to the centre."""
    out, cur = [], []
    prev_in = None
    for p in line:
        inside = km(p, LA) < HOME_KM
        if inside:
            if cur:
                cur.append(LA)
                out.append(cur)
                cur = []
        else:
            if prev_in and not cur:
                cur = [LA]
            cur.append(p)
        prev_in = inside
    if cur:
        out.append(cur)
    return [c for c in out if len(c) > 1]


JUNK = {"First"}  # geocoder leftovers that are not place names


def clean_place(name):
    """Town-level name: no street numbers or roads, and a lodging's name gives way to its town."""
    name = re.sub(r"\s+\d{5}(-\d{4})?$", "", re.sub(r", (United States|USA)$", "", name.strip()))
    parts = [p.strip() for p in name.split(",") if p.strip()]
    while len(parts) > 1 and (re.match(r"\d", parts[0]) or LODGING.search(parts[0])):
        parts.pop(0)
    if len(parts) > 2:  # "Sol Duc Falls, Some Road, Port Angeles, WA" -> the sight and its town
        parts = [parts[0]] + parts[-2:] if not re.search(r"\b(road|rd|street|st|avenue|ave|highway|hwy|drive|dr|blvd|scenic|\d+)\b", parts[0], re.I) else parts[-2:]
        parts = [p for i, p in enumerate(parts) if not (0 < i < len(parts) - 2)]
        if len(parts) == 3 and re.search(r"\b(road|rd|street|st|avenue|ave|highway|hwy|drive|dr|blvd|scenic|\d+)\b", parts[1], re.I):
            parts.pop(1)
    if not parts or LODGING.search(parts[0]) or re.match(r"\d", parts[0]) or parts[0] in JUNK:
        return ""
    return ", ".join(parts)


def visible_folders(el, hidden=False):
    for f in el.findall(K + "Folder"):
        h = hidden or f.findtext(K + "visibility") == "0"
        yield f, h
        yield from visible_folders(f, h)


def read_trip(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read(next(n for n in z.namelist() if n.endswith(".kml"))))
    doc = root.find(K + "Document")
    saved, typical, stops, joins = [], [], {}, False
    est = next((float(d.findtext(K + "value")) for d in doc.findall(K + "ExtendedData/" + K + "Data") if d.get("name") == "estimated_route_miles"), None)
    for folder, hidden in visible_folders(doc):
        if hidden:
            continue
        name = folder.findtext(K + "name") or ""
        day = re.fullmatch(r"\d{4}-\d{2}-\d{2}", name)
        for pm in folder.findall(K + "Placemark"):
            ls = pm.find(".//" + K + "LineString")
            if ls is not None:
                pts = [tuple(float(v) for v in c.split(",")[:2]) for c in ls.findtext(K + "coordinates").split()]
                kind = next((d.findtext(K + "value") for d in pm.findall(K + "ExtendedData/" + K + "Data") if d.get("name") == "route_kind"), "")
                (typical if kind else saved).append(pts)
                joins = joins or (bool(kind) and "continuation" in name)
                continue
            pt = pm.find(K + "Point")
            data = {d.get("name"): d.findtext(K + "value") for d in pm.findall(K + "ExtendedData/" + K + "Data")}
            if pt is None or not day or "photos" not in data:
                continue  # saved pins and itinerary markers are not published
            x, y = (float(v) for v in pt.findtext(K + "coordinates").split(",")[:2])
            if km((x, y), LA) < HOME_KM:
                continue
            place = clean_place((pm.findtext(K + "name") or "").split(" — ")[0])
            if not place:
                continue
            key = (name, round(x, 2), round(y, 2))
            s = stops.setdefault(key, {"d": name, "p": [round(x, 2), round(y, 2)], "n": place, "ph": 0, "v": 0})
            s["ph"] += int(data.get("photos") or 0)
            s["v"] += int(data.get("videos") or 0)
    # a saved plan and a typical route for the same days would be drawn twice: the typical one wins, unless it only continues the plan
    length = lambda group: sum(km(a, b) for pts in group for a, b in zip(pts, pts[1:]))
    lines = typical if (saved and typical and not joins and length(typical) > 0.6 * length(saved)) else saved + typical
    miles = est or sum(km(a, b) for pts in lines for a, b in zip(pts, pts[1:])) / 1.609344
    routes = [[[round(x, 3), round(y, 3)] for x, y in simplify(piece)] for pts in lines for piece in cut_home(pts)]
    stops = sorted(stops.values(), key=lambda s: s["d"])
    return doc.findtext(K + "name"), routes, stops, miles


def main():
    src = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    trips = []
    for path in sorted(src.glob("20*.kmz")):
        stem = path.stem
        if any(stem.startswith(s) for s in SKIP):
            continue
        name, routes, stops, miles = read_trip(path)
        days = sorted({s["d"] for s in stops})
        start = re.match(r"\d{4}-\d{2}(-\d{2})?", stem).group(0)
        title = TITLES.get(stem) or re.sub(r"\s+—\s+.*$", "", name)
        trips.append({
            "id": re.sub(r"[^a-z0-9]+", "-", stem.lower()).strip("-")[:40],
            "title": title, "start": days[0] if days else start, "end": days[-1] if days else start,
            "days": len(days), "miles": int(round(miles, -1)),
            "photos": sum(s["ph"] for s in stops), "videos": sum(s["v"] for s in stops),
            "routes": routes, "stops": stops,
        })
        top = sorted(stops, key=lambda s: -(s["ph"] + s["v"]))[:6]
        print(f"{stem[:46]:46} {len(days):2}d {miles:6.0f} mi  routes {len(routes):2} pts {sum(len(r) for r in routes):5} stops {len(stops):3} | {'; '.join(s['n'] for s in top)[:110]}")
    trips.sort(key=lambda t: t["start"])
    out = ROOT / "data" / "travel" / "trips.json"
    text = json.dumps({"home": [round(LA[0], 2), round(LA[1], 2)], "home_km": HOME_KM, "trips": trips}, ensure_ascii=False, separators=(",", ":"))
    out.write_text(text)
    print(f"wrote {out.relative_to(ROOT)}: {len(trips)} trips, {len(text) / 1e6:.2f} MB")
    write_base()


def write_base():
    """Land and first-level borders near the trips, from the Travel page's own layers (Natural Earth and the dashboard)."""
    def near(ring):
        xs = [p[0] for p in ring]
        ys = [p[1] for p in ring]
        return any(min(xs) <= e and max(xs) >= w and min(ys) <= n and max(ys) >= s for w, s, e, n in REGIONS)
    travel = ROOT / "data" / "travel"
    def slim(ring, closed):
        k = math.cos(math.radians(ring[0][1])) * 111.2
        if closed and (max(p[0] for p in ring) - min(p[0] for p in ring)) * k < 12 and (max(p[1] for p in ring) - min(p[1] for p in ring)) * 111.2 < 12:
            return None  # islets under 12 km do not show at the map's scales
        if not closed and max(max(p[0] for p in ring) - min(p[0] for p in ring), max(p[1] for p in ring) - min(p[1] for p in ring)) < 0.1:
            return None  # the border layers carry thousands of coast fragments a few points long; the land layer draws coasts
        out = [[round(x, 2), round(y, 2)] for x, y in simplify(ring, 1.5)]
        return out if len(out) > (3 if closed else 1) else None
    land = [r for r in (slim(row["ring"], True) for row in json.loads((travel / "land.json").read_text()) if near(row["ring"])) if r]
    borders = [[r, row["level"]] for row in json.loads((travel / "boundaries.json").read_text()) if row["level"] <= 1
               for r in (slim(ring, False) for ring in row["rings"] if near(ring)) if r]
    text = json.dumps({"land": land, "borders": borders}, separators=(",", ":"))
    (travel / "trips-base.json").write_text(text)
    print(f"wrote data/travel/trips-base.json: {len(land)} land rings, {len(borders)} border lines, {len(text) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
