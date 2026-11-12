#!/usr/bin/env python3
"""Write data/travel/trips-other.json: trips away from home that are not in the road-trip list (data/travel/trips.json),
found in the GPS positions and dates of the photo library.

    python3 -I _src/make_other_trips_data.py [photo_library_descriptions.csv] [--curation FILE] [--report]

Source: the photo-library CSV in Drive (UCLA account), `My Drive/Photo Library Descriptions/photo_library_descriptions.csv`
(columns taken, type, place, lat, lon, camera, ..., uuid). Only date, place name, position, type and camera are read; captions,
titles, tags and ids are never read into the output.

How a trip is found
  1. The library mixes several people's phones and a camera without GPS whose positions were guessed from the nearest
     phone photo. Only the phone that was mine at the time (PRIMARY) says where I was.
  2. Home is a base city (BASES, each with the years it was home). A photo more than AWAY_KM from every base of its date
     is "away"; a run of away photos, ended by a photo within HOME_KM of a base, is one episode.
  3. Days covered by a road trip are taken out. Photos taken from a plane window and short airport layovers (a brief stop
     with a fast hop on both sides) are taken out.
  4. What is left is kept if it has enough photos, and, from Los Angeles, if it is far enough to be a flight (FLIGHT_KM) or
     shows a hop too fast for a car. Moves between two bases are not trips.

What is published, because this repository is public
  One stop per city per day: a city name, the day, a position rounded to 0.1 degree (about 10 km), and counts. Places within
  MERGE_KM of each other on one trip count as one city, named after the one with the most photos; so does a place with a
  handful of photos within SUBURB_KM of a much busier one (the airport's town, a suburb). Where the library knows
  only the province (the countryside, mostly), the stop carries the province's name and a position rounded to COARSE degrees,
  the grain of the blocks already on the Travel page. No street, neighbourhood, lodging, caption or exact position. Nothing within AWAY_KM of a base. Legs are great-circle lines between
  the cities in date order, starting and ending at a base's public city-centre point: they are not flight paths.
  Titles and trips to leave out are private choices: they live in the curation file, outside this repository
  (default ~/work/projects/personal/travel-private/other-trips.json: {"titles": {start: title}, "drop": [start, ...]}).
  --report prints the private review table and writes nothing.
"""
import argparse
import collections
import csv
import datetime
import json
import math
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SOURCE = pathlib.Path.home() / "Library/CloudStorage/GoogleDrive-zesenhuang@g.ucla.edu/My Drive/Photo Library Descriptions/photo_library_descriptions.csv"
CURATION = pathlib.Path.home() / "work/projects/personal/travel-private/other-trips.json"

# which phone was mine, by date (the others in the library are family members' and friends')
PRIMARY = [
    ("Apple iPhone 4", "0000-00-00", "2013-07-04"),
    ("Apple iPhone 4S", "2013-07-05", "2015-10-01"),
    ("Apple iPhone 6", "2015-10-02", "2017-08-23"),
    ("Apple iPhone 6s", "2017-08-24", "2019-05-25"),
    ("Apple iPhone XR", "2019-05-26", "2021-05-15"),
    ("Apple iPhone XS Max", "2021-05-16", "2022-07-08"),
    ("Apple iPhone 13", "2022-07-09", "9999-99-99"),
]
# home bases: name, (lat, lon) of the public city centre, first and last date it was home
BASES = [
    ("Guangzhou", (23.13, 113.26), "0000-00-00", "9999-99-99"),
    ("Hefei", (31.82, 117.23), "2015-08-01", "2019-07-31"),
    ("Los Angeles", (34.05, -118.24), "2019-09-01", "9999-99-99"),
]
HOME_KM, AWAY_KM = 60, 120  # nearer than HOME_KM ends a trip; farther than AWAY_KM is away; between, neither
FLIGHT_KM = 700  # from Los Angeles, a trip this far that is not in the road-trip list was flown
FAST_KMH, FAST_KM = 300, 300  # a hop this fast over this distance was not driven
GAP_DAYS = 30  # a silence this long inside an episode splits it
CELL = 0.1  # degrees: published stop positions
COARSE = 0.5  # degrees: a stop known only by its province
MERGE_KM = 15  # places this close on one trip are one city
SUBURB_KM, SUBURB_MAX, SUBURB_RATIO = 50, 8, 5  # so is a place with a few photos this near a place with many times more (an airport's town)

CITY_REGIONS = {"Tokyo": "Tokyo", "Kyoto": "Kyoto", "Osaka": "Osaka", "Nara": "Nara", "Istanbul": "Istanbul", "Bangkok": "Bangkok",
                "Beijing": "Beijing", "Shanghai": "Shanghai", "Chongqing": "Chongqing", "Tianjin": "Tianjin", "Cairo": "Cairo",
                "Hong Kong SAR": "Hong Kong", "Macao SAR": "Macao", "Singapore": "Singapore"}
# districts and old spellings -> the name a reader knows (plain geography, nothing personal); keys are "name, country"
ALIASES = {
    "Surfers Paradise, Australia": "Gold Coast", "Bang Lamung, Thailand": "Pattaya", "Ta-Yen, China": "Lijiang", "Konak, Türkiye": "İzmir",
    "Kocasinan, Türkiye": "Kayseri", "Uchisar, Türkiye": "Cappadocia", "Goreme, Türkiye": "Cappadocia", "QLD, Australia": "Queensland",
    "NSW, Australia": "New South Wales", "VIC, Australia": "Victoria", "Irakleio, Greece": "Heraklion",
}
POOR_NAME = re.compile(r"( Mh\.| Mahallesi| Ward| Precinct| Community)$| - ")  # a neighbourhood's name: use a neighbour's if there is one
US = "United States"


def km(a, b):
    p = math.radians
    h = math.sin(p(b[0] - a[0]) / 2) ** 2 + math.cos(p(a[0])) * math.cos(p(b[0])) * math.sin(p(b[1] - a[1]) / 2) ** 2
    return 2 * 6371 * math.asin(math.sqrt(h))


def city_of(place):
    """(city, tail, coarse) from a reverse-geocoded place name; tail is the US state or the country.
    coarse: the name is only a province or state, so the photo could be anywhere in it."""
    parts = [p.strip() for p in place.split(",") if p.strip()]
    if not parts:
        return "", "", True
    country = parts[-1]
    if len(parts) >= 2 and parts[-2] in CITY_REGIONS:
        city = CITY_REGIONS[parts[-2]]
    elif country == "Taiwan" and len(parts) >= 2:
        city = re.sub(r" City$", "", parts[-2])
    elif len(parts) >= 3:
        city = parts[-3]
    else:
        city = parts[0] if len(parts) == 2 else ""
    if country == US:
        if re.fullmatch(r"[A-Z]{2}", city or ""):
            city = ""
        tail = parts[-2] if len(parts) >= 2 and re.fullmatch(r"[A-Z]{2}", parts[-2]) else "USA"
    else:
        tail = "China" if country == "China" and city not in ("Hong Kong", "Macao") else country
        if city in ("Hong Kong", "Macao"):
            tail = ""
    city = re.sub(r" District$", "", city)
    coarse = len(parts) == 2 and city not in CITY_REGIONS.values()
    return city, tail, coarse


def utc(taken, lon, place):
    """Stored times are local to where the photo was taken; a zone guessed from the longitude puts them in one order."""
    off = 8 if place.endswith(("China", "Taiwan")) else round(lon / 15)
    return datetime.datetime.strptime(taken, "%Y-%m-%d %H:%M") - datetime.timedelta(hours=off)


def nearest_base(pos, day):
    best = None
    for name, c, a, b in BASES:
        if a <= day <= b:
            d = km(pos, c)
            if best is None or d < best[0]:
                best = (d, name)
    return best


def load(path):
    csv.field_size_limit(10 ** 9)
    rows = []
    with open(path, newline="", encoding="utf-8-sig", errors="replace") as f:
        for r in csv.DictReader(f):
            try:
                lat, lon = float(r["lat"]), float(r["lon"])
            except ValueError:
                continue
            if not r["taken"] or (lat == 0 and lon == 0):
                continue
            day = r["taken"][:10]
            mine = any(r["camera"] == c and a <= day <= b for c, a, b in PRIMARY)
            rows.append({"t": utc(r["taken"], lon, r["place"]), "local": r["taken"], "day": day, "pos": (lat, lon), "place": r["place"], "video": r["type"] == "video", "mine": mine})
    rows.sort(key=lambda r: r["t"])
    return rows


def episodes(mine):
    """Runs of away photos between two photos at home."""
    out, cur, last_home = [], None, None
    for r in mine:
        d, base = nearest_base(r["pos"], r["day"])
        r["base_km"] = d
        if d < HOME_KM:
            if cur:
                cur["to"], cur["home_after"] = base, r
                out.append(cur)
                cur = None
            last_home = (base, r)
            continue
        if cur and (r["t"] - cur["rows"][-1]["t"]).days > GAP_DAYS:
            out.append(cur)
            cur = None
        if d > AWAY_KM and not cur:
            cur = {"from": last_home[0] if last_home else None, "home_before": last_home[1] if last_home else None, "to": None, "home_after": None, "rows": []}
        if cur and d > AWAY_KM:
            cur["rows"].append(r)
    if cur:
        out.append(cur)
    return out


def visits(rows):
    """Consecutive photos within 30 km of where the run began."""
    out = []
    for r in rows:
        if out and km(out[-1][0]["pos"], r["pos"]) < 30:
            out[-1].append(r)
        else:
            out.append([r])
    return out


def speed(a, b):
    """km/h between two photos, and the distance; None if the clock gives no usable gap."""
    if a is None or b is None:
        return None, 0
    d = km(a["pos"], b["pos"])
    h = (b["t"] - a["t"]).total_seconds() / 3600
    return (d / max(h, 0.25), d) if h > -3 else (None, d)  # the zone guess can be off by a couple of hours


def flying(a, b):
    """Two photos a few minutes apart and too far apart for a car: taken from a plane (or a fast train) on the move."""
    if a is None or b is None:
        return False
    d = km(a["pos"], b["pos"])
    h = (b["t"] - a["t"]).total_seconds() / 3600
    same_clock = (a["t"] - datetime.datetime.strptime(a["local"], "%Y-%m-%d %H:%M")) == (b["t"] - datetime.datetime.strptime(b["local"], "%Y-%m-%d %H:%M"))
    return same_clock and 0 <= h < 1 and d > 8 and d / max(h, 0.025) > 200


def clean(ep):
    """Drop plane-window photos, airport layovers and arrival points; report whether any hop was too fast for a car.
    Repeated until nothing more goes: with the window photos gone, the layover behind them shows."""
    vs = visits(ep["rows"])
    alive, fast, changed = [True] * len(vs), False, True
    while changed:
        idx = [i for i in range(len(vs)) if alive[i]]
        drop = []
        for k, i in enumerate(idx):
            v = vs[i]
            before = vs[idx[k - 1]][-1] if k else ep["home_before"]
            after = vs[idx[k + 1]][0] if k + 1 < len(idx) else ep["home_after"]
            s_in, d_in = speed(before, v[0])
            s_out, d_out = speed(v[-1], after)
            f_in = s_in is not None and s_in > FAST_KMH and d_in > FAST_KM
            f_out = s_out is not None and s_out > FAST_KMH and d_out > FAST_KM
            fast = fast or f_in or f_out
            dwell = (v[-1]["t"] - v[0]["t"]).total_seconds() / 3600
            quick_in = s_in is not None and s_in > 180 and d_in > 60
            quick_out = s_out is not None and s_out > 180 and d_out > 60
            layover = dwell < 5 and (f_in or quick_in) and (f_out or quick_out)
            small, more = len(v) <= 8, len(idx) > 1
            # a few photos in one spot with the plane's speed on one side: a window seat
            window = small and dwell < 0.5 and (f_in or f_out or flying(before, v[0]) or flying(v[-1], after) or any(flying(a, b) for a, b in zip(v, v[1:])))
            # a few photos where a long jump begins or ends, and other places on the trip: the airport, not a place visited
            jump_in = d_in > FLIGHT_KM and (s_in is None or s_in > 150)
            jump_out = d_out > FLIGHT_KM and (s_out is None or s_out > 150)
            gate = small and dwell < 1.5 and more and (jump_in or jump_out)
            # one photo far from the places before and after: taken on the way, not a stop
            passing = len(v) == 1 and more and d_in > 100 and d_out > 100
            if layover or window or gate or passing:
                drop.append(i)
        for i in drop:
            alive[i] = False
        changed = bool(drop)
    return [r for i, v in enumerate(vs) if alive[i] for r in v], fast


def city_clusters(kept):
    """The trip's photos as cities: places within MERGE_KM of each other are one, named after the busiest."""
    def centre(rs):
        return (sum(r["pos"][0] for r in rs) / len(rs), sum(r["pos"][1] for r in rs) / len(rs))
    named = collections.defaultdict(list)
    loose = []
    for r in kept:
        city, tail, coarse = city_of(r["place"])
        r["tail"] = tail
        (loose if coarse or not city else named[(city, tail)]).append(r)
    out = []
    for key, rs in sorted(named.items(), key=lambda kv: -len(kv[1])):
        c = centre(rs)
        near = [cl for cl in out if km(c, cl["c"]) < MERGE_KM]
        if near:
            cl = min(near, key=lambda cl: km(c, cl["c"]))
            cl["rows"] += rs
            cl["names"][key] += len(rs)
        else:
            out.append({"c": c, "rows": list(rs), "names": collections.Counter({key: len(rs)})})
    for small in sorted(out, key=lambda cl: len(cl["rows"])):
        if len(small["rows"]) > SUBURB_MAX:
            break
        big = [cl for cl in out if cl is not small and len(cl["rows"]) >= SUBURB_RATIO * len(small["rows"]) and km(small["c"], cl["c"]) < SUBURB_KM]
        if big:
            max(big, key=lambda cl: len(cl["rows"]))["rows"] += small["rows"]
            small["rows"] = []
    out = [cl for cl in out if cl["rows"]]
    for cl in out:
        good = [k for k in cl["names"] if not POOR_NAME.search(k[0])] or list(cl["names"])
        city, tail = max(good, key=lambda k: cl["names"][k])
        name = city + (", " + tail if tail else "")
        cl["name"] = ALIASES.get(name, city) + (", " + tail if tail else "")
        cl["coarse"] = False
    rough = {}
    for r in loose:  # only a province's name, or none: the nearest city if it is close, else a province-level stop
        near = [cl for cl in out if not cl["coarse"] and km(r["pos"], cl["c"]) < 25]
        if near:
            min(near, key=lambda cl: km(r["pos"], cl["c"]))["rows"].append(r)
            continue
        city, tail, _ = city_of(r["place"])
        if not city:
            continue
        cell = (round(r["pos"][0] / COARSE), round(r["pos"][1] / COARSE))
        name = city + (", " + tail if tail else "")
        key = (name, cell)
        if key not in rough:
            rough[key] = {"rows": [], "name": ALIASES.get(name, city) + (", " + tail if tail else ""), "coarse": True, "p": [cell[1] * COARSE, cell[0] * COARSE]}
            out.append(rough[key])
        rough[key]["rows"].append(r)
    for cl in out:
        if not cl["coarse"]:
            c = centre(cl["rows"])
            cl["p"] = [round(round(c[1] / CELL) * CELL, 1), round(round(c[0] / CELL) * CELL, 1)]
    return out


def auto_title(stops):
    top, lands = collections.Counter(), collections.Counter()
    for s in stops:
        name, _, tail = s["n"].partition(", ")
        top[name] += (s["ph"] + s["v"]) * (0.001 if s.get("c") else 1)  # a province only when no city is named
        lands["" if re.fullmatch(r"[A-Z]{2}|USA|China|", tail) else tail] += s["ph"] + s["v"]
    cities = [n for n, w in top.most_common() if w >= 1]
    names = (cities or [n for n, _ in top.most_common()])[:3]
    text = names[0] if len(names) == 1 else ", ".join(names[:-1]) + " and " + names[-1]
    abroad = [k for k in lands if k]
    return f"{abroad[0]}: {text}" if len(abroad) == 1 and not lands[""] and abroad[0] not in text else text


def build(rows, road, curation):
    mine = [r for r in rows if r["mine"]]
    road_days = set()
    for t in road:
        a, b = datetime.date.fromisoformat(t["start"]), datetime.date.fromisoformat(t["end"])
        for k in range(-1, (b - a).days + 2):
            road_days.add((a + datetime.timedelta(days=k)).isoformat())
    by_day = collections.defaultdict(list)  # everyone's items, to count what a trip holds
    for r in rows:
        by_day[r["day"]].append(r)
    trips, review = [], []
    for ep in episodes(mine):
        keep0, fast = clean(ep)
        kept = [r for r in keep0 if r["day"] not in road_days]
        note = ""
        if not kept:
            continue
        days = sorted({r["day"] for r in kept})
        far = max(r["base_km"] for r in kept)
        # the base is an end of the line unless a road trip took that part of the journey
        cut_before = any(r["day"] in road_days for r in ep["rows"] if r["t"] < kept[0]["t"])
        cut_after = any(r["day"] in road_days for r in ep["rows"] if r["t"] > kept[-1]["t"])
        relocation = ep["from"] != ep["to"] and ep["from"] and ep["to"]
        from_la = "Los Angeles" in (ep["from"], ep["to"])
        if relocation and len(days) <= 2:
            note = "move between bases"
        elif len(kept) < 5 or (len(days) < 2 and len(kept) < 10):
            note = "too few photos"
        elif from_la and far < FLIGHT_KM and not fast:
            note = "near enough to drive, no fast hop"
        if (cut_before or cut_after) and len(days) < 2:
            note = note or "a stop on the way to a road trip"
        cities = city_clusters(kept)
        stops = {}
        for c in cities:
            for r in c["rows"]:
                s = stops.setdefault((r["day"], c["name"], tuple(c["p"])), {"d": r["day"], "p": c["p"], "n": c["name"], "ph": 0, "v": 0, "t": r["t"], "c": c["coarse"]})
                s["v" if r["video"] else "ph"] += 1
                s["t"] = min(s["t"], r["t"])
        stops = sorted(stops.values(), key=lambda s: s["t"])
        if not stops:
            continue
        # legs: base, the cities in order, base
        def base_point(name):
            c = next(b[1] for b in BASES if b[0] == name)
            return [c[1], c[0]]
        legs = [base_point(ep["from"])] if ep["from"] and not cut_before else []
        for s in stops:
            if not legs or km((legs[-1][1], legs[-1][0]), (s["p"][1], s["p"][0])) > 40:
                legs.append(s["p"])
        if ep["to"] and not cut_after:
            legs.append(base_point(ep["to"]))
        miles = sum(km((a[1], a[0]), (b[1], b[0])) for a, b in zip(legs, legs[1:])) / 1.609344
        # everything in the library from these days near where I was (the camera and companions included)
        photos = videos = 0
        for d in days:
            mine_d = [r["pos"] for r in kept if r["day"] == d]
            for r in by_day[d]:
                if r["mine"] and r in kept or (not r["mine"] and any(km(r["pos"], p) < 60 for p in mine_d)):
                    videos += r["video"]
                    photos += not r["video"]
        auto = auto_title(stops)
        for s in stops:
            del s["t"]
            if not s.pop("c"):
                continue
            s["c"] = 1  # known only by its province
        start = days[0]
        title = curation.get("titles", {}).get(start, auto)
        if start in curation.get("drop", []):
            note = note or "dropped in the curation file"
        trip = {"id": start + "-" + re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:28].strip("-"), "title": title, "start": start, "end": days[-1],
                "days": len(days), "miles": int(round(miles, -1)), "photos": photos, "videos": videos, "from": ep["from"], "to": ep["to"],
                "legs": legs, "stops": stops}
        review.append((trip, note, far, fast, auto))
        if not note:
            trips.append(trip)
    return trips, review


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", nargs="?", default=str(SOURCE))
    ap.add_argument("--curation", default=str(CURATION))
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()
    road = json.loads((ROOT / "data/travel/trips.json").read_text())["trips"]
    cur = pathlib.Path(args.curation)
    curation = json.loads(cur.read_text()) if cur.exists() else {}
    trips, review = build(load(args.source), road, curation)
    if args.report:
        for t, note, far, fast, auto in review:
            cities = collections.Counter()
            for s in t["stops"]:
                cities[s["n"]] += s["ph"] + s["v"]
            print(f"{'-' if note else '+'} {t['start']}..{t['end']} {t['days']:3d}d {t['photos']:5d}ph {far:6.0f}km {'fast' if fast else '    '} {t['from'] or '?':11}>{t['to'] or '?':11} "
                  f"{t['miles']:6d}mi | {t['title'][:44]:44} | {note or '; '.join(f'{k}({v})' for k, v in cities.most_common(7))[:150]}")
        print(len(trips), "trips kept of", len(review))
        return
    out = ROOT / "data/travel/trips-other.json"
    text = json.dumps({"bases": [{"name": b[0], "p": [b[1][1], b[1][0]]} for b in BASES], "away_km": AWAY_KM, "trips": trips}, ensure_ascii=False, separators=(",", ":"))
    out.write_text(text)
    print(f"wrote {out.relative_to(ROOT)}: {len(trips)} trips, {sum(len(t['stops']) for t in trips)} stops, {len(text) / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
