#!/usr/bin/env python3
"""Write dark versions of the data figures for the site's dark pages (Zesen, 2026-11-02: "no white spaces").

A plain colour inversion would flip a figure's colour scales. Here only the paper and the ink swap: a pixel with little
colour (white background, black axes and text, greys) gets its lightness inverted, a coloured pixel keeps its colour.
Heat maps and colour bars are listed in KEEP and copied untouched: many colour maps pass through near-white, and swapping
those pixels would draw black contours that are not in the data. A new figure needs its panels measured and listed here.
The originals stay in place: printing and click-to-enlarge use them.
The two collision movies have no alpha, so their paper becomes the Alfvenons page's night colour; they are viridis throughout,
which never passes near white, so they need no KEEP rectangles (check this before adding a movie with another colour map).
Run:  python3 -I _src/make_dark_figures.py     build.py swaps these in by FIGURES_DARK and MOVIES_DARK.
"""
import pathlib
import subprocess

import numpy as np
from PIL import Image

IMAGES = pathlib.Path(__file__).resolve().parent.parent / "images" / "research"
PROP_COLS = [(491, 783), (876, 1168), (1270, 1562)]  # panels (b), (c), (d)
PROP_ROWS = [(76, 83), (100, 391), (440, 731), (780, 1070), (1119, 1410)]  # colour bar, then t = 0, 5, 10, 100
# figure -> rectangles (x0, x1, y0, y1, inclusive) of data colours, inside their axis frames
KEEP = {
    "alfvenon-propagation.png": [(x0, x1, y0, y1) for x0, x1 in PROP_COLS for y0, y1 in PROP_ROWS],
    "alfvenon-theta.png": [(1035, 1057, 265, 939)],  # colour bar
    "psp-5min-e22.jpg": [(729, 1403, y0, y1) for y0, y1 in [(55, 184), (347, 475), (639, 768), (931, 1059)]],  # wavelet spectra (c, e, g, i)
}
LOW, HIGH = 0.05, 0.20  # colourfulness (max - min of RGB) between which a pixel goes from swapped to kept


def keep_weight(rgb):
    t = np.clip((rgb.max(axis=2) - rgb.min(axis=2) - LOW) / (HIGH - LOW), 0, 1)
    return (t * t * (3 - 2 * t))[..., None]


def darken(rgb):
    keep = keep_weight(rgb)
    swapped = rgb + (1 - (rgb.max(axis=2) + rgb.min(axis=2)))[..., None]  # lightness inverted, hue kept
    return np.clip(keep * rgb + (1 - keep) * swapped, 0, 1)


for name, boxes in KEEP.items():
    src = IMAGES / name
    original = np.asarray(Image.open(src).convert("RGB"))
    dark = darken(original.astype(np.float32) / 255)
    alpha = dark.max(axis=2)  # the black paper is transparent, so the page shows through and no blend mode is needed
    colour = np.clip(dark / np.maximum(alpha, 1e-3)[..., None], 0, 1)
    rgba = (np.dstack([colour, alpha]) * 255 + 0.5).astype(np.uint8)
    for x0, x1, y0, y1 in boxes:
        rgba[y0:y1 + 1, x0:x1 + 1, :3] = original[y0:y1 + 1, x0:x1 + 1]
        rgba[y0:y1 + 1, x0:x1 + 1, 3] = 255
    out = IMAGES / f"{src.stem}-dark.webp"
    # a PNG source stays lossless, so the data pixels are identical; a JPEG source is already lossy
    Image.fromarray(rgba, "RGBA").save(out, lossless=src.suffix == ".png", quality=92 if src.suffix != ".png" else 100, alpha_quality=100, exact=True, method=6)
    back = np.asarray(Image.open(out).convert("RGBA")).astype(int)
    worst = max(np.abs(back[y0:y1 + 1, x0:x1 + 1, :3] - original[y0:y1 + 1, x0:x1 + 1].astype(int)).mean() for x0, x1, y0, y1 in boxes)
    opaque = min(back[y0:y1 + 1, x0:x1 + 1, 3].min() for x0, x1, y0, y1 in boxes)
    print(f"{out.name}: {src.stat().st_size / 1e3:.0f} KB original, {out.stat().st_size / 1e3:.0f} KB dark; inside data boxes mean change {worst:.2f} of 255, lowest alpha {opaque}")


NIGHT = np.array([10, 5, 25], dtype=np.float32) / 255  # --th-night of the Alfvenons page


def on_night(frame):
    rgb = frame.astype(np.float32) / 255
    dark = darken(rgb)
    # the night colour goes only under the swapped paper and ink; data colours stay as they were
    paper = (1 - keep_weight(rgb)) * (1 - dark.max(axis=2, keepdims=True))
    return ((dark + NIGHT * paper) * 255 + 0.5).astype(np.uint8)


for stem in ["collision-small-2d-bmag", "collision-small-2d-theta"]:
    src = IMAGES / f"{stem}.mp4"
    poster = np.asarray(Image.open(IMAGES / f"{stem}-poster.jpg").convert("RGB"))
    Image.fromarray(on_night(poster)).save(IMAGES / f"{stem}-dark-poster.jpg", quality=88)
    w, h = (int(v) for v in subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                                            "-of", "csv=p=0", str(src)], capture_output=True, text=True, check=True).stdout.strip().split(","))
    reader = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(src), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    out = IMAGES / f"{stem}-dark.mp4"
    writer = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{w}x{h}", "-r", "15", "-i", "-",
                               "-c:v", "libx264", "-crf", "24", "-preset", "slow", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(out)], stdin=subprocess.PIPE)
    frames = 0
    while True:
        raw = reader.stdout.read(w * h * 3)
        if len(raw) < w * h * 3:
            break
        writer.stdin.write(on_night(np.frombuffer(raw, np.uint8).reshape(h, w, 3)).tobytes())
        frames += 1
    reader.wait()
    writer.stdin.close()
    writer.wait()
    print(f"{out.name}: {frames} frames, {src.stat().st_size / 1e6:.1f} MB original, {out.stat().st_size / 1e6:.1f} MB dark")
