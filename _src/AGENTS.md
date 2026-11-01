# zesen.me source

This repository (`huangzesen/huangzesen.github.io`, public, GitHub Pages) is Zesen's personal site.
`https://zesen.me` is the Cloudflare Worker `zesen-me-private-travel` (route `zesen.me/*`), which proxies every
path to `https://huangzesen.github.io`. Pushing to `master` is what publishes the site: **it is public, so ask Zesen
before pushing.**

`_src/` is not published (Jekyll skips folders that start with `_`).

## Layout (redesign of 2026-10-31, modelled on https://jiaxuanli.me/research/)

| Path | What |
|---|---|
| `_src/layout.html` | shared header bar (name + uppercase nav; Research sub-menu lists the topic pages), the dark hero band (`build.py` moves each page's `<header class="post-header">` into it, over the `.hero-canvas`), footer, figure lightbox, the github.io redirect line |
| `_src/pages/*.html` | page bodies; first line `<!--meta {"title", "description", "path", "nav", "scripts"?} -->`; `<!--include partials/x -->` pastes a file from `_src/` |
| `_src/build.py` | writes every page's `index.html` at its `path` (`python3 -I _src/build.py`): About `/`, Research overview `/research/` plus one page per topic (`research-alfvenons.html` → `/research/alfvenons/`, `research-lingtai`, `research-scienceide`, `research-ale-astronomy`, `research-solar-wind`), `/publications/`, `/cv/`, `/software/`, `/miscellany/` |
| `_src/pages/cv.html` → `cv/` | the CV as a web page, from `~/work/projects/job-search/2026-academic/latex/shared/cv.tex` (Oct 30). Public edits: pending proposals left out, the high-school mentee not named, title Postdoctoral Researcher (Assistant Researcher from Jan 2027 is pending; SPINE.md section 3b), B.S. with Honors, School of Earth and Space Sciences (Zesen, 2026-10-31). `cv/Zesen_Huang_CV.pdf` is printed from the page: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf=cv/Zesen_Huang_CV.pdf http://127.0.0.1:18431/cv/` (print styles at the end of `css/site.css`); re-print after editing the CV |
| `_src/make_ale_map.py` → `data/ale-map.json` | names and counts per category / area / direction for the interactive star map `js/ale-map.js` (ALE astronomy page); `images/research/ale-map-thumb.jpg` is a screenshot of it (static fallback and card image) |
| `_src/make_ale_chart.py` | `partials/ale-chart.svg` (bar chart by category; `--live` recounts) |
| `_src/make_pubs.py` | `partials/pubs-{first,co}.html` from Crossref works carrying ORCID 0000-0001-9570-5975 (review before building); `pubs-extra.html` (preprints) and `pubs-workshop.html` are hand-kept from the CV |
| `explorers/alfvenon-small-amplitude.html` | the interactive 3D Alfvénon (θ isosurfaces 0–45° and field lines, 128³ small-amplitude model), a self-contained PyVista/vtk.js export; copy of `alfvenon/simulations/reports/figure3_interactive_search_2026-06-24/FOUND_high_resolution_contours_deg_small_amp.html` (original on Elements-2 under `Helmholtz_algo/initial_conditions/html_export/high_res/`, notebook `visualize_contour_advanced_small_amp.ipynb`). Linked under the viewer as the "classic 3D view" (`partials/alfvenon-explorer.html`, the old click-to-load embed, is no longer included). `switch_back.html` (59 MB, Plotly) is the switchback field-line explorer |
| `images/research/collision-small-2d-{bmag,theta}.mp4` | the two 2D collision movies from Zesen's Dartmouth slides (2026-10-05, OneDrive `Presentations/2026-10-05 Dartmouth/`, embedded videos 5 and 4): LAPS run `run_sim/test_colliding_small_amp_256` (+ `_extend`), 512×256×256, box 2×1×1, γ 1.05, no explicit dissipation; plotted by `Helmholtz_algo/analyze_nbs/collison.ipynb`. Shown on the Alfvénons page in a two-tab player |
| `js/alfvenon-viewer.js` + `partials/alfvenon-viewer.html` | the interactive viewer at the top of the Alfvénons page: three.js 0.160.0 (import map, jsdelivr), WebGL2 ray-marched volume of θ = arccos(Bx/|B|) with flowing field lines. Two scenes: Collision (26 keyframes t = 0..1 blended in the shader; θ colour scale to 90°, white-hot beyond) and One Alfvénon (θ to 45°). Controls: θ threshold, glow, field lines, nested shells, auto-rotate, play/scrub/speed, reset, full screen. Test hooks: `?av=single|collision`, `?avt=0.5` (open paused at that time). Without WebGL2 it shows the collision poster. Headless screenshots need `--use-angle=swiftshader --enable-unsafe-swiftshader` |
| `_src/make_alfvenon_volumes.py` → `data/alfvenon/` | the viewer's data (`{single,collision}.json`, `*-theta.bin.gz` uint8 θ, `*-lines.bin.gz` uint16 line points; gzip decoded in the browser). Single: Helmholtz checkpoint `128-small-amp-1/loop_200/H.npy` (Elements-2). Collision: frames of the native-f64 run `alfvenon_h100_f64_large_small_collision_512_t1_20260801/.../production_t1/frames/` (Elements-2), every 4th x-plane and 4×4 averages in y, z (128×64×60 per frame, 1.5 MB in all; the averaging lowers the peak θ, so only a few voxels pass 90°). Needs the drive mounted; ~10 min |
| `js/site.js` | site layer on every page: the hero canvas (field lines carrying solitary kinks; pointer move or tap launches them; gold rings where two cross), scroll reveals (`.reveal`, forced visible in print), the publications search and filter chips (`.pub-filter`, groups `data-pubgroup`), the CV's sticky section index (`.cv-toc`) |
| `js/player.js` | movie player with a time scrubber for `.sim-player` blocks (Alfvénon collision) |
| `css/site.css` | all styles (UCLA darker blue header `#005587`, gold rule `#ffb81c`) |
| `images/research/` | Alfvénon θ contour, constant-|B| diagram and propagation figure (Huang+ 2026 ApJL 1006 L20, from `~/work/GitHub/Spherically-Polarized-Alfven-Waves-PRL/figures`); collision movie `alfvenon-collision.mp4` (re-encoded r3c render of the native-f64 large–small run, `alfvenon/data/in-use/large_small_collision_512/analysis/theta3d_large_small_orbit_v1/full101_highpoly_v3_60deg/production_v3c_prominent_contained/movie/`); PSP 5-min E22 figure (Huang+ 2026 ApJL 999 L4); ScienceIDE overview and pipeline (repo `aitofound/ScienceIDE`); LingTai network loop (repo `Lingtai-AI/lingtai`, MP4 starting at 12 s) |

Other folders and the two big `switch_back*.html` pages are older standalone pages linked from Miscellany; leave
them alone. `travel-plan/` is a personal trip page, public but unlinked; keep it out of the nav.

`huangzesen.github.io` is pointed at zesen.me by a one-line script in every page's `<head>` (in `_src/layout.html` and the
older pages, not the two `switch_back*.html` files): it redirects only when the host is `huangzesen.github.io`. A
GitHub custom domain (CNAME) would give a real 301, but it would also loop the Worker, which fetches from
huangzesen.github.io. Doing it properly needs zesen.me's DNS pointed at GitHub Pages and the Worker route
removed; the wrangler token cannot edit DNS.

## What the public pages may say

- Alfvénon collisions: Zesen OK'd sharing them online (2026-10-31: "its fine to share alfvenon collision online").
  Use only the native-f64 runs (`papers/collision-prl/PLAN.md` section 2). Never use the July float32 figures in
  `papers/collision-prl/figures/`: they do not conserve energy, and the plan voids their numbers.
- ALE astronomy: the ALE site is a private preview. Counts and method only; never the delivery client's name,
  internal model scores, task names or the names of bodies in sealed fields; do not link ale.xhelio.ai.
- ScienceIDE: numbers from the public project page (aitonomy.org/projects/scienceide); Zesen is co-first author with
  Hejia Geng and co-led environment generation.

## Preview and deploy

```
python3 -I _src/build.py
python3 -m http.server 18431 --bind 127.0.0.1   # port 8765 is the spedas-tplot workbench
git add -A && git commit && git push origin <branch>:master   # Pages builds from master; only with Zesen's go-ahead
```
