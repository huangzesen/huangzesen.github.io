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
| `_src/build.py` | writes every page's `index.html` (English and 文言) at its `path` (`python3 -I _src/build.py`): About `/`, Research overview `/research/` plus one page per topic (`research-alfvenons.html` → `/research/alfvenons/`, `research-lingtai`, `research-scienceide`, `research-ale-astronomy`, `research-solar-wind`), `/publications/`, `/cv/`, `/software/`, `/miscellany/` |
| `_src/pages-wen/*.html` → `/wen/…` | the 文言 site (Zesen, 2026-11-01: "make a 文言 version of zesen.me … no plain chinese version"): one twin per English page, same file name, `path` = `/wen` + English path, `<html lang="lzh">`, nav `NAV_WEN` in `build.py`, header switch EN \| 文 to the twin page. 文言 copies of partials with prose live in `_src/partials/wen/`. Rules, register and glossary: `_src/WEN-GUIDE.md`. **When an English page changes, change its 文言 twin too** (facts must match) |
| `_src/pages/cv.html` → `cv/` | the CV as a web page, from `~/work/projects/job-search/2026-academic/latex/shared/cv.tex` (Oct 30). Public edits: pending proposals left out, the high-school mentee not named, title Postdoctoral Researcher (Assistant Researcher from Jan 2027 is pending; SPINE.md section 3b), B.S. with Honors, School of Earth and Space Sciences (Zesen, 2026-10-31), ranked 1st of 17 (Zesen, 2026-11-01). `cv/Zesen_Huang_CV.pdf` is printed from the page: `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer --print-to-pdf=cv/Zesen_Huang_CV.pdf http://127.0.0.1:18431/cv/` (print styles at the end of `css/site.css`); re-print after editing the CV |
| `_src/make_ale_map.py` → `data/ale-map.json` | names and counts per category / area / direction for the interactive star map `js/ale-map.js` (ALE astronomy page); `images/research/ale-map-thumb.jpg` is a screenshot of it (static fallback and card image) |
| `_src/make_ale_chart.py` | `partials/ale-chart.svg` (bar chart by category; `--live` recounts) |
| `_src/make_pubs.py` | `partials/pubs-{first,co}.html` from Crossref works carrying ORCID 0000-0001-9570-5975 (review before building); `pubs-extra.html` (preprints) and `pubs-workshop.html` are hand-kept from the CV |
| `explorers/alfvenon-small-amplitude.html` | the interactive 3D Alfvénon (θ isosurfaces 0–45° and field lines, 128³ small-amplitude model), a self-contained PyVista/vtk.js export; copy of `alfvenon/simulations/reports/figure3_interactive_search_2026-06-24/FOUND_high_resolution_contours_deg_small_amp.html` (original on Elements-2 under `Helmholtz_algo/initial_conditions/html_export/high_res/`, notebook `visualize_contour_advanced_small_amp.ipynb`). Linked only from Miscellany now (not from the Alfvénons page). `switch_back.html` (59 MB, Plotly) is the switchback field-line explorer |
| `images/research/collision-small-2d-{bmag,theta}.mp4` | the two 2D collision movies from Zesen's Dartmouth slides (2026-10-05, OneDrive `Presentations/2026-10-05 Dartmouth/`, embedded videos 5 and 4): LAPS run `run_sim/test_colliding_small_amp_256` (+ `_extend`), 512×256×256, box 2×1×1, γ 1.05, no explicit dissipation; plotted by `Helmholtz_algo/analyze_nbs/collison.ipynb`. Shown on the Alfvénons page in a two-tab player |
| `js/alfvenon-lines.js` + `partials/alfvenon-lines.html` | the only 3D item on the Alfvénons page (Zesen, 2026-11-01: "remove all 3D sim, show only 2D ones … 3D is too big … only 3D interactive field lines … the one that is on my github page, large amplitude alfvenon"). Scene `large` (default, `data-scene`): the 1,360 field lines of `switch_back.html`, the large-amplitude Alfvénon / switchback model, 0.5 MB instead of 59 MB. Lines are coloured by local θ = arccos(Bx/|B|) from each line's tangent (scale to 90°, white-hot past 90°); all lines are thin additive glows and those bent past 60° are also tubes; flowing pulses. Scene `single` (the 128³ Alfvénon, `data/alfvenon/single*`) still works but is not shown. Controls: auto-rotate, pulses, reset, full screen. three.js 0.160.0 by import map (jsdelivr). Headless screenshots need `--use-angle=swiftshader --enable-unsafe-swiftshader`. The earlier volume viewer with the 3D collision (`js/alfvenon-viewer.js`, `data/alfvenon/collision*`) and the 3D collision movie block were removed; they are in commit b5132c7 |
| `_src/make_switchback_lines.py` → `data/alfvenon/large*` | reads the Plotly data in `switch_back.html`, resamples each line to 200 points, stores uint16 coordinates delta-encoded as int16, gzip |
| `_src/make_alfvenon_volumes.py single` → `data/alfvenon/single*` | the 128³ Alfvénon's field lines (Helmholtz checkpoint `128-small-amp-1/loop_200/H.npy`, Elements-2); `single-theta.bin.gz` is unused. Its `collision` mode rebuilds the removed collision data from the native-f64 frames |
| look (2026-11-01, after lingtai.ai, Zesen: "make some artistic effect like lingtai.ai") | night-sky hero with a slowly turning star chart (rings, spokes, twinkling stars) behind the field lines, gilt Cormorant Garamond titles with a sweep, ink-reveal entrance, layered waves into the page, calligraphic 黄泽森 (Ma Shan Zheng; both fonts from Google Fonts), a vermilion seal 黄泽森印 (`partials/seal.html`, SVG mask + ink-roughness filter). CSS block "night-sky hero" near the end of `css/site.css` |
| `partials/zishu.html` | the 自述 (classical self-account) from lingtai.ai (`/wen/about/`, source `~/work/GitHub/lingtai-web/src/i18n/translations.ts`), written top to bottom on paper, with an English rendering made for this site; on the About page |
| `js/site.js` | site layer on every page: the hero canvas (field lines carrying solitary kinks; pointer move or tap launches them; gold rings where two cross), scroll reveals (`.reveal`, forced visible in print), the publications search and filter chips (`.pub-filter`, groups `data-pubgroup`), the CV's sticky section index (`.cv-toc`) |
| `css/site.css` | all styles (UCLA darker blue header `#005587`, gold rule `#ffb81c`) |
| `images/research/` | Alfvénon θ contour, constant-|B| diagram and propagation figure (Huang+ 2026 ApJL 1006 L20, from `~/work/GitHub/Spherically-Polarized-Alfven-Waves-PRL/figures`); 3D collision movie `alfvenon-collision.mp4` (no longer on the Alfvénons page; still the About card video and the Research overview poster; re-encoded r3c render of the native-f64 large–small run, `alfvenon/data/in-use/large_small_collision_512/analysis/theta3d_large_small_orbit_v1/full101_highpoly_v3_60deg/production_v3c_prominent_contained/movie/`); PSP 5-min E22 figure (Huang+ 2026 ApJL 999 L4); ScienceIDE overview and pipeline (repo `aitofound/ScienceIDE`); LingTai network loop (repo `Lingtai-AI/lingtai`, MP4 starting at 12 s) |

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
