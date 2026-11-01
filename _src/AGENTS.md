# zesen.me source

This repository (`huangzesen/huangzesen.github.io`, public, GitHub Pages) is Zesen's personal site.
`https://zesen.me` is the Cloudflare Worker `zesen-me-private-travel` (route `zesen.me/*`), which proxies every
path to `https://huangzesen.github.io`. Pushing to `master` is what publishes the site: **it is public, so ask Zesen
before pushing.**

`_src/` is not published (Jekyll skips folders that start with `_`).

## Layout (redesign of 2026-10-31, modelled on https://jiaxuanli.me/research/)

| Path | What |
|---|---|
| `_src/layout.html` | shared header bar (name + uppercase nav with a Research sub-menu), footer, figure lightbox |
| `_src/pages/*.html` | page bodies; first line `<!--meta {"title", "description", "path", "nav"} -->`; `<!--include partials/x -->` pastes a generated file |
| `_src/build.py` | writes `index.html`, `research/`, `publications/`, `software/`, `miscellany/` from the above (`python3 -I _src/build.py`) |
| `_src/make_ale_chart.py` | `partials/ale-chart.svg` + `ale-thumb.svg` (ALE astronomy counts; `--live` recounts from `~/work/projects/ale-astronomy`) |
| `_src/make_pubs.py` | `partials/pubs-{first,co,pre}.html` from Crossref works carrying ORCID 0000-0001-9570-5975 (review before building) |
| `css/site.css` | all styles (UCLA darker blue header `#005587`, gold rule `#ffb81c`) |
| `images/research/` | figures: Alfvénon θ contour and constant-|B| diagram (Huang+ 2026 ApJL 1006 L20, from `~/work/GitHub/Spherically-Polarized-Alfven-Waves-PRL/figures`), PSP 5-min E22 figure (Huang+ 2026 ApJL 999 L4, from `solar-wind/analyses/energy_budget_5_min_pub_plots`), ScienceIDE overview (repo `aitofound/ScienceIDE`), LingTai network loop (repo `Lingtai-AI/lingtai` `docs/assets/network-demo.gif`, re-encoded as MP4 starting at 12 s, poster = first frame) |

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
