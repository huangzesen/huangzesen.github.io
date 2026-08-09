(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const root = document.getElementById('timeline');
  if (!root) return;

  const C = {
    cyan: '#38bdf8', green: '#4ade80', amber: '#fbbf24', red: '#f87171',
    violet: '#c4b5fd', muted: '#94a3b8', bg: '#0f172a', panel: '#1e293b'
  };
  const GROUP_COLORS = {
    'dg-20260809-021029-bb27eb': C.cyan,
    'dg-20260809-021146-f9ccbb': C.violet,
    'dg-20260809-021152-4cb99e': C.green
  };
  const KIND_COLORS = {
    instruction: C.cyan, dispatch: C.violet, success: C.green, synthesis: C.cyan,
    close: C.amber, comment: C.violet, publish: C.green, failure: C.red
  };
  const I18N = {
    en: {
      kicker: 'Live systems chronicle · UTC', title: '103 Agents · One Shared Clock',
      subtitle: 'From instruction to parallel execution, recovery, audit, closure, and publication.',
      timeline: 'Run timeline', hint: 'Wheel to zoom · drag to pan · select any mark',
      play: 'Play', pause: 'Pause', restart: 'Restart', resetView: 'Reset view',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', focusExecution: 'Focus execution', speed: 'Speed',
      issues: 'issues', daemons: 'original daemons', proposals: 'proposals complete',
      prs: 'PRs opened', failures: 'failures recovered', closes: 'verified closes',
      events: 'Event stream', agents: '103 daemon lifecycles', prLane: '50 PR opening sequence',
      closeLane: 'Closure actions', auditLane: 'Fable audit batches 1–9',
      legendDone: 'daemon done', legendFail: 'daemon failed', legendPR: 'PR opened',
      legendClose: 'issue closed', legendAudit: 'audit batch', legendMolt: 'molt',
      narrative: 'What the clock reveals', inspector: 'Selected evidence',
      inspectEmpty: 'Select any bar, dot, PR tick, close mark, audit batch, milestone, or molt.',
      inspectEmptyTitle: 'Every mark has provenance',
      story1Title: 'Three dispatch waves', story1Body: '37 + 33 + 33 daemons entered the run within 86 seconds.',
      story2Title: 'Four failures, no lost lane', story2Body: 'Two bounded re-dispatches and two salvaged artifacts preserved all 103 outcomes.',
      story3Title: 'A 37-minute PR burst', story3Body: 'All 50 PR-open events are ordered from exact daemon tool results.',
      story4Title: 'Triage became action', story4Body: '14 primary, 6 fixed-confirmed, and 3 repro-evidence issues were closed and verified.',
      sourceNote: 'Exact local evidence, normalized without external requests or invented timestamps.',
      missingNote: 'Missing-data policy: fallback times remain explicitly labeled in timeline-data.json.',
      repo: 'Repository', issue: 'Issue', disposition: 'Disposition', state: 'State',
      started: 'Started', finished: 'Finished', elapsed: 'Elapsed', opened: 'Opened',
      closed: 'Closed', batch: 'Batch', status: 'Status', scope: 'Scope', evidence: 'Evidence',
      milestone: 'Milestone', recovery: 'Recovery', molt: 'Molt', openPR: 'Open pull request',
      utc: 'UTC', complete: 'complete', queued: 'queued', paused: 'paused',
      dataError: 'Timeline data could not be loaded.', dataErrorHelp: 'Keep timeline-data.json beside this file or set window.TIMELINE_DATA before timeline.js runs.',
      playhead: 'Playback time'
    },
    zh: {
      kicker: '实时系统纪事 · UTC', title: '103 个 Agent · 一条共享时间轴',
      subtitle: '从指令到并行执行、恢复、审计、关闭与发布。',
      timeline: '运行时间线', hint: '滚轮缩放 · 拖拽平移 · 点击任意标记',
      play: '播放', pause: '暂停', restart: '重播', resetView: '重置视图',
      zoomIn: '放大', zoomOut: '缩小', focusExecution: '聚焦执行', speed: '速度',
      issues: '个 issue', daemons: '个原始 daemon', proposals: '份提案完成',
      prs: '个 PR 已打开', failures: '个失败已恢复', closes: '个关闭已复验',
      events: '事件流', agents: '103 个 daemon 生命周期', prLane: '50 个 PR 打开顺序',
      closeLane: '关闭执行', auditLane: 'Fable 审计批次 1–9',
      legendDone: 'daemon 完成', legendFail: 'daemon 失败', legendPR: 'PR 打开',
      legendClose: 'issue 关闭', legendAudit: '审计批次', legendMolt: '凝蜕',
      narrative: '共享时间轴揭示了什么', inspector: '所选证据',
      inspectEmpty: '请选择任意条形、圆点、PR 刻度、关闭标记、审计批次、里程碑或凝蜕。',
      inspectEmptyTitle: '每一个标记都有来源',
      story1Title: '三波并行派发', story1Body: '37 + 33 + 33 个 daemon 在 86 秒内进入运行。',
      story2Title: '四次失败，没有丢失车道', story2Body: '两次有界重派与两份成果保留，守住了全部 103 个结果。',
      story3Title: '37 分钟 PR 爆发', story3Body: '50 个 PR 打开事件全部来自精确的 daemon tool-result，并按时间排序。',
      story4Title: 'Triage 转化为行动', story4Body: '14 个主关闭、6 个已修复确认、3 个复现证据 issue 已关闭并复验。',
      sourceNote: '精确本地证据；未发起外部请求，也未虚构时间戳。',
      missingNote: '缺失数据策略：任何回退时间都会在 timeline-data.json 中明确标注。',
      repo: '仓库', issue: 'Issue', disposition: '处置', state: '状态',
      started: '开始', finished: '结束', elapsed: '耗时', opened: '打开',
      closed: '关闭', batch: '批次', status: '状态', scope: '范围', evidence: '证据',
      milestone: '里程碑', recovery: '恢复', molt: '凝蜕', openPR: '打开 Pull Request',
      utc: 'UTC', complete: '已完成', queued: '已排队', paused: '已暂挂',
      dataError: '时间线数据无法加载。', dataErrorHelp: '请将 timeline-data.json 与本文件放在同一目录，或在 timeline.js 运行前设置 window.TIMELINE_DATA。',
      playhead: '回放时间'
    }
  };

  let data;
  let ui = {};
  let resizeObserver;
  let animationFrame = 0;
  let lastFrame = 0;
  let lastPlaybackPaint = 0;
  const state = {
    lang: 'en', fullStart: 0, fullEnd: 0, viewStart: 0, viewEnd: 0,
    playhead: 0, playing: false, speed: 1, selected: null,
    drag: null, width: 1200, height: 660, playbackNodes: []
  };

  const t = key => I18N[state.lang][key] || I18N.en[key] || key;
  const local = (obj, stem) => obj[`${stem}${state.lang === 'zh' ? 'Zh' : 'En'}`] || obj[`${stem}En`] || '';
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const asTime = value => typeof value === 'number' ? value : Date.parse(value);
  const timeText = value => {
    const d = new Date(asTime(value));
    return Number.isNaN(+d) ? '—' : `${d.toISOString().slice(11, 19)}Z`;
  };
  const durationText = seconds => {
    const n = Math.max(0, Number(seconds) || 0);
    if (n < 60) return `${n.toFixed(n < 10 ? 1 : 0)}s`;
    const m = Math.floor(n / 60), s = Math.round(n % 60);
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };
  const svg = (name, attrs = {}, text = '') => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  };
  const hash = value => {
    let h = 2166136261;
    for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  };
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  async function loadData() {
    if (window.TIMELINE_DATA) return window.TIMELINE_DATA;
    const embedded = document.getElementById('timeline-data');
    if (embedded && embedded.textContent.trim()) return JSON.parse(embedded.textContent);
    const source = root.dataset.source || 'timeline-data.json';
    const response = await fetch(source, { cache: 'no-store' });
    if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
    return response.json();
  }

  function shell() {
    root.innerHTML = `
      <main class="tl-shell">
        <header class="tl-hero">
          <div>
            <div class="tl-kicker" data-i18n="kicker"></div>
            <h1 class="tl-title"><span class="tl-gradient" data-i18n="title"></span></h1>
            <p class="tl-subtitle" data-i18n="subtitle"></p>
          </div>
          <div class="tl-lang" aria-label="Language / 语言">
            <button type="button" data-lang="en" aria-pressed="true">EN</button>
            <button type="button" data-lang="zh" aria-pressed="false">中文</button>
          </div>
        </header>

        <section class="tl-stat-grid" aria-label="Run summary">
          ${statCard('issues', C.cyan)}
          ${statCard('daemons', C.violet)}
          ${statCard('proposals', C.green)}
          ${statCard('prs', C.green)}
          ${statCard('failures', C.red)}
          ${statCard('closes', C.amber)}
        </section>

        <section class="tl-panel" aria-labelledby="tl-main-title">
          <div class="tl-panel-head">
            <div class="tl-heading-group">
              <h2 id="tl-main-title" data-i18n="timeline"></h2>
              <span data-i18n="hint"></span>
            </div>
            <div class="tl-controls">
              <button class="tl-control-btn tl-primary" type="button" data-action="play"></button>
              <button class="tl-control-btn" type="button" data-action="restart" data-i18n="restart"></button>
              <select class="tl-speed" aria-label="Playback speed">
                <option value="1">Speed 1×</option><option value="4">Speed 4×</option><option value="12" selected>Speed 12×</option><option value="32">Speed 32×</option>
              </select>
              <button class="tl-icon-btn" type="button" data-action="zoom-out" aria-label="Zoom out">−</button>
              <button class="tl-icon-btn" type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
              <button class="tl-control-btn" type="button" data-action="focus-execution" data-i18n="focusExecution"></button>
              <button class="tl-control-btn" type="button" data-action="reset-view" data-i18n="resetView"></button>
              <span class="tl-clock" aria-live="polite"></span>
            </div>
          </div>
          <div class="tl-stage-wrap">
            <svg class="tl-stage" tabindex="0" role="application"></svg>
          </div>
          <div class="tl-legend"></div>
        </section>

        <div class="tl-lower">
          <section class="tl-panel tl-story">
            <h2 class="tl-section-label" data-i18n="narrative"></h2>
            <div class="tl-story-grid"></div>
          </section>
          <aside class="tl-panel tl-inspector" aria-live="polite">
            <h2 class="tl-section-label" data-i18n="inspector"></h2>
            <div class="tl-inspector-body"></div>
          </aside>
        </div>

        <footer class="tl-data-note">
          <span data-i18n="sourceNote"></span>
          <span data-i18n="missingNote"></span>
        </footer>
      </main>
      <div class="tl-tooltip" role="tooltip"></div>`;

    ui = {
      svg: root.querySelector('.tl-stage'), tooltip: root.querySelector('.tl-tooltip'),
      legend: root.querySelector('.tl-legend'), stories: root.querySelector('.tl-story-grid'),
      inspector: root.querySelector('.tl-inspector-body'), clock: root.querySelector('.tl-clock'),
      play: root.querySelector('[data-action="play"]'), speed: root.querySelector('.tl-speed')
    };
  }

  function statCard(key, color) {
    return `<article class="tl-stat" style="--stat-color:${color}"><strong class="tl-stat-value" data-stat="${key}">—</strong><span class="tl-stat-label" data-i18n="${key}"></span></article>`;
  }

  function populateStats() {
    const values = {
      issues: data.summary.issues, daemons: data.summary.originalDaemons,
      proposals: data.summary.issues, prs: data.summary.pr,
      failures: `${data.summary.failed}/${data.summary.recoveries}`,
      closes: data.summary.executedCloses
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = root.querySelector(`[data-stat="${key}"]`);
      if (node) node.textContent = value;
    });
  }

  function syncLanguage() {
    document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
    document.title = t('title');
    root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    root.querySelectorAll('[data-lang]').forEach(node => node.setAttribute('aria-pressed', node.dataset.lang === state.lang ? 'true' : 'false'));
    ui.play.textContent = state.playing ? t('pause') : t('play');
    [...ui.speed.options].forEach(option => { option.textContent = `${t('speed')} ${option.value}×`; });
    ui.svg.setAttribute('aria-label', `${t('timeline')}. ${t('hint')}`);
    renderLegend();
    renderStories();
    renderInspector();
    render();
  }

  function renderLegend() {
    const items = [
      [C.green, 'legendDone', 'dot'], [C.red, 'legendFail', 'dot'],
      [C.green, 'legendPR', 'bar'], [C.amber, 'legendClose', 'diamond'],
      [C.violet, 'legendAudit', 'bar'], [C.amber, 'legendMolt', 'ring']
    ];
    ui.legend.innerHTML = items.map(([color, label, shape]) =>
      `<span class="tl-legend-item"><i class="tl-swatch tl-${shape}" style="--swatch:${color}"></i>${escapeHTML(t(label))}</span>`
    ).join('');
  }

  function renderStories() {
    const cards = [
      [C.cyan, '01', 'story1Title', 'story1Body'], [C.red, '02', 'story2Title', 'story2Body'],
      [C.green, '03', 'story3Title', 'story3Body'], [C.amber, '04', 'story4Title', 'story4Body']
    ];
    ui.stories.innerHTML = cards.map(([color, idx, title, body]) =>
      `<article class="tl-story-card" style="--accent:${color}"><span class="tl-story-index">${idx}</span><h3>${escapeHTML(t(title))}</h3><p>${escapeHTML(t(body))}</p></article>`
    ).join('');
  }

  function configureState() {
    state.fullStart = asTime(data.meta.windowStart);
    state.fullEnd = asTime(data.meta.windowEnd);
    state.viewStart = state.fullStart;
    state.viewEnd = state.fullEnd;
    state.playhead = state.fullStart;
    state.speed = Number(ui.speed.value) || 12;
    state.selected = { kind: 'milestone', id: 'instruction' };
  }

  function xFor(value) {
    const left = 110, right = 24;
    const ratio = (asTime(value) - state.viewStart) / (state.viewEnd - state.viewStart);
    return left + ratio * (state.width - left - right);
  }

  function inView(value, pad = 0) {
    const v = asTime(value);
    return v >= state.viewStart - pad && v <= state.viewEnd + pad;
  }

  function render() {
    if (!ui.svg || !data) return;
    const rect = ui.svg.getBoundingClientRect();
    state.width = Math.max(680, Math.round(rect.width || 1200));
    state.height = 660;
    ui.svg.setAttribute('viewBox', `0 0 ${state.width} ${state.height}`);
    ui.svg.replaceChildren();
    state.playbackNodes = [];

    drawGrid();
    drawMolts();
    drawMilestones();
    drawDaemons();
    drawPRs();
    drawCloses();
    drawAudits();
    drawPlayhead();
    updatePlaybackVisuals(true);
  }

  function drawGrid() {
    const g = svg('g', { 'aria-hidden': 'true' });
    const left = 110, right = 24, top = 18, bottom = 626;
    const span = state.viewEnd - state.viewStart;
    const steps = [5, 10, 15, 30, 60, 120].map(m => m * 60000);
    const step = steps.find(s => span / s <= 12) || steps[steps.length - 1];
    const first = Math.ceil(state.viewStart / step) * step;
    for (let ts = first, i = 0; ts <= state.viewEnd; ts += step, i++) {
      const x = xFor(ts);
      g.append(svg('line', { x1: x, y1: top, x2: x, y2: bottom, class: `tl-grid-line ${i % 2 === 0 ? 'tl-major' : ''}` }));
      g.append(svg('text', { x, y: 642, class: 'tl-axis-label', 'text-anchor': 'middle' }, timeText(ts).slice(0, 5)));
    }
    g.append(svg('line', { x1: left, y1: 204, x2: state.width - right, y2: 204, class: 'tl-axis' }));
    const labels = [
      [22, t('events'), ''], [292, t('agents'), '37 + 33 + 33'],
      [512, t('prLane'), '50'], [548, t('closeLane'), '14 + 6 + 3'],
      [596, t('auditLane'), '9']
    ];
    labels.forEach(([y, label, sub]) => {
      g.append(svg('text', { x: 14, y, class: 'tl-lane-label' }, label));
      if (sub) g.append(svg('text', { x: 14, y: y + 13, class: 'tl-lane-sub' }, sub));
    });
    ui.svg.append(g);
  }

  function drawMilestones() {
    const visible = data.milestones.filter(m => inView(m.timestamp, (state.viewEnd - state.viewStart) * .03));
    const laneLast = [-Infinity, -Infinity, -Infinity, -Infinity];
    visible.sort((a, b) => asTime(a.timestamp) - asTime(b.timestamp)).forEach(item => {
      const x = xFor(item.timestamp);
      let lane = laneLast.findIndex(last => x - last >= 132);
      if (lane < 0) lane = laneLast.indexOf(Math.min(...laneLast));
      laneLast[lane] = x;
      const color = KIND_COLORS[item.kind] || C.cyan;
      const y = 31 + lane * 40;
      const cardW = 124, cardH = 31;
      const cardX = clamp(x - cardW / 2, 112, state.width - cardW - 12);
      const g = svg('g');
      g.append(svg('line', { x1: x, y1: y + cardH, x2: x, y2: 198, class: 'tl-milestone-line', stroke: color }));
      g.append(svg('circle', { cx: x, cy: 198, r: 4.5, class: 'tl-milestone-dot', fill: color }));
      g.append(svg('rect', { x: cardX, y, width: cardW, height: cardH, rx: 7, class: 'tl-milestone-card', stroke: color }));
      g.append(svg('text', { x: cardX + 7, y: y + 12, class: 'tl-milestone-title' }, trim(local(item, 'label'), 20)));
      g.append(svg('text', { x: cardX + 7, y: y + 24, class: 'tl-milestone-time' }, timeText(item.timestamp)));
      bindInteractive(g, 'milestone', item, item.timestamp, `${t('milestone')}: ${local(item, 'label')}`);
      ui.svg.append(g);
    });
  }

  function drawDaemons() {
    const groupBase = {
      'dg-20260809-021029-bb27eb': 278,
      'dg-20260809-021146-f9ccbb': 365,
      'dg-20260809-021152-4cb99e': 452
    };
    data.dispatches.forEach(group => {
      const base = groupBase[group.groupId];
      const color = GROUP_COLORS[group.groupId];
      ui.svg.append(svg('line', { x1: 110, y1: base, x2: state.width - 24, y2: base, stroke: color, 'stroke-opacity': .12 }));
      ui.svg.append(svg('text', { x: 14, y: base + 4, class: 'tl-lane-sub', fill: color }, `${local(group, 'label')} · ${group.count}`));
    });

    const ranks = {};
    const barsLayer = svg('g', { 'data-layer': 'daemon-durations' });
    const dotsLayer = svg('g', { 'data-layer': 'daemon-completions' });
    data.dispatches.forEach(group => { ranks[group.groupId] = 0; });
    data.daemons.forEach(item => {
      const base = groupBase[item.groupId];
      const color = item.state === 'failed' ? C.red : GROUP_COLORS[item.groupId];
      const rank = ranks[item.groupId]++;
      const barY = base - 28 + rank * 1.42;
      const dotY = base + ((hash(item.id) % 13) - 6) * 2.1;
      const x1 = xFor(item.startedAt), x2 = xFor(item.finishedAt);
      if (x2 >= 108 && x1 <= state.width - 22) {
        const bar = svg('rect', {
          x: Math.max(110, x1), y: barY, width: Math.max(1.6, Math.min(state.width - 24, x2) - Math.max(110, x1)),
          height: 1.4, rx: .7, class: selectedClass('tl-duration', 'daemon', item.id), fill: color
        });
        bindInteractive(bar, 'daemon', item, item.finishedAt, `${item.repo}#${item.issue}: ${item.title}`);
        barsLayer.append(bar);
      }
      if (inView(item.finishedAt, (state.viewEnd - state.viewStart) * .02)) {
        const dot = svg('circle', {
          cx: x2, cy: dotY, r: item.state === 'failed' ? 5.2 : 3.2,
          class: `${selectedClass('tl-dot', 'daemon', item.id)} ${item.state === 'failed' ? 'tl-failed' : ''}`,
          fill: color, color
        });
        bindInteractive(dot, 'daemon', item, item.finishedAt, `${item.repo}#${item.issue}: ${item.title}`);
        state.playbackNodes.push({ node: dot, time: asTime(item.finishedAt) });
        dotsLayer.append(dot);
      }
    });
    ui.svg.append(barsLayer, dotsLayer);
  }

  function drawPRs() {
    data.prs.forEach(item => {
      if (!item.openedAt || !inView(item.openedAt, (state.viewEnd - state.viewStart) * .01)) return;
      const x = xFor(item.openedAt);
      const mark = svg('line', {
        x1: x, y1: 499, x2: x, y2: 526,
        class: selectedClass('tl-pr-mark', 'pr', item.prUrl)
      });
      bindInteractive(mark, 'pr', item, item.openedAt, `PR #${item.prNumber}: ${item.title}`);
      state.playbackNodes.push({ node: mark, time: asTime(item.openedAt) });
      ui.svg.append(mark);
    });
  }

  function drawCloses() {
    data.closes.forEach((item, index) => {
      if (!inView(item.closedAt, (state.viewEnd - state.viewStart) * .01)) return;
      const x = xFor(item.closedAt);
      const stack = index % 5;
      const y = 538 + stack * 5;
      const points = `${x},${y - 4} ${x + 4},${y} ${x},${y + 4} ${x - 4},${y}`;
      const mark = svg('polygon', { points, class: selectedClass('tl-close-mark', 'close', `${item.repo}-${item.issue}`) });
      bindInteractive(mark, 'close', item, item.closedAt, `${item.repo}#${item.issue}: ${item.title || ''}`);
      state.playbackNodes.push({ node: mark, time: asTime(item.closedAt) });
      ui.svg.append(mark);
    });
  }

  function drawAudits() {
    data.audits.forEach(item => {
      const start = asTime(item.requestedAt);
      const end = item.completedAt ? asTime(item.completedAt) : start + 70000;
      if (end < state.viewStart || start > state.viewEnd) return;
      const x1 = xFor(start), x2 = xFor(end);
      const y = 566 + (item.batch - 1) * 6.5;
      const cls = item.status === 'complete' ? 'is-complete' : item.status === 'paused' ? 'is-paused' : '';
      const bar = svg('rect', {
        x: Math.max(110, x1), y, width: Math.max(6, Math.min(state.width - 24, x2) - Math.max(110, x1)),
        height: 4.2, rx: 2.1, class: `${selectedClass('tl-audit-bar', 'audit', item.batch)} ${cls}`
      });
      bindInteractive(bar, 'audit', item, item.completedAt || item.requestedAt, `${t('batch')} ${item.batch}: ${t(item.status)}`);
      ui.svg.append(bar);
      if ((state.viewEnd - state.viewStart) <= 90 * 60000 && x1 >= 110 && x1 <= state.width - 24) ui.svg.append(svg('text', { x: x1 + 2, y: y - 1.5, class: 'tl-axis-label', fill: C.violet }, `B${item.batch}`));
    });
  }

  function drawMolts() {
    data.molts.forEach(item => {
      if (!inView(item.timestamp, (state.viewEnd - state.viewStart) * .01)) return;
      const x = xFor(item.timestamp);
      const line = svg('line', { x1: x, y1: 18, x2: x, y2: 626, class: 'tl-molt-line' });
      const glyph = svg('rect', { x: x - 4, y: 212, width: 8, height: 8, rx: 1.5, transform: `rotate(45 ${x} 216)`, class: 'tl-molt-glyph' });
      bindInteractive(glyph, 'molt', item, item.timestamp, local(item, 'label'));
      ui.svg.append(line, glyph);
    });
  }

  function drawPlayhead() {
    const x = xFor(state.playhead);
    ui.playheadLine = svg('line', { x1: x, y1: 17, x2: x, y2: 626, class: 'tl-playhead' });
    ui.playheadCap = svg('path', { d: `M ${x - 5} 17 L ${x + 5} 17 L ${x} 25 Z`, class: 'tl-playhead-cap' });
    ui.svg.append(ui.playheadLine, ui.playheadCap);
  }

  function selectedClass(base, kind, id) {
    return `${base}${state.selected && state.selected.kind === kind && String(state.selected.id) === String(id) ? ' is-selected' : ''}`;
  }

  function bindInteractive(node, kind, item, time, aria) {
    node.setAttribute('tabindex', '0');
    node.setAttribute('role', 'button');
    node.setAttribute('aria-label', aria);
    node.addEventListener('mouseenter', event => showTooltip(event, kind, item));
    node.addEventListener('mousemove', moveTooltip);
    node.addEventListener('mouseleave', hideTooltip);
    node.addEventListener('focus', event => showTooltip(event, kind, item));
    node.addEventListener('blur', hideTooltip);
    node.addEventListener('click', event => {
      event.stopPropagation();
      state.selected = { kind, id: recordId(kind, item) };
      renderInspector(kind, item);
      render();
    });
    node.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    if (time) node.dataset.time = String(asTime(time));
  }

  function recordId(kind, item) {
    if (kind === 'daemon') return item.id;
    if (kind === 'pr') return item.prUrl;
    if (kind === 'close') return `${item.repo}-${item.issue}`;
    if (kind === 'audit') return item.batch;
    if (kind === 'milestone') return item.id;
    if (kind === 'molt') return `${item.actor}-${item.count}`;
    return item.id || item.issue;
  }

  function trim(value, max) {
    const s = String(value || '');
    return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
  }

  function showTooltip(event, kind, item) {
    ui.tooltip.innerHTML = tooltipHTML(kind, item);
    ui.tooltip.classList.add('is-visible');
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!ui.tooltip.classList.contains('is-visible')) return;
    const x0 = event.clientX || (event.target.getBoundingClientRect().left + 10);
    const y0 = event.clientY || event.target.getBoundingClientRect().top;
    const box = ui.tooltip.getBoundingClientRect();
    let x = x0 + 14, y = y0 + 14;
    if (x + box.width > window.innerWidth - 8) x = x0 - box.width - 14;
    if (y + box.height > window.innerHeight - 8) y = y0 - box.height - 14;
    ui.tooltip.style.left = `${Math.max(8, x)}px`;
    ui.tooltip.style.top = `${Math.max(8, y)}px`;
  }

  function hideTooltip() { ui.tooltip.classList.remove('is-visible'); }

  function tooltipHTML(kind, item) {
    const rows = [];
    let kicker = t(kind === 'pr' ? 'opened' : kind), title = item.title || local(item, 'label') || '';
    if (kind === 'daemon') {
      kicker = `${escapeHTML(item.repo)}#${item.issue} · ${escapeHTML(item.disposition)}`;
      rows.push([t('state'), item.state], [t('finished'), timeText(item.finishedAt)], [t('elapsed'), durationText(item.elapsedSeconds)]);
      if (item.prUrl) rows.push(['PR', item.prUrl.split('/').pop()]);
    } else if (kind === 'pr') {
      kicker = `PR #${item.prNumber} · ${escapeHTML(item.prRepo)}`;
      rows.push([t('issue'), `${item.repo}#${item.issue}`], [t('opened'), timeText(item.openedAt)], [t('evidence'), item.timeEvidence]);
    } else if (kind === 'close') {
      kicker = `${escapeHTML(item.repo)}#${item.issue} · ${escapeHTML(item.category)}`;
      rows.push([t('closed'), timeText(item.closedAt)]);
    } else if (kind === 'audit') {
      title = `${t('batch')} ${item.batch} · ${t(item.status)}`;
      kicker = t('auditLane');
      rows.push([t('started'), timeText(item.requestedAt)], [t('scope'), item.scope.join(' · ')]);
      if (item.completedAt) rows.push([t('finished'), timeText(item.completedAt)]);
    } else if (kind === 'milestone') {
      title = local(item, 'label');
      kicker = `${t('milestone')} · ${timeText(item.timestamp)}`;
      rows.push([t('evidence'), local(item, 'detail')]);
    } else if (kind === 'molt') {
      title = local(item, 'label');
      kicker = t('molt');
      rows.push([t('finished'), timeText(item.timestamp)]);
    }
    return `<div class="tl-tooltip-kicker">${escapeHTML(kicker)}</div><h4>${escapeHTML(title)}</h4><dl>${rows.map(([k,v]) => `<dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd>`).join('')}</dl>`;
  }

  function renderInspector(kind, item) {
    if (!kind && state.selected) {
      ({ kind, item } = resolveSelected());
    }
    if (!kind || !item) {
      ui.inspector.innerHTML = `<div class="tl-inspector-empty"><div><strong>${escapeHTML(t('inspectEmptyTitle'))}</strong>${escapeHTML(t('inspectEmpty'))}</div></div>`;
      return;
    }
    let title = item.title || local(item, 'label') || '';
    const chips = [], paragraphs = [];
    let link = '';
    if (kind === 'daemon') {
      chips.push(`${item.repo}#${item.issue}`, item.disposition, item.state, durationText(item.elapsedSeconds));
      paragraphs.push(`${t('started')}: ${timeText(item.startedAt)} · ${t('finished')}: ${timeText(item.finishedAt)}`);
      if (item.state === 'failed') paragraphs.push(item.errorMessage || item.errorType || 'failed');
      if (item.prUrl) link = `<a class="tl-link" href="${escapeHTML(item.prUrl)}" target="_blank" rel="noopener">${escapeHTML(t('openPR'))} ↗</a>`;
    } else if (kind === 'pr') {
      chips.push(`PR #${item.prNumber}`, `${item.repo}#${item.issue}`, `#${item.sequence}/50`);
      paragraphs.push(`${t('opened')}: ${timeText(item.openedAt)}`, `${t('evidence')}: ${item.timeEvidence}`);
      link = `<a class="tl-link" href="${escapeHTML(item.prUrl)}" target="_blank" rel="noopener">${escapeHTML(t('openPR'))} ↗</a>`;
    } else if (kind === 'close') {
      chips.push(`${item.repo}#${item.issue}`, item.category);
      paragraphs.push(`${t('closed')}: ${timeText(item.closedAt)}`);
    } else if (kind === 'audit') {
      title = `${t('batch')} ${item.batch} · ${t(item.status)}`;
      chips.push(item.status, ...item.scope);
      paragraphs.push(`${t('started')}: ${timeText(item.requestedAt)}`);
      if (item.completedAt) paragraphs.push(`${t('finished')}: ${timeText(item.completedAt)}`);
      if (local(item, 'outcome')) paragraphs.push(local(item, 'outcome'));
    } else if (kind === 'milestone') {
      title = local(item, 'label');
      chips.push(item.kind, timeText(item.timestamp));
      paragraphs.push(local(item, 'detail'));
    } else if (kind === 'molt') {
      title = local(item, 'label');
      chips.push(item.actor, `#${item.count}`, timeText(item.timestamp));
      paragraphs.push(state.lang === 'zh' ? '上下文边界以精确运行日志中的凝蜕事件标记。' : 'Context boundary marked from the exact runtime molt event.');
    }
    ui.inspector.innerHTML = `<div class="tl-inspector-content"><div class="tl-inspector-meta">${chips.map(ch => `<span class="tl-chip">${escapeHTML(ch)}</span>`).join('')}</div><h3>${escapeHTML(title)}</h3>${paragraphs.filter(Boolean).map(p => `<p>${escapeHTML(p)}</p>`).join('')}${link}</div>`;
  }

  function resolveSelected() {
    if (!state.selected) return {};
    const { kind, id } = state.selected;
    let item;
    if (kind === 'daemon') item = data.daemons.find(x => x.id === id);
    else if (kind === 'pr') item = data.prs.find(x => x.prUrl === id);
    else if (kind === 'close') item = data.closes.find(x => `${x.repo}-${x.issue}` === id);
    else if (kind === 'audit') item = data.audits.find(x => String(x.batch) === String(id));
    else if (kind === 'milestone') item = data.milestones.find(x => x.id === id);
    else if (kind === 'molt') item = data.molts.find(x => `${x.actor}-${x.count}` === id);
    return { kind, item };
  }

  function setView(start, end) {
    const fullSpan = state.fullEnd - state.fullStart;
    const minSpan = Math.min(fullSpan, 8 * 60000);
    let span = clamp(end - start, minSpan, fullSpan);
    let s = start, e = s + span;
    if (s < state.fullStart) { s = state.fullStart; e = s + span; }
    if (e > state.fullEnd) { e = state.fullEnd; s = e - span; }
    state.viewStart = s; state.viewEnd = e;
    render();
  }

  function zoom(factor, anchor = (state.viewStart + state.viewEnd) / 2) {
    const span = state.viewEnd - state.viewStart;
    const ratio = (anchor - state.viewStart) / span;
    const next = span * factor;
    setView(anchor - next * ratio, anchor + next * (1 - ratio));
  }

  function updatePlaybackVisuals(force = false) {
    if (!ui.playheadLine) return;
    const x = xFor(state.playhead);
    ui.playheadLine.setAttribute('x1', x); ui.playheadLine.setAttribute('x2', x);
    ui.playheadCap.setAttribute('d', `M ${x - 5} 17 L ${x + 5} 17 L ${x} 25 Z`);
    ui.clock.textContent = timeText(state.playhead);
    if (force || performance.now() - lastPlaybackPaint > 90) {
      state.playbackNodes.forEach(({ node, time }) => {
        node.classList.toggle('is-past', time <= state.playhead);
        node.classList.toggle('is-future', time > state.playhead);
      });
      lastPlaybackPaint = performance.now();
    }
  }

  function animate(now) {
    if (!state.playing) return;
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(80, now - lastFrame);
    lastFrame = now;
    const span = state.fullEnd - state.fullStart;
    state.playhead += delta * state.speed * span / 42000;
    if (state.playhead >= state.fullEnd) {
      state.playhead = state.fullEnd;
      state.playing = false;
      ui.play.textContent = t('play');
      updatePlaybackVisuals(true);
      return;
    }
    if (state.playhead < state.viewStart || state.playhead > state.viewEnd) {
      const viewSpan = state.viewEnd - state.viewStart;
      setView(state.playhead - viewSpan * .08, state.playhead + viewSpan * .92);
    }
    updatePlaybackVisuals();
    animationFrame = requestAnimationFrame(animate);
  }

  function setPlaying(value) {
    state.playing = Boolean(value);
    ui.play.textContent = state.playing ? t('pause') : t('play');
    cancelAnimationFrame(animationFrame);
    lastFrame = 0;
    if (state.playing) {
      if (state.playhead >= state.fullEnd) state.playhead = state.fullStart;
      animationFrame = requestAnimationFrame(animate);
    }
  }

  function bindControls() {
    root.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      syncLanguage();
    }));
    ui.play.addEventListener('click', () => setPlaying(!state.playing));
    root.querySelector('[data-action="restart"]').addEventListener('click', () => {
      state.playhead = state.fullStart; setView(state.fullStart, state.fullEnd); setPlaying(true);
    });
    root.querySelector('[data-action="zoom-in"]').addEventListener('click', () => zoom(.68));
    root.querySelector('[data-action="zoom-out"]').addEventListener('click', () => zoom(1.45));
    root.querySelector('[data-action="focus-execution"]').addEventListener('click', () => {
      const start = Math.min(...data.daemons.map(x => asTime(x.startedAt))) - 2 * 60000;
      const end = Math.max(...data.daemons.map(x => asTime(x.finishedAt))) + 5 * 60000;
      setView(start, end);
    });
    root.querySelector('[data-action="reset-view"]').addEventListener('click', () => setView(state.fullStart, state.fullEnd));
    ui.speed.addEventListener('change', () => { state.speed = Number(ui.speed.value) || 1; });

    ui.svg.addEventListener('wheel', event => {
      event.preventDefault();
      const rect = ui.svg.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left - 110) / Math.max(1, rect.width - 134), 0, 1);
      const anchor = state.viewStart + ratio * (state.viewEnd - state.viewStart);
      zoom(event.deltaY > 0 ? 1.22 : .82, anchor);
    }, { passive: false });

    ui.svg.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      state.drag = { x: event.clientX, start: state.viewStart, end: state.viewEnd };
      ui.svg.setPointerCapture(event.pointerId);
    });
    ui.svg.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const delta = event.clientX - state.drag.x;
      const plot = Math.max(1, ui.svg.getBoundingClientRect().width - 134);
      const shift = -delta / plot * (state.drag.end - state.drag.start);
      setView(state.drag.start + shift, state.drag.end + shift);
    });
    const release = event => {
      state.drag = null;
      if (event.pointerId !== undefined && ui.svg.hasPointerCapture(event.pointerId)) ui.svg.releasePointerCapture(event.pointerId);
    };
    ui.svg.addEventListener('pointerup', release);
    ui.svg.addEventListener('pointercancel', release);
    ui.svg.addEventListener('dblclick', () => setView(state.fullStart, state.fullEnd));
    ui.svg.addEventListener('keydown', event => {
      const span = state.viewEnd - state.viewStart;
      if (event.key === 'ArrowLeft') { event.preventDefault(); setView(state.viewStart - span * .08, state.viewEnd - span * .08); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); setView(state.viewStart + span * .08, state.viewEnd + span * .08); }
      else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(.72); }
      else if (event.key === '-') { event.preventDefault(); zoom(1.38); }
      else if (event.key === 'Home') { event.preventDefault(); setView(state.fullStart, state.fullEnd); }
      else if (event.key === ' ') { event.preventDefault(); setPlaying(!state.playing); }
    });
  }

  function validate(dataset) {
    const errors = [];
    if (dataset.schemaVersion !== 1) errors.push('schemaVersion');
    if (dataset.daemons?.length !== 103) errors.push('daemons!=103');
    if (dataset.prs?.length !== 50) errors.push('prs!=50');
    if (dataset.dispatches?.map(x => x.count).join(',') !== '37,33,33') errors.push('dispatches');
    if (dataset.daemons?.filter(x => x.state === 'failed').length !== 4) errors.push('failures!=4');
    if (dataset.recoveries?.length !== 4) errors.push('recoveries!=4');
    if (errors.length) throw new Error(`timeline-data invariant failed: ${errors.join(', ')}`);
  }

  function showError(error) {
    console.error(error);
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `<div class="tl-error"><strong>${escapeHTML(t('dataError'))}</strong><p>${escapeHTML(t('dataErrorHelp'))}</p><code>${escapeHTML(error.message || error)}</code></div>`;
  }

  async function boot() {
    try {
      data = await loadData();
      validate(data);
      shell();
      configureState();
      populateStats();
      bindControls();
      syncLanguage();
      root.setAttribute('aria-busy', 'false');
      resizeObserver = new ResizeObserver(() => render());
      resizeObserver.observe(root.querySelector('.tl-stage-wrap'));
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
