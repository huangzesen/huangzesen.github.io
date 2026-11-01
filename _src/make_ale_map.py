#!/usr/bin/env python3
"""Write /data/ale-map.json for the interactive ALE astronomy star map (js/ale-map.js).

Reads ~/work/projects/ale-astronomy: data/taxonomy.json (names), harvest/problems.db (open problems) and
verdict/LIST.json (RSI seeds). Only names and counts leave that project: no problem statements, no task
names, no model scores. Run: python3 -I _src/make_ale_map.py
"""
import collections
import json
import pathlib
import sqlite3

BASE = pathlib.Path.home() / "work/projects/ale-astronomy"
OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "ale-map.json"
SHORT = {
    "astro-ph.CO": "Cosmology", "astro-ph.EP": "Earth & planetary", "astro-ph.GA": "Galaxies",
    "astro-ph.HE": "High-energy", "astro-ph.IM": "Instrumentation & methods", "astro-ph.SR": "Solar & stellar",
    "physics.space-ph": "Heliosphere",
}


def main():
    tax = json.load(open(BASE / "data/taxonomy.json"))["root"]
    db = sqlite3.connect(BASE / "harvest/problems.db")
    prob_leaf, prob_area = collections.Counter(), collections.Counter()
    leaf_ids = {d["id"] for f in tax["children"] for a in f["children"] for d in a.get("children", [])}
    for node, leaf in db.execute("select node_id, leaf_id from problems"):
        if leaf and leaf in leaf_ids:
            prob_leaf[leaf] += 1
        elif node in leaf_ids:
            prob_leaf[node] += 1
        else:
            prob_area[node] += 1
    seeds = collections.defaultdict(collections.Counter)
    for s in json.load(open(BASE / "verdict/LIST.json"))["seeds"]:
        seeds[s["unit"]][s["verdict"]] += 1
    cats = []
    for f in tax["children"]:
        areas = []
        for a in f["children"]:
            dirs = [{"id": d["id"], "name": d["name_en"], "zh": d.get("name_zh", ""), "p": prob_leaf[d["id"]],
                     "s": seeds[d["id"]]["strong"], "q": seeds[d["id"]]["possible"]} for d in a.get("children", [])]
            areas.append({"id": a["id"], "name": a["name_en"], "zh": a.get("name_zh", ""),
                          "iau": ", ".join(a.get("iau", [])), "p": prob_area[a["id"]],
                          "s": seeds[a["id"]]["strong"], "q": seeds[a["id"]]["possible"], "dirs": dirs})
        cats.append({"code": f["arxiv"], "name": f["name_en"], "short": SHORT.get(f["arxiv"], f["name_en"]),
                     "zh": f.get("name_zh", ""), "areas": areas})
    tot_p = sum(prob_leaf.values()) + sum(prob_area.values())
    tot_s = sum(c["strong"] for c in seeds.values())
    tot_q = sum(c["possible"] for c in seeds.values())
    data = {"asof": "October 2026", "problems": tot_p, "strong": tot_s, "possible": tot_q,
            "areas": sum(len(c["areas"]) for c in cats),
            "directions": sum(len(a["dirs"]) for c in cats for a in c["areas"]), "cats": cats}
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
    print(f"wrote {OUT} ({OUT.stat().st_size:,} bytes): {tot_p} problems, {tot_s}+{tot_q} seeds, "
          f"{data['areas']} areas, {data['directions']} directions")


if __name__ == "__main__":
    main()
