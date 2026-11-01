#!/usr/bin/env python3
"""Field lines of the large-amplitude Alfvénon (the switchback model) for js/alfvenon-lines.js.

Source: switch_back.html in this repository (Zesen's Switchback Field-Line Explorer, Plotly, 59 MB): 1,360 field
lines in the unit box, each running from x = 0 to x = 1. This script reads the line coordinates from the Plotly
data, resamples each line to NPTS points by arc length, quantizes them to uint16 over the box and stores them
delta-encoded per line (int16), gzip-compressed:
  data/alfvenon/large.json, data/alfvenon/large-lines.bin.gz
Run: ~/anaconda3/bin/python -I _src/make_switchback_lines.py
"""
import gzip
import json
import pathlib
import re

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "switch_back.html"
OUT = ROOT / "data" / "alfvenon"
NPTS = 200


def main():
    s = SRC.read_text()
    start = [m.start() for m in re.finditer(r"Plotly\.newPlot\(", s)][-1]
    data, _ = json.JSONDecoder().raw_decode(s, s.find("[", start))
    lines = [np.array([d["x"], d["y"], d["z"]], float).T for d in data if d.get("mode") == "lines"]
    res, tmax = [], []
    for p in lines:
        seg = np.linalg.norm(np.diff(p, axis=0), axis=1)
        keep = np.concatenate([[True], seg > 0])
        p = p[keep]
        sarc = np.concatenate([[0], np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))])
        t = np.linspace(0, sarc[-1], NPTS)
        q = np.stack([np.interp(t, sarc, p[:, c]) for c in range(3)], axis=1)
        d = np.diff(q, axis=0)
        tmax.append(float(np.degrees(np.arccos(np.clip(d[:, 0] / np.linalg.norm(d, axis=1), -1, 1))).max()))
        res.append(q)
    res = np.array(res)  # (n, NPTS, 3)
    u = np.clip(np.rint(res * 65535), 0, 65535).astype(np.int32)
    delta = np.concatenate([u[:, :1], np.diff(u, axis=1)], axis=1)  # first point absolute, then steps
    assert np.abs(delta[:, 1:]).max() < 32768
    raw = delta.astype("<i2").tobytes()  # the first point wraps into int16; the reader takes it modulo 65536
    with gzip.open(OUT / "large-lines.bin.gz", "wb", compresslevel=9) as f:
        f.write(raw)
    tmax = np.array(tmax)
    meta = {"box": [1, 1, 1], "lines": int(len(res)), "npts": NPTS, "encoding": "delta-int16", "center": [0.5, 0.5, 0.5],
            "theta_max": float(tmax.max()), "lines_past_90": int((tmax > 90).sum()),
            "source": "switch_back.html (Switchback Field-Line Explorer): the large-amplitude Alfvénon / switchback model"}
    (OUT / "large.json").write_text(json.dumps(meta))
    print("lines", len(res), "theta max %.1f" % tmax.max(), "past 90:", meta["lines_past_90"],
          "file", (OUT / "large-lines.bin.gz").stat().st_size)


if __name__ == "__main__":
    main()
