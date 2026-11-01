# 文言 version of zesen.me: translation guide

Zesen asked for a 文言 (classical Chinese) version of the whole site, and no modern-Chinese version.
English stays the main site; the 文言 pages live under /wen/.

## Files
- Source of each English page: `_src/pages/<name>.html`. Write its 文言 twin as `_src/pages-wen/<name>.html` (same name).
- First line is the meta comment, same keys as English: `<!--meta {"title": "...", "description": "...", "path": "/wen/...", "nav": "<same key as English>"} -->`.
  `path` is the English path with `/wen` in front (`/` becomes `/wen/`, `/research/alfvenons/` becomes `/wen/research/alfvenons/`).
  Keep `"scripts"` if the English page has it. `title` in 文言 ending with ` · 黄泽森`; `description` in 文言.
- Keep the HTML structure, classes, ids, images, videos, `<!--include ... -->` lines, data attributes and scripts exactly.
  Translate only the visible text (and `alt`, `aria-label`, `title` attributes).
- Internal links to pages that have a 文言 twin get `/wen` in front: `/`, `/research/`, `/research/alfvenons/`, `/research/lingtai/`,
  `/research/scienceide/`, `/research/ale-astronomy/`, `/research/solar-wind/`, `/publications/`, `/cv/`, `/software/`, `/miscellany/`
  (anchors kept, e.g. `/wen/research/#lingtai`). Links to files (images, PDFs, `/explorers/…`, `/switch_back.html`, `/data/…`,
  other old pages) and external links stay as they are.
- If a page includes a partial with English prose, write a 文言 copy in `_src/partials/wen/<name>` and include that instead
  (`<!--include partials/wen/<name> -->`). Lists of publications (`partials/pubs-*.html`), SVG charts and the seal stay as they are.
- Do not edit any other file. Do not run `_src/build.py` (the lead builds once all pages are in).

## Register
- 文言 in simplified characters, in the voice of the 自述 on lingtai.ai (see `_src/partials/zishu.html`) and of the 文言 pages of
  lingtai.ai (`~/work/GitHub/lingtai-web/src/i18n/translations.ts`, the block after the line `nav: { logo: '灵台AI', home: '首页', blog: '文录'`).
  Concise, plain-spoken classical prose; modern technical terms are kept where there is no classical word.
- The facts must not change: every number, date, name, venue, grid size and claim stays as in English, nothing added. No praise, no
  embellishment that adds meaning, no invented history or quotations. When a sentence is technical, prefer clarity over ornament.
- Arabic numerals for data, sizes, dates and figures (512×256×256, 2026, 1,779, ≈10%, 10⁻⁸); years may be written 2026年.
- Proper names of papers, journals, codes, repos and datasets stay in their original language (italic titles stay English).
  Units and symbols (θ, |B|, B₀, V_A, mHz, R☉) stay. First mention of a coined term may carry the English in parentheses.
- Headings short. Captions translated in full.

## Glossary (use these exactly)
| English | 文言 |
|---|---|
| Zesen Huang | 黄泽森 |
| UCLA | 洛城加州大学（UCLA） first, then 洛城加大 |
| Department of Earth, Planetary, and Space Sciences | 地球行星与空间科学系 |
| Postdoctoral Researcher | 博士后研究员 |
| USTC; School of Earth and Space Sciences | 中国科学技术大学；地球和空间科学学院 |
| IAU PhD Prize (Division E, Sun and Heliosphere) | 列邦司天会（IAU）博士旌表（第五部：日与日球） |
| Parker Solar Probe / Solar Orbiter / Ulysses / Wind | 帕克太阳探测器 / 太阳轨道飞行器 / 尤利西斯号 / 风号 |
| solar wind | 太阳风 |
| corona | 日冕 |
| Alfvén surface | 阿尔芬面 |
| switchback | 折返 (磁场折返) |
| Alfvén wave | 阿尔芬波 |
| Alfvénon | 阿尔芬子（Alfvénon） first, then 阿尔芬子 |
| solitary wave / soliton | 孤波 / 孤子 |
| collision (of Alfvénons) | 相撞 |
| MHD | 磁流体（MHD） |
| turbulence | 湍流 |
| field line | 磁力线 |
| simulation | 模拟 |
| GPU | GPU |
| AI | 智械 |
| agent (AI agent) | 器灵 |
| LLM | 大模型 |
| LingTai | 灵台 |
| ScienceIDE | ScienceIDE |
| Agent Last Exam (ALE) | 器灵终试（Agent Last Exam） |
| benchmark / environment / task / verifier | 测评 / 环境 / 题 / 验证器 |
| reinforcement learning | 强化学习 |
| open source | 开源 |
| Mars / the Sun | 荧惑 / 日 |
| Publications / CV / Software / Miscellany / Research / About | 著述 / 履历 / 器用 / 杂录 / 所究 / 自述 |
