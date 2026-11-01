#!/usr/bin/env python3
"""Build the data for the interactive Alfvénon viewer (js/alfvenon-viewer.js).

Outputs in data/alfvenon/ (gzip files, decompressed in the browser with DecompressionStream):
  single.json, single-theta.bin.gz, single-lines.bin.gz
      the 128^3 small-amplitude Alfvénon (Helmholtz checkpoint 128-small-amp-1/loop_200/H.npy):
      theta = arccos(Bx/|B|) cropped to where the field bends, and field lines traced from x = 0.
  collision.json, collision-theta.bin.gz, collision-lines.bin.gz
      the native-f64 large-small collision (PLUTO-GPU, 512x256x256, box 2x1x1), 26 keyframes t = 0..1:
      theta downsampled 4x (every 4th x plane, 4x4 averages in y and z) and field lines from fixed seeds.
theta is stored as uint8 with 0..255 = 0..180 degrees; line points as uint16 over the box.
Read-only on the sources. Run with a numpy/scipy Python: ~/anaconda3/bin/python -I _src/make_alfvenon_volumes.py
"""
import gzip
import io
import json
import pathlib
import struct
import sys
import zipfile

import numpy as np
from scipy.ndimage import map_coordinates

OUT = pathlib.Path(__file__).resolve().parent.parent / "data" / "alfvenon"
SINGLE = pathlib.Path("/Volumes/Elements-2/Zesen-4TB-cold-storage/Macintosh-HD-cold-2026-09-23/Helmholtz_algo/"
                      "initial_conditions/checkpoints/128-small-amp-1/loop_200/H.npy")
FRAMES = pathlib.Path("/Volumes/Elements-2/Crucial-8TB-cold-storage/sim_runs/in-use/"
                      "alfvenon_h100_f64_large_small_collision_512_t1_20260801/accepted_job52858486/runs/"
                      "job_52858486/production_t1/frames")
NPTS = 160


def theta_deg(bx, by, bz):
    b = np.sqrt(bx * bx + by * by + bz * bz)
    return np.degrees(np.arccos(np.clip(bx / np.maximum(b, 1e-30), -1, 1)))


def to_u8(theta):
    return np.clip(np.rint(theta / 180.0 * 255.0), 0, 255).astype(np.uint8)


def bbox(mask, pad, shape):
    out = []
    for ax in range(3):
        other = tuple(a for a in range(3) if a != ax)
        idx = np.where(mask.any(axis=other))[0]
        lo, hi = max(0, idx.min() - pad), min(shape[ax], idx.max() + 1 + pad)
        out.append((int(lo), int(hi)))
    return out


def trace(B, box, seeds, smax, ds):
    """RK4 field-line tracing in a periodic box. B: (3, nx, ny, nz) on cell centres; seeds: (n, 3) in box units."""
    n = np.array(B.shape[1:], float)
    L = np.array(box, float)

    def field(p):
        idx = (p / L * n - 0.5).T
        v = np.stack([map_coordinates(B[c], idx, order=1, mode="grid-wrap") for c in range(3)], axis=1)
        return v / np.maximum(np.linalg.norm(v, axis=1, keepdims=True), 1e-12)

    p = seeds.astype(float).copy()
    path = [p.copy()]
    for _ in range(int(smax / ds)):
        k1 = field(p); k2 = field(p + 0.5 * ds * k1); k3 = field(p + 0.5 * ds * k2); k4 = field(p + ds * k3)
        p = p + ds / 6 * (k1 + 2 * k2 + 2 * k3 + k4)
        path.append(p.copy())
    path = np.stack(path, axis=1)  # (n, steps, 3), unwrapped coordinates
    res = []
    for line in path:
        stop = np.argmax(line[:, 0] >= L[0]) if (line[:, 0] >= L[0]).any() else len(line) - 1
        line = line[: stop + 1]
        seg = np.linalg.norm(np.diff(line, axis=0), axis=1)
        s = np.concatenate([[0], np.cumsum(seg)])
        t = np.linspace(0, s[-1], NPTS)
        res.append(np.stack([np.interp(t, s, line[:, c]) for c in range(3)], axis=1))
    return np.array(res)  # (n, NPTS, 3)


def quant_lines(lines, box):
    q = np.clip(np.rint(lines / np.array(box) * 65535), 0, 65535).astype("<u2")
    return q


def seeds_around(cy, cz, radii, counts, x0=0.0):
    pts = []
    for r, k in zip(radii, counts):
        for j in range(k):
            a = 2 * np.pi * j / k + (0.3 if r > radii[0] else 0)
            pts.append([x0, cy + r * np.cos(a), cz + r * np.sin(a)])
    return np.array(pts)


def write_gz(path, data):
    with gzip.open(path, "wb", compresslevel=9) as f:
        f.write(data)
    return path.stat().st_size


def single():
    H = np.load(SINGLE)  # (3, 128, 128, 128): Bx, By, Bz on x, y, z
    print("single |B| mean", float(np.sqrt((H ** 2).sum(0)).mean()), "Bx mean", float(H[0].mean()))
    th = theta_deg(H[0], H[1], H[2])
    n = th.shape[0]
    (x0, x1), (y0, y1), (z0, z1) = bbox(th > 0.6, 3, th.shape)
    vol = to_u8(th[x0:x1, y0:y1, z0:z1])
    w = th ** 2
    cy = float((w.sum((0, 2)) * (np.arange(n) + 0.5)).sum() / w.sum() / n)
    cz = float((w.sum((0, 1)) * (np.arange(n) + 0.5)).sum() / w.sum() / n)
    seeds = seeds_around(cy, cz, [0.0, 0.03, 0.06, 0.1, 0.15], [1, 6, 10, 12, 14])
    lines = trace(H, (1, 1, 1), seeds, smax=1.4, ds=0.25 / n)
    meta = {"box": [1, 1, 1], "dims": list(vol.shape), "order": "x fastest",
            "crop": [[x0 / n, x1 / n], [y0 / n, y1 / n], [z0 / n, z1 / n]], "theta_max": float(th.max()),
            "lines": int(len(lines)), "npts": NPTS, "center": [0.5, cy, cz],
            "source": "Helmholtz checkpoint 128-small-amp-1/loop_200 (Huang et al. 2026a, ApJL 1006, L20)"}
    # store volume x-fastest (WebGL 3D textures are width = x, height = y, depth = z)
    s1 = write_gz(OUT / "single-theta.bin.gz", np.ascontiguousarray(vol.transpose(2, 1, 0)).tobytes())
    s2 = write_gz(OUT / "single-lines.bin.gz", quant_lines(lines, (1, 1, 1)).tobytes())
    (OUT / "single.json").write_text(json.dumps(meta))
    print("single", vol.shape, "theta max %.1f" % th.max(), "files", s1, s2)


def frame_memmap(path):
    z = zipfile.ZipFile(path)
    info = z.getinfo("U.npy")
    assert info.compress_type == 0
    with open(path, "rb") as f:
        f.seek(info.header_offset)
        hdr = f.read(30)
        nlen, xlen = struct.unpack("<HH", hdr[26:30])
        start = info.header_offset + 30 + nlen + xlen
        f.seek(start)
        version = np.lib.format.read_magic(f)
        shape, fortran, dtype = np.lib.format._read_array_header(f, version)
        data_off = f.tell()
    assert shape == (9, 512, 256, 256) and not fortran
    return np.memmap(path, dtype=dtype, mode="r", offset=data_off, shape=shape)


def down(a):
    nx, ny, nz = a.shape
    return a.reshape(nx, ny // 4, 4, nz // 4, 4).mean(axis=(2, 4))


def collision():
    idx = list(range(0, 101, 4))
    Bs, times = [], []
    for k in idx:
        mm = frame_memmap(FRAMES / f"frame_{k:04d}.npz")
        B = np.stack([down(np.asarray(mm[c, ::4])) for c in (5, 6, 7)])  # (3, 128, 64, 64)
        Bs.append(B.astype(np.float32)); times.append(round(k * 0.01, 2))
        print("frame", k, flush=True)
    th = np.stack([theta_deg(*B) for B in Bs])  # (F, 128, 64, 64)
    mask = (th > 1.5).any(axis=0)
    (x0, x1), (y0, y1), (z0, z1) = bbox(mask, 2, mask.shape)
    x0, x1 = 0, 128  # keep the whole length of the box
    w = th[0] ** 2
    cy = float((w.sum((0, 2)) * (np.arange(64) + 0.5)).sum() / w.sum() / 64)
    cz = float((w.sum((0, 1)) * (np.arange(64) + 0.5)).sum() / w.sum() / 64)
    seeds = seeds_around(cy, cz, [0.0, 0.025, 0.05, 0.08, 0.12], [1, 6, 9, 11, 13])
    vols, lines = [], []
    for f, B in enumerate(Bs):
        vols.append(np.ascontiguousarray(to_u8(th[f, x0:x1, y0:y1, z0:z1]).transpose(2, 1, 0)).tobytes())
        lines.append(quant_lines(trace(B, (2, 1, 1), seeds, smax=3.2, ds=0.5 / 64), (2, 1, 1)).tobytes())
        print("lines", f, flush=True)
    meta = {"box": [2, 1, 1], "dims": [x1 - x0, y1 - y0, z1 - z0], "frames": len(idx), "times": times,
            "crop": [[x0 / 64, x1 / 64], [y0 / 64, y1 / 64], [z0 / 64, z1 / 64]],
            "theta_max": float(th.max()), "lines": int(len(seeds)), "npts": NPTS, "center": [1.0, cy, cz],
            "source": "native-f64 PLUTO-GPU large-small Alfvénon collision, 512x256x256, box 2x1x1, frames t = 0..1"}
    s1 = write_gz(OUT / "collision-theta.bin.gz", b"".join(vols))
    s2 = write_gz(OUT / "collision-lines.bin.gz", b"".join(lines))
    (OUT / "collision.json").write_text(json.dumps(meta))
    print("collision dims", meta["dims"], "theta max %.1f" % th.max(), "files", s1, s2)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    which = sys.argv[1:] or ["single", "collision"]
    if "single" in which:
        single()
    if "collision" in which:
        collision()
