(() => {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const root = document.getElementById('timeline');
  if (!root) return;

  const I18N = {
    en: {
      kicker: 'Public evidence chronicle · UTC',
      title: '103 Agents · One Shared Clock',
      subtitle: 'Parallel dispatch, exact failures, bounded retries, retained artifacts, audit, closure, and publication.',
      light: 'Light', dark: 'Dark', timeline: 'Run timeline',
      overview: 'Full-domain overview', detail: 'Detail investigation stage',
      hint: 'Ctrl/⌘ + wheel zooms · drag stage pans · overview brush pans detail',
      play: 'Play', pause: 'Pause', restart: 'Restart', resetView: 'All',
      zoomIn: 'Zoom in', zoomOut: 'Zoom out', execution: 'Execution',
      incidents: 'Limits, failures & retries', publication: 'Publication', speed: 'Speed',
      issues: 'issues', daemons: 'original daemons', proposals: 'proposals complete',
      prs: 'PRs opened', failures: 'terminal failures', closes: 'verified closes',
      auditScope: 'Audit scope', plottedScope: 'Current-window evidence',
      zero429: 'Provider-rate evidence', zero429Body: '32 GitHub provider rate limits · 26 HTTP403 + 6 exact bodies without status · 0 observed HTTP429.',
      states: 'All-history canonical states', policy: 'Evidence policy',
      scopeBody: '243 traces · 112,229 event lines + 12,936 history lines · 0 corrupt.',
      plottedBody: '61 marks: 32 provider limits, 23 retries, 4 terminal failures, and 2 pre-failure artifact provenance marks.',
      stateBody: '192 done · 29 failed · 11 timeout · 11 cancelled.',
      policyBody: 'Count exact GitHub provider error bodies in tool results; exclude quoted prose/arguments and never relabel provider limits as HTTP429.',
      currentRange: 'Current range', zoomScale: 'Zoom', peakConcurrency: 'Peak concurrency',
      layerConcurrency: 'Concurrency', layerAgents: 'Agents', layerRate: 'Provider rate limits',
      layerFailures: 'Failures', layerRetries: 'Retries', layerPRs: 'PRs',
      layerClosures: 'Closures', layerAudits: 'Audits', layerMolts: 'Molts',
      focusIncidents: 'Focus incidents', eventList: 'Evidence event list',
      legendDone: 'daemon done', legendFail: 'daemon failed', legendRate: 'provider rate limit',
      legendFailure: 'terminal failure', legendRetry: 'retry dispatch', legendRecovery: 'retry completion',
      legendArtifact: 'artifact provenance', legendPR: 'PR opened', legendClose: 'issue closed',
      legendAudit: 'audit batch', legendMolt: 'molt',
      narrative: 'What the clock reveals', inspector: 'Selected evidence',
      inspectEmptyTitle: 'Select a mark or event',
      inspectEmpty: 'Chart marks and the event list share one inspector with exact UTC evidence.',
      story1Title: 'Parallelization is visible', story1Body: '37 + 33 + 33 daemons started inside 86 seconds; concurrency peaks from lifecycle intervals, not historical traces.',
      story2Title: 'Rate limits stay precise', story2Body: '32 exact GitHub provider-limit events cluster inside 115 seconds; none is presented as HTTP429.',
      story3Title: 'Retries are source joined', story3Body: '23 public-window retry dispatches join reasoning to the same call lifecycle; completion times point forward.',
      story4Title: 'Artifacts are not recoveries', story4Body: 'Two usable artifacts existed before failure and remain separate provenance marks without backward arrows.',
      repo: 'Repository', issue: 'Issue', disposition: 'Disposition', state: 'State',
      started: 'Started', finished: 'Finished', elapsed: 'Elapsed', opened: 'Opened',
      closed: 'Closed', batch: 'Batch', status: 'Status', scope: 'Scope', evidence: 'Evidence',
      timestamp: 'Timestamp', category: 'Category', relation: 'Relation', precision: 'Precision',
      basis: 'Basis', source: 'Source', recovery: 'Recovery', artifact: 'Artifact',
      openPR: 'Open pull request', complete: 'complete', queued: 'queued', paused: 'paused',
      none429: 'No visible provider-rate events', noVisibleEvents: 'No visible incidents for the selected filters.',
      playhead: 'Playback time'
    },
    zh: {
      kicker: '公开证据纪事 · UTC',
      title: '103 个 Agent · 一条共享时间轴',
      subtitle: '并行派发、精确失败、有界重试、保留成果、审计、关闭与发布。',
      light: '浅色', dark: '深色', timeline: '运行时间线',
      overview: '全域概览', detail: '细节调查舞台',
      hint: 'Ctrl/⌘ + 滚轮缩放 · 拖拽舞台平移 · 概览刷选同步细节',
      play: '播放', pause: '暂停', restart: '重播', resetView: '全部',
      zoomIn: '放大', zoomOut: '缩小', execution: '执行',
      incidents: '限流、失败与重试', publication: '发布', speed: '速度',
      issues: '个 issue', daemons: '个原始 daemon', proposals: '份提案完成',
      prs: '个 PR 已打开', failures: '个终态失败', closes: '个关闭已复验',
      auditScope: '审计范围', plottedScope: '当前窗口证据',
      zero429: 'Provider 限流证据', zero429Body: '32 次 GitHub provider 限流 · 26 次 HTTP403 + 6 次有确切正文但无状态码 · 0 次一手 HTTP429。',
      states: '全历史规范状态', policy: '证据政策',
      scopeBody: '243 个 trace · 112,229 行事件 + 12,936 行历史 · 0 损坏。',
      plottedBody: '61 个标记：32 次 provider 限流、23 次重试、4 个终态失败、2 个失败前成果溯源标记。',
      stateBody: '192 完成 · 29 失败 · 11 超时 · 11 取消。',
      policyBody: '仅统计工具结果中的 GitHub provider 确切错误正文；排除引用文本/参数，且绝不把 provider 限流改称 HTTP429。',
      currentRange: '当前范围', zoomScale: '缩放', peakConcurrency: '峰值并发',
      layerConcurrency: '并发', layerAgents: 'Agent', layerRate: 'Provider 限流',
      layerFailures: '失败', layerRetries: '重试', layerPRs: 'PR',
      layerClosures: '关闭', layerAudits: '审计', layerMolts: '凝蜕',
      focusIncidents: '聚焦事件', eventList: '证据事件列表',
      legendDone: 'daemon 完成', legendFail: 'daemon 失败', legendRate: 'provider 限流',
      legendFailure: '终态失败', legendRetry: '重试派发', legendRecovery: '重试完成',
      legendArtifact: '成果溯源', legendPR: 'PR 打开', legendClose: 'issue 关闭',
      legendAudit: '审计批次', legendMolt: '凝蜕',
      narrative: '共享时间轴揭示了什么', inspector: '所选证据',
      inspectEmptyTitle: '选择标记或事件',
      inspectEmpty: '图表标记和事件列表共用一个检查器，并展示精确 UTC 证据。',
      story1Title: '并行化清晰可见', story1Body: '37 + 33 + 33 个 daemon 在 86 秒内启动；并发峰值来自生命周期区间，而非历史 trace。',
      story2Title: '限流保持精确', story2Body: '32 个 GitHub provider 限流事件集中在 115 秒内；其中没有任何事件被呈现为 HTTP429。',
      story3Title: '重试已与源生命周期联结', story3Body: '公开窗口中的 23 次重试把 reasoning 与同一调用生命周期联结；完成时间都正向延伸。',
      story4Title: '成果不是恢复', story4Body: '两份可用成果在失败前已经存在，作为独立溯源标记保留，不画回退箭头。',
      repo: '仓库', issue: 'Issue', disposition: '处置', state: '状态',
      started: '开始', finished: '结束', elapsed: '耗时', opened: '打开',
      closed: '关闭', batch: '批次', status: '状态', scope: '范围', evidence: '证据',
      timestamp: '时间戳', category: '类别', relation: '关联', precision: '精度',
      basis: '依据', source: '来源', recovery: '恢复', artifact: '成果',
      openPR: '打开 Pull Request', complete: '已完成', queued: '已排队', paused: '已暂挂',
      none429: '当前没有可见 provider 限流事件', noVisibleEvents: '当前过滤器下没有可见事件。',
      playhead: '回放时间'
    }
  };

  const GROUP_CLASS = {
    'dg-20260809-021029-bb27eb': 'tl-dispatch-a',
    'dg-20260809-021146-f9ccbb': 'tl-dispatch-b',
    'dg-20260809-021152-4cb99e': 'tl-dispatch-c'
  };
  const INCIDENT_LAYER = {
    rate_limit: 'rate', terminal_failure: 'failures',
    retry: 'retries', artifact_retained: 'retries'
  };
  const INCIDENT_ORDER = ['rate_limit', 'terminal_failure', 'retry', 'artifact_retained'];
  const PLOT = { left: 116, right: 26, top: 18, bottom: 556 };

  let data;
  let ui = {};
  let ro;
  let raf = 0;
  let lastFrame = 0;
  const state = {
    lang: 'en', theme: 'light', fullStart: 0, fullEnd: 0, viewStart: 0, viewEnd: 0,
    playhead: 0, playing: false, speed: 4, selected: null, focusedEvent: null,
    width: 1200, overviewWidth: 1200, drag: null, brushDrag: null, playbackNodes: [],
    layers: { concurrency: true, agents: true, rate: true, failures: true, retries: true, prs: true, closures: true, audits: true, molts: true }
  };

  const t = key => I18N[state.lang][key] || I18N.en[key] || key;
  const local = (obj, stem) => obj?.[`${stem}${state.lang === 'zh' ? 'Zh' : 'En'}`] || obj?.[`${stem}En`] || '';
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch]));
  const asTime = value => typeof value === 'number' ? value : Date.parse(value);
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const trim = (value, max) => {
    const s = String(value || '');
    return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
  };
  const timeText = value => {
    const d = new Date(asTime(value));
    return Number.isNaN(+d) ? '-' : `${d.toISOString().slice(11, 19)}Z`;
  };
  const isoText = value => {
    const d = new Date(asTime(value));
    return Number.isNaN(+d) ? '-' : d.toISOString();
  };
  const durationText = seconds => {
    const n = Math.max(0, Number(seconds) || 0);
    if (n < 60) return `${n.toFixed(n < 10 ? 1 : 0)}s`;
    return `${Math.floor(n / 60)}m ${String(Math.round(n % 60)).padStart(2, '0')}s`;
  };
  const safeUrl = value => {
    try {
      const url = new URL(String(value));
      return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : '';
    } catch {
      return '';
    }
  };
  const svg = (name, attrs = {}, text = '') => {
    const node = document.createElementNS(NS, name);
    Object.entries(attrs).forEach(([key, value]) => {
      if (value !== undefined && value !== null) node.setAttribute(key, String(value));
    });
    if (text) node.textContent = text;
    return node;
  };
  const eventId = (kind, item) => {
    if (kind === 'incident') return item.id;
    if (kind === 'daemon') return item.id;
    if (kind === 'pr') return `pr-${item.prNumber}`;
    if (kind === 'close') return `close-${item.repo}-${item.issue}`;
    if (kind === 'audit') return `audit-${item.batch}`;
    if (kind === 'molt') return `molt-${item.actor}-${item.count}`;
    if (kind === 'milestone') return `milestone-${item.id}`;
    return item.id || `${kind}-${item.issue || ''}`;
  };

  function loadData() {
    const embedded = root.ownerDocument.getElementById('timeline-data');
    if (!embedded || !embedded.textContent.trim()) throw new Error('missing embedded timeline-data JSON');
    return JSON.parse(embedded.textContent);
  }

  function shell() {
    root.innerHTML = `
      <main class="tl-shell">
        <header class="tl-hero">
          <div>
            <div class="tl-kicker" data-i18n="kicker"></div>
            <h1 class="tl-title" data-i18n="title"></h1>
            <p class="tl-subtitle" data-i18n="subtitle"></p>
          </div>
          <div class="tl-switches">
            <button class="tl-btn" type="button" data-lang="en" aria-pressed="true">EN</button>
            <button class="tl-btn" type="button" data-lang="zh" aria-pressed="false">中文</button>
            <button class="tl-btn" type="button" data-theme-toggle="light" aria-pressed="true" data-i18n="light"></button>
            <button class="tl-btn" type="button" data-theme-toggle="dark" aria-pressed="false" data-i18n="dark"></button>
          </div>
        </header>
        <section class="tl-stat-grid" aria-label="Run summary">
          ${statCard('issues', 'var(--tl-dispatch-a)')}
          ${statCard('daemons', 'var(--tl-dispatch-b)')}
          ${statCard('proposals', 'var(--tl-dispatch-c)')}
          ${statCard('prs', 'var(--tl-pr)')}
          ${statCard('failures', 'var(--tl-failure)')}
          ${statCard('closes', 'var(--tl-close)')}
        </section>
        <section class="tl-evidence-grid" aria-label="Evidence summary">
          <article class="tl-card"><strong data-i18n="auditScope"></strong><p data-i18n="scopeBody"></p></article>
          <article class="tl-card tl-zero-card"><strong data-i18n="zero429"></strong><p data-i18n="zero429Body"></p></article>
          <article class="tl-card"><strong data-i18n="plottedScope"></strong><p data-i18n="plottedBody"></p></article>
          <article class="tl-card"><strong data-i18n="states"></strong><p data-i18n="stateBody"></p></article>
        </section>
        <section class="tl-panel" aria-labelledby="tl-overview-title">
          <div class="tl-overview-head">
            <div class="tl-heading-group"><h2 id="tl-overview-title" data-i18n="overview"></h2><span class="tl-range-readout"></span></div>
            <div class="tl-preset-row">
              <button class="tl-btn" type="button" data-preset="all" data-i18n="resetView"></button>
              <button class="tl-btn" type="button" data-preset="execution" data-i18n="execution"></button>
              <button class="tl-btn" type="button" data-preset="incidents" data-i18n="incidents"></button>
              <button class="tl-btn" type="button" data-preset="publication" data-i18n="publication"></button>
            </div>
          </div>
          <div class="tl-overview-wrap"><svg class="tl-overview" tabindex="0" role="group"></svg></div>
        </section>
        <section class="tl-panel" aria-labelledby="tl-main-title">
          <div class="tl-panel-head">
            <div class="tl-heading-group"><h2 id="tl-main-title" data-i18n="timeline"></h2><span data-i18n="hint"></span></div>
            <div class="tl-controls">
              <button class="tl-btn tl-primary" type="button" data-action="play"></button>
              <button class="tl-btn" type="button" data-action="restart" data-i18n="restart"></button>
              <select class="tl-select" aria-label="Playback speed"></select>
              <button class="tl-icon" type="button" data-action="zoom-out" aria-label="Zoom out">-</button>
              <button class="tl-icon" type="button" data-action="zoom-in" aria-label="Zoom in">+</button>
              <button class="tl-btn" type="button" data-action="focus-incidents" data-i18n="focusIncidents"></button>
              <span class="tl-clock"></span>
            </div>
          </div>
          <div class="tl-filter-bar"><div class="tl-chip-row"></div><div class="tl-range-readout tl-detail-readout"></div></div>
          <div class="tl-stage-wrap"><svg class="tl-stage" tabindex="0" role="group"></svg><span class="tl-zoom-hint" data-i18n="hint"></span></div>
          <div class="tl-legend"></div>
        </section>
        <div class="tl-lower">
          <section class="tl-panel tl-story"><h2 class="tl-section-label" data-i18n="narrative"></h2><div class="tl-story-grid"></div></section>
          <aside class="tl-panel tl-inspector"><h2 class="tl-section-label" data-i18n="inspector"></h2><div class="tl-inspector-body"></div></aside>
        </div>
        <section class="tl-panel tl-event-list-panel"><h2 class="tl-section-label" data-i18n="eventList"></h2><div class="tl-event-list"></div></section>
        <footer class="tl-data-note"><span data-i18n="policyBody"></span><span>Standalone authoring source: embedded JSON, separate CSS/JS, no CDN.</span></footer>
      </main>
      <div class="tl-tooltip" role="tooltip"></div>`;
    ui = {
      overview: root.querySelector('.tl-overview'),
      stage: root.querySelector('.tl-stage'),
      tooltip: root.querySelector('.tl-tooltip'),
      legend: root.querySelector('.tl-legend'),
      stories: root.querySelector('.tl-story-grid'),
      inspector: root.querySelector('.tl-inspector-body'),
      eventList: root.querySelector('.tl-event-list'),
      clock: root.querySelector('.tl-clock'),
      play: root.querySelector('[data-action="play"]'),
      speed: root.querySelector('.tl-select'),
      filters: root.querySelector('.tl-chip-row'),
      readouts: root.querySelectorAll('.tl-range-readout')
    };
  }

  function statCard(key, color) {
    return `<article class="tl-stat" style="--stat-color:${color}"><strong class="tl-stat-value" data-stat="${key}">-</strong><span class="tl-stat-label" data-i18n="${key}"></span></article>`;
  }

  function configureState() {
    state.fullStart = asTime(data.meta.windowStart);
    state.fullEnd = asTime(data.meta.windowEnd);
    const daemonStarts = data.daemons.map(item => asTime(item.startedAt));
    const daemonEnds = data.daemons.map(item => asTime(item.finishedAt));
    state.viewStart = Math.max(state.fullStart, Math.min(...daemonStarts) - 2 * 60000);
    state.viewEnd = Math.min(state.fullEnd, Math.max(...daemonEnds) + 6 * 60000);
    state.playhead = state.viewStart;
    state.selected = { kind: 'incident', id: 'artifact-001' };
    state.focusedEvent = 'artifact-001';
    root.dataset.theme = state.theme;
    ui.speed.innerHTML = [1, 4, 12, 32].map(v => `<option value="${v}"${v === state.speed ? ' selected' : ''}>${escapeHTML(t('speed'))} ${v}x</option>`).join('');
  }

  function populateStats() {
    const values = {
      issues: data.summary.issues,
      daemons: data.summary.originalDaemons,
      proposals: data.summary.issues,
      prs: data.summary.pr,
      failures: data.summary.failed,
      closes: data.summary.executedCloses
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = root.querySelector(`[data-stat="${key}"]`);
      if (node) node.textContent = value;
    });
  }

  function syncText() {
    root.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
    root.querySelectorAll('[data-lang]').forEach(node => {
      node.setAttribute('aria-pressed', node.dataset.lang === state.lang ? 'true' : 'false');
      node.setAttribute('aria-label', node.dataset.lang === 'zh' ? '中文' : 'English');
    });
    root.querySelectorAll('[data-theme-toggle]').forEach(node => {
      node.setAttribute('aria-pressed', node.dataset.themeToggle === state.theme ? 'true' : 'false');
    });
    ui.play.textContent = state.playing ? t('pause') : t('play');
    ui.speed.setAttribute('aria-label', `${t('speed')}`);
    [...ui.speed.options].forEach(option => { option.textContent = `${t('speed')} ${option.value}x`; });
    ui.overview.setAttribute('aria-label', `${t('overview')}. ${t('hint')}`);
    ui.stage.setAttribute('aria-label', `${t('detail')}. ${t('hint')}`);
    renderFilters();
    renderLegend();
    renderStories();
    renderInspector();
    renderEventList();
    renderAll();
  }

  function renderFilters() {
    const items = [
      ['concurrency', 'layerConcurrency', 'var(--tl-focus)'], ['agents', 'layerAgents', 'var(--tl-dispatch-a)'],
      ['rate', 'layerRate', 'var(--tl-rate)'], ['failures', 'layerFailures', 'var(--tl-failure)'],
      ['retries', 'layerRetries', 'var(--tl-retry)'], ['prs', 'layerPRs', 'var(--tl-pr)'],
      ['closures', 'layerClosures', 'var(--tl-close)'], ['audits', 'layerAudits', 'var(--tl-audit)'],
      ['molts', 'layerMolts', 'var(--tl-molt)']
    ];
    ui.filters.innerHTML = items.map(([key, label, color]) =>
      `<button class="tl-chip-toggle" style="--chip-color:${color}" type="button" data-layer="${key}" aria-pressed="${state.layers[key] ? 'true' : 'false'}">${escapeHTML(t(label))}</button>`
    ).join('');
    ui.filters.querySelectorAll('[data-layer]').forEach(button => button.addEventListener('click', () => {
      state.layers[button.dataset.layer] = !state.layers[button.dataset.layer];
      renderFilters();
      renderAll();
      renderEventList();
    }));
  }

  function renderLegend() {
    const items = [
      ['var(--tl-dispatch-c)', 'legendDone', 'dot'], ['var(--tl-failure)', 'legendFail', 'dot'],
      ['var(--tl-rate)', 'legendRate', 'triangle'], ['var(--tl-failure)', 'legendFailure', 'diamond'],
      ['var(--tl-retry)', 'legendRetry', 'triangle'], ['var(--tl-recovery)', 'legendRecovery', 'dot'],
      ['var(--tl-artifact)', 'legendArtifact', 'bar'], ['var(--tl-pr)', 'legendPR', 'bar'],
      ['var(--tl-close)', 'legendClose', 'diamond'], ['var(--tl-audit)', 'legendAudit', 'bar'],
      ['var(--tl-molt)', 'legendMolt', 'diamond']
    ];
    ui.legend.innerHTML = items.map(([color, label, shape]) =>
      `<span class="tl-legend-item"><i class="tl-swatch tl-${shape}" style="--swatch:${color}"></i>${escapeHTML(t(label))}</span>`
    ).join('');
  }

  function renderStories() {
    const cards = [
      ['var(--tl-dispatch-a)', '01', 'story1Title', 'story1Body'],
      ['var(--tl-rate)', '02', 'story2Title', 'story2Body'],
      ['var(--tl-retry)', '03', 'story3Title', 'story3Body'],
      ['var(--tl-artifact)', '04', 'story4Title', 'story4Body']
    ];
    ui.stories.innerHTML = cards.map(([color, idx, title, body]) =>
      `<article class="tl-story-card" style="--accent:${color}"><span class="tl-story-index">${idx}</span><h3>${escapeHTML(t(title))}</h3><p>${escapeHTML(t(body))}</p></article>`
    ).join('');
  }

  function concurrencyPoints() {
    const events = [];
    data.daemons.forEach(d => {
      events.push([asTime(d.startedAt), 1], [asTime(d.finishedAt), -1]);
    });
    events.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    let active = 0;
    const pts = [[state.fullStart, 0]];
    events.forEach(([ts, delta]) => {
      pts.push([ts, active]);
      active += delta;
      pts.push([ts, active]);
    });
    pts.push([state.fullEnd, 0]);
    return pts;
  }

  function peakConcurrency() {
    return Math.max(...concurrencyPoints().map(p => p[1]));
  }

  function x(value) {
    const ratio = (asTime(value) - state.viewStart) / (state.viewEnd - state.viewStart);
    return PLOT.left + ratio * (state.width - PLOT.left - PLOT.right);
  }

  function ox(value) {
    const ratio = (asTime(value) - state.fullStart) / (state.fullEnd - state.fullStart);
    return PLOT.left + ratio * (state.overviewWidth - PLOT.left - PLOT.right);
  }

  function inView(value, pad = 0) {
    const ts = asTime(value);
    return ts >= state.viewStart - pad && ts <= state.viewEnd + pad;
  }

  function renderAll() {
    renderOverview();
    renderStage();
    updateReadouts();
  }

  function updateReadouts() {
    const fullSpan = state.fullEnd - state.fullStart;
    const span = state.viewEnd - state.viewStart;
    const text = `${t('currentRange')}: ${timeText(state.viewStart)}-${timeText(state.viewEnd)} · ${t('zoomScale')}: ${(fullSpan / span).toFixed(1)}x · ${t('peakConcurrency')}: ${peakConcurrency()}`;
    ui.readouts.forEach(node => { node.textContent = text; });
  }

  function renderOverview() {
    const rect = ui.overview.getBoundingClientRect();
    state.overviewWidth = Math.max(680, Math.round(rect.width || 1200));
    ui.overview.setAttribute('viewBox', `0 0 ${state.overviewWidth} 160`);
    ui.overview.replaceChildren();
    drawOverviewGrid();
    drawOverviewConcurrency();
    drawOverviewIncidents();
    drawBrush();
  }

  function drawOverviewGrid() {
    const g = svg('g', { 'aria-hidden': 'true' });
    const bands = [
      [data.meta.windowStart, data.dispatches[0].startedAt],
      [data.dispatches[0].startedAt, '2026-08-09T03:00:00Z'],
      ['2026-08-09T03:00:00Z', '2026-08-09T04:30:00Z'],
      ['2026-08-09T04:30:00Z', data.meta.windowEnd]
    ];
    bands.forEach(([a, b], i) => g.append(svg('rect', { x: ox(a), y: 10, width: Math.max(1, ox(b) - ox(a)), height: 125, class: 'tl-phase-band', opacity: i % 2 ? .56 : .32 })));
    const step = 30 * 60000;
    for (let ts = Math.ceil(state.fullStart / step) * step; ts <= state.fullEnd; ts += step) {
      const px = ox(ts);
      g.append(svg('line', { x1: px, y1: 12, x2: px, y2: 135, class: 'tl-grid-line' }));
      g.append(svg('text', { x: px, y: 150, class: 'tl-axis-label', 'text-anchor': 'middle' }, timeText(ts).slice(0, 5)));
    }
    g.append(svg('line', { x1: PLOT.left, y1: 135, x2: state.overviewWidth - PLOT.right, y2: 135, class: 'tl-axis' }));
    ui.overview.append(g);
  }

  function drawOverviewConcurrency() {
    const max = Math.max(1, peakConcurrency());
    const base = 126, top = 22;
    const pts = concurrencyPoints();
    const area = [`M ${ox(state.fullStart)} ${base}`];
    pts.forEach(([ts, n]) => area.push(`L ${ox(ts)} ${base - (n / max) * (base - top)}`));
    area.push(`L ${ox(state.fullEnd)} ${base} Z`);
    const line = pts.map(([ts, n], i) => `${i ? 'L' : 'M'} ${ox(ts)} ${base - (n / max) * (base - top)}`).join(' ');
    ui.overview.append(svg('path', { d: area.join(' '), class: 'tl-concurrency-area' }));
    ui.overview.append(svg('path', { d: line, class: 'tl-concurrency-line' }));
    ui.overview.append(svg('text', { x: 14, y: 28, class: 'tl-lane-label' }, `${t('peakConcurrency')}: ${max}`));
  }

  function drawOverviewIncidents() {
    const g = svg('g', { 'aria-label': t('incidents') });
    data.trace.events.forEach(ev => {
      const px = ox(ev.timestamp);
      const y = 28 + INCIDENT_ORDER.indexOf(ev.kind) * 14;
      g.append(svg('line', { x1: px, y1: y, x2: px, y2: 134, class: `tl-incident tl-incident-${ev.kind}`, opacity: .66 }));
    });
    if (data.trace.events.filter(e => e.kind === 'rate_limit').length === 0) {
      g.append(svg('text', { x: 14, y: 52, class: 'tl-lane-sub' }, t('none429')));
    }
    ui.overview.append(g);
  }

  function drawBrush() {
    const bx = ox(state.viewStart);
    const bw = Math.max(14, ox(state.viewEnd) - bx);
    ui.overview.append(svg('rect', { x: PLOT.left, y: 10, width: Math.max(0, bx - PLOT.left), height: 125, class: 'tl-brush-shade' }));
    ui.overview.append(svg('rect', { x: bx + bw, y: 10, width: Math.max(0, state.overviewWidth - PLOT.right - bx - bw), height: 125, class: 'tl-brush-shade' }));
    ui.overview.append(svg('rect', { x: bx, y: 10, width: bw, height: 125, rx: 5, class: 'tl-brush', tabindex: '-1' }));
  }

  function renderStage() {
    const rect = ui.stage.getBoundingClientRect();
    state.width = Math.max(680, Math.round(rect.width || 1200));
    ui.stage.setAttribute('viewBox', `0 0 ${state.width} 590`);
    ui.stage.replaceChildren();
    state.playbackNodes = [];
    drawGrid();
    if (state.layers.concurrency) drawDetailConcurrency();
    if (state.layers.molts) drawMolts();
    drawMilestones();
    if (state.layers.agents) drawDaemons();
    drawIncidents();
    if (state.layers.prs) drawPRs();
    if (state.layers.closures) drawCloses();
    if (state.layers.audits) drawAudits();
    drawPlayhead();
    updatePlaybackVisuals(true);
    restoreFocus();
  }

  function drawGrid() {
    const g = svg('g', { 'aria-hidden': 'true' });
    const span = state.viewEnd - state.viewStart;
    const steps = [1, 5, 10, 15, 30, 60, 120].map(m => m * 60000);
    const step = steps.find(s => span / s <= 12) || steps[steps.length - 1];
    for (let ts = Math.ceil(state.viewStart / step) * step; ts <= state.viewEnd; ts += step) {
      const px = x(ts);
      g.append(svg('line', { x1: px, y1: PLOT.top, x2: px, y2: PLOT.bottom, class: 'tl-grid-line' }));
      g.append(svg('text', { x: px, y: 574, class: 'tl-axis-label', 'text-anchor': 'middle' }, timeText(ts).slice(0, 5)));
    }
    [
      [32, t('layerConcurrency'), `${t('peakConcurrency')}: ${peakConcurrency()}`],
      [122, t('incidents'), 'provider limit / failure / retry / provenance'], 
      [250, t('layerAgents'), '37 + 33 + 33'],
      [438, t('layerPRs'), '50'],
      [482, t('layerClosures'), '23'],
      [526, t('layerAudits'), '9']
    ].forEach(([y, label, sub]) => {
      g.append(svg('line', { x1: PLOT.left, y1: y + 10, x2: state.width - PLOT.right, y2: y + 10, class: 'tl-lane-rule' }));
      g.append(svg('text', { x: 14, y, class: 'tl-lane-label' }, label));
      g.append(svg('text', { x: 14, y: y + 13, class: 'tl-lane-sub' }, sub));
    });
    ui.stage.append(g);
  }

  function drawDetailConcurrency() {
    const max = Math.max(1, peakConcurrency());
    const base = 104, top = 28;
    const pts = concurrencyPoints().filter(([ts]) => ts >= state.viewStart - 60000 && ts <= state.viewEnd + 60000);
    const area = [`M ${x(state.viewStart)} ${base}`];
    pts.forEach(([ts, n]) => area.push(`L ${x(ts)} ${base - (n / max) * (base - top)}`));
    area.push(`L ${x(state.viewEnd)} ${base} Z`);
    const line = pts.map(([ts, n], i) => `${i ? 'L' : 'M'} ${x(ts)} ${base - (n / max) * (base - top)}`).join(' ');
    ui.stage.append(svg('path', { d: area.join(' '), class: 'tl-concurrency-area' }));
    ui.stage.append(svg('path', { d: line, class: 'tl-concurrency-line' }));
  }

  function drawMilestones() {
    data.milestones.filter(m => inView(m.timestamp, 60000)).forEach((m, index) => {
      const px = x(m.timestamp);
      const y = 18 + (index % 3) * 25;
      const visible = svg('circle', { cx: px, cy: y, r: 5, class: 'tl-mark-visible tl-incident tl-incident-recovery' });
      const group = markGroup('milestone', m, m.timestamp, `${t('timestamp')}: ${isoText(m.timestamp)} ${local(m, 'label')}`);
      group.append(svg('line', { x1: px, y1: y + 6, x2: px, y2: 116, class: 'tl-grid-line' }));
      group.append(visible, svg('rect', { x: px - 14, y: y - 14, width: 28, height: 28, class: 'tl-mark-hit' }));
      ui.stage.append(group);
    });
  }

  function drawDaemons() {
    const base = {
      'dg-20260809-021029-bb27eb': 218,
      'dg-20260809-021146-f9ccbb': 300,
      'dg-20260809-021152-4cb99e': 382
    };
    const ranks = Object.fromEntries(data.dispatches.map(d => [d.groupId, 0]));
    data.dispatches.forEach(group => {
      const y = base[group.groupId];
      ui.stage.append(svg('text', { x: 14, y: y + 4, class: 'tl-lane-sub' }, `${local(group, 'label')} · ${group.count}`));
    });
    data.daemons.forEach(d => {
      const sx = x(d.startedAt), ex = x(d.finishedAt);
      if (ex < PLOT.left || sx > state.width - PLOT.right) return;
      const laneY = base[d.groupId];
      const rank = ranks[d.groupId]++;
      const y = laneY - 28 + rank * 1.55;
      const group = markGroup('daemon', d, d.finishedAt, `${d.repo}#${d.issue}: ${d.title}`);
      group.classList.add(GROUP_CLASS[d.groupId] || 'tl-dispatch-a');
      const width = Math.max(2, Math.min(state.width - PLOT.right, ex) - Math.max(PLOT.left, sx));
      group.append(svg('rect', { x: Math.max(PLOT.left, sx), y, width, height: 1.6, rx: .8, class: `tl-mark-visible tl-duration${isSelected('daemon', d) ? ' is-selected' : ''}` }));
      const dotY = laneY + ((hash(d.id) % 13) - 6) * 2;
      if (inView(d.finishedAt, 60000)) {
        group.append(svg('circle', { cx: ex, cy: dotY, r: d.state === 'failed' ? 5 : 3.2, class: `tl-mark-visible tl-dot${d.state === 'failed' ? ' tl-failed' : ''}` }));
        group.append(svg('rect', { x: ex - 12, y: dotY - 12, width: 24, height: 24, class: 'tl-mark-hit' }));
        state.playbackNodes.push({ node: group, time: asTime(d.finishedAt) });
      }
      ui.stage.append(group);
    });
  }

  function drawIncidents() {
    const byKindRank = {};
    data.trace.events.forEach(ev => {
      const layer = INCIDENT_LAYER[ev.kind];
      if (!state.layers[layer] || !inView(ev.timestamp, 2 * 60000)) return;
      byKindRank[ev.kind] = (byKindRank[ev.kind] || 0) + 1;
      const px = x(ev.timestamp);
      const y = 132 + INCIDENT_ORDER.indexOf(ev.kind) * 16 + (byKindRank[ev.kind] % 2) * 5;
      const group = markGroup('incident', ev, ev.timestamp, `${local(ev, 'label')} · ${isoText(ev.timestamp)}`);
      group.style.setProperty('--mark-color', `var(--tl-${ev.kind === 'rate_limit' ? 'rate' : ev.kind === 'terminal_failure' ? 'failure' : ev.kind === 'artifact_retained' ? 'artifact' : ev.kind})`);
      if (ev.kind === 'retry') {
        group.append(svg('path', { d: `M ${px} ${y - 7} L ${px + 7} ${y + 6} L ${px - 7} ${y + 6} Z`, class: `tl-mark-visible tl-incident tl-incident-${ev.kind}` }));
      } else if (ev.kind === 'terminal_failure') {
        group.append(svg('rect', { x: px - 5, y: y - 5, width: 10, height: 10, transform: `rotate(45 ${px} ${y})`, class: `tl-mark-visible tl-incident tl-incident-${ev.kind}` }));
      } else if (ev.kind === 'artifact_retained') {
        group.append(svg('rect', { x: px - 7, y: y - 4, width: 14, height: 8, rx: 2, class: `tl-mark-visible tl-incident tl-incident-${ev.kind}` }));
      } else {
        group.append(svg('circle', { cx: px, cy: y, r: 5.5, class: `tl-mark-visible tl-incident tl-incident-${ev.kind}` }));
      }
      group.append(svg('rect', { x: px - 16, y: y - 16, width: 32, height: 32, class: 'tl-mark-hit' }));
      state.playbackNodes.push({ node: group, time: asTime(ev.timestamp) });
      ui.stage.append(group);
    });
    drawRecoveryChains();
  }

  function drawRecoveryChains() {
    data.trace.events.filter(e => e.kind === 'retry' && e.completedAt).forEach(retry => {
      const a = asTime(retry.timestamp), b = asTime(retry.completedAt);
      if (b < a || !state.layers.retries || b < state.viewStart || a > state.viewEnd) return;
      ui.stage.append(svg('line', { x1: x(a), y1: 178, x2: x(b), y2: 178, class: 'tl-retry-span', stroke: 'var(--tl-recovery)', 'stroke-dasharray': '3 3', 'aria-hidden': 'true' }));
    });
  }

  function drawPRs() {
    data.prs.forEach(pr => {
      if (!inView(pr.openedAt, 60000)) return;
      const px = x(pr.openedAt);
      const group = markGroup('pr', pr, pr.openedAt, `PR #${pr.prNumber}: ${pr.title}`);
      group.append(svg('line', { x1: px, y1: 426, x2: px, y2: 452, class: 'tl-mark-visible tl-pr-mark' }));
      group.append(svg('rect', { x: px - 8, y: 418, width: 16, height: 40, class: 'tl-mark-hit' }));
      state.playbackNodes.push({ node: group, time: asTime(pr.openedAt) });
      ui.stage.append(group);
    });
  }

  function drawCloses() {
    data.closes.forEach((close, index) => {
      if (!inView(close.closedAt, 60000)) return;
      const px = x(close.closedAt);
      const y = 468 + (index % 4) * 7;
      const group = markGroup('close', close, close.closedAt, `${close.repo}#${close.issue}: ${close.title || ''}`);
      group.append(svg('polygon', { points: `${px},${y - 5} ${px + 5},${y} ${px},${y + 5} ${px - 5},${y}`, class: 'tl-mark-visible tl-close-mark' }));
      group.append(svg('rect', { x: px - 13, y: y - 13, width: 26, height: 26, class: 'tl-mark-hit' }));
      state.playbackNodes.push({ node: group, time: asTime(close.closedAt) });
      ui.stage.append(group);
    });
  }

  function drawAudits() {
    data.audits.forEach(audit => {
      const start = asTime(audit.requestedAt);
      const end = audit.completedAt ? asTime(audit.completedAt) : start + 70000;
      if (end < state.viewStart || start > state.viewEnd) return;
      const sx = x(start), ex = x(end);
      const y = 510 + (audit.batch - 1) * 5;
      const group = markGroup('audit', audit, audit.completedAt || audit.requestedAt, `${t('batch')} ${audit.batch}`);
      group.append(svg('rect', { x: Math.max(PLOT.left, sx), y, width: Math.max(6, Math.min(state.width - PLOT.right, ex) - Math.max(PLOT.left, sx)), height: 4, rx: 2, class: 'tl-mark-visible tl-audit-bar' }));
      group.append(svg('rect', { x: Math.max(PLOT.left, sx) - 5, y: y - 10, width: Math.max(16, Math.min(state.width - PLOT.right, ex) - Math.max(PLOT.left, sx) + 10), height: 24, class: 'tl-mark-hit' }));
      ui.stage.append(group);
    });
  }

  function drawMolts() {
    data.molts.forEach(molt => {
      if (!inView(molt.timestamp, 60000)) return;
      const px = x(molt.timestamp);
      ui.stage.append(svg('line', { x1: px, y1: 18, x2: px, y2: PLOT.bottom, class: 'tl-molt-line' }));
      const group = markGroup('molt', molt, molt.timestamp, local(molt, 'label'));
      group.append(svg('rect', { x: px - 5, y: 194, width: 10, height: 10, rx: 2, transform: `rotate(45 ${px} 199)`, class: 'tl-mark-visible tl-molt-glyph' }));
      group.append(svg('rect', { x: px - 13, y: 186, width: 26, height: 26, class: 'tl-mark-hit' }));
      ui.stage.append(group);
    });
  }

  function drawPlayhead() {
    const px = x(state.playhead);
    ui.playheadLine = svg('line', { x1: px, y1: 18, x2: px, y2: PLOT.bottom, class: 'tl-playhead' });
    ui.playheadCap = svg('path', { d: `M ${px - 5} 18 L ${px + 5} 18 L ${px} 26 Z`, class: 'tl-playhead-cap' });
    ui.stage.append(ui.playheadLine, ui.playheadCap);
  }

  function markGroup(kind, item, time, aria) {
    const id = eventId(kind, item);
    const g = svg('g', {
      class: `tl-mark-group${isSelected(kind, item) ? ' is-selected' : ''}`,
      tabindex: state.focusedEvent === id ? '0' : '-1',
      role: 'button',
      'data-event-id': id,
      'aria-label': aria
    });
    g.addEventListener('mouseenter', event => showTooltip(event, kind, item));
    g.addEventListener('mousemove', moveTooltip);
    g.addEventListener('mouseleave', hideTooltip);
    g.addEventListener('focus', event => showTooltip(event, kind, item));
    g.addEventListener('blur', hideTooltip);
    g.addEventListener('click', event => {
      event.stopPropagation();
      select(kind, item, true);
    });
    g.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        select(kind, item, true);
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusAdjacent(1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusAdjacent(-1);
      }
    });
    g.dataset.time = String(asTime(time));
    return g;
  }

  function isSelected(kind, item) {
    return state.selected && state.selected.kind === kind && state.selected.id === eventId(kind, item);
  }

  function select(kind, item, keepFocus = false) {
    const id = eventId(kind, item);
    state.selected = { kind, id };
    state.focusedEvent = id;
    renderInspector(kind, item);
    renderStage();
    renderEventList();
    if (keepFocus) restoreFocus();
  }

  function focusAdjacent(delta) {
    const nodes = [...ui.stage.querySelectorAll('.tl-mark-group')].sort((a, b) => Number(a.dataset.time) - Number(b.dataset.time));
    if (!nodes.length) return;
    const index = Math.max(0, nodes.findIndex(n => n.dataset.eventId === state.focusedEvent));
    const next = nodes[clamp(index + delta, 0, nodes.length - 1)];
    state.focusedEvent = next.dataset.eventId;
    nodes.forEach(n => n.setAttribute('tabindex', n === next ? '0' : '-1'));
    next.focus();
  }

  function restoreFocus() {
    const node = ui.stage.querySelector(`[data-event-id="${CSS.escape(state.focusedEvent || '')}"]`);
    if (node) node.setAttribute('tabindex', '0');
  }

  function showTooltip(event, kind, item) {
    ui.tooltip.innerHTML = tooltipHTML(kind, item);
    ui.tooltip.classList.add('is-visible');
    moveTooltip(event);
  }

  function moveTooltip(event) {
    if (!ui.tooltip.classList.contains('is-visible')) return;
    const target = event.target.getBoundingClientRect ? event.target.getBoundingClientRect() : { left: 0, top: 0 };
    const x0 = event.clientX || target.left + 10;
    const y0 = event.clientY || target.top + 10;
    const box = ui.tooltip.getBoundingClientRect();
    let left = x0 + 14, top = y0 + 14;
    if (left + box.width > window.innerWidth - 8) left = x0 - box.width - 14;
    if (top + box.height > window.innerHeight - 8) top = y0 - box.height - 14;
    ui.tooltip.style.left = `${Math.max(8, left)}px`;
    ui.tooltip.style.top = `${Math.max(8, top)}px`;
  }

  function hideTooltip() {
    ui.tooltip.classList.remove('is-visible');
  }

  function tooltipHTML(kind, item) {
    const title = kind === 'incident' ? local(item, 'label') : item.title || local(item, 'label') || `${kind}`;
    const rows = [];
    if (kind === 'incident') rows.push([t('timestamp'), isoText(item.timestamp)], [t('category'), item.kind], [t('relation'), item.relation || item.traceId || '-'], [t('precision'), item.evidence?.precision], [t('source'), item.evidence?.publicLabel]);
    else if (kind === 'daemon') rows.push([t('state'), item.state], [t('finished'), timeText(item.finishedAt)], [t('elapsed'), durationText(item.elapsedSeconds)]);
    else if (kind === 'pr') rows.push([t('opened'), timeText(item.openedAt)], [t('evidence'), item.timeEvidence]);
    else if (kind === 'close') rows.push([t('closed'), timeText(item.closedAt)], [t('category'), item.category]);
    else if (kind === 'audit') rows.push([t('started'), timeText(item.requestedAt)], [t('status'), t(item.status)], [t('scope'), item.scope.join(' · ')]);
    else rows.push([t('timestamp'), isoText(item.timestamp)]);
    return `<div class="tl-tooltip-kicker">${escapeHTML(kind)}</div><h4>${escapeHTML(title)}</h4><dl>${rows.map(([k, v]) => `<dt>${escapeHTML(k)}</dt><dd>${escapeHTML(v)}</dd>`).join('')}</dl>`;
  }

  function renderInspector(kind, item) {
    if (!kind && state.selected) ({ kind, item } = resolveSelected());
    if (!kind || !item) {
      ui.inspector.innerHTML = `<div class="tl-inspector-empty"><div><strong>${escapeHTML(t('inspectEmptyTitle'))}</strong>${escapeHTML(t('inspectEmpty'))}</div></div>`;
      return;
    }
    const chips = [], lines = [];
    let title = item.title || local(item, 'label') || kind;
    let link = '';
    if (kind === 'incident') {
      title = local(item, 'label');
      chips.push(item.kind, isoText(item.timestamp), item.evidence?.precision || 'exact');
      lines.push(`${t('basis')}: ${item.evidence?.basis || '-'}`);
      lines.push(`${t('source')}: ${item.evidence?.publicLabel || '-'}`);
      if (item.relation) lines.push(`${t('relation')}: ${item.relation}`);
      if (item.causalNote) lines.push(item.causalNote);
    } else if (kind === 'daemon') {
      chips.push(`${item.repo}#${item.issue}`, item.disposition, item.state, durationText(item.elapsedSeconds));
      lines.push(`${t('started')}: ${timeText(item.startedAt)} · ${t('finished')}: ${timeText(item.finishedAt)}`);
      if (item.errorMessage) lines.push(item.errorMessage);
      const href = safeUrl(item.prUrl);
      if (href) link = `<a class="tl-link" href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(t('openPR'))}</a>`;
    } else if (kind === 'pr') {
      chips.push(`PR #${item.prNumber}`, `${item.repo}#${item.issue}`, `#${item.sequence}/50`);
      lines.push(`${t('opened')}: ${timeText(item.openedAt)}`, `${t('evidence')}: ${item.timeEvidence}`);
      const href = safeUrl(item.prUrl);
      if (href) link = `<a class="tl-link" href="${escapeHTML(href)}" target="_blank" rel="noopener">${escapeHTML(t('openPR'))}</a>`;
    } else if (kind === 'close') {
      chips.push(`${item.repo}#${item.issue}`, item.category);
      lines.push(`${t('closed')}: ${timeText(item.closedAt)}`);
    } else if (kind === 'audit') {
      title = `${t('batch')} ${item.batch} · ${t(item.status)}`;
      chips.push(item.status, ...item.scope);
      lines.push(`${t('started')}: ${timeText(item.requestedAt)}`);
      if (item.completedAt) lines.push(`${t('finished')}: ${timeText(item.completedAt)}`);
      if (local(item, 'outcome')) lines.push(local(item, 'outcome'));
    } else if (kind === 'molt' || kind === 'milestone') {
      title = local(item, 'label');
      chips.push(timeText(item.timestamp));
      if (local(item, 'detail')) lines.push(local(item, 'detail'));
    }
    ui.inspector.innerHTML = `<div class="tl-inspector-content"><div class="tl-inspector-meta">${chips.filter(Boolean).map(ch => `<span class="tl-chip">${escapeHTML(ch)}</span>`).join('')}</div><h3>${escapeHTML(title)}</h3>${lines.filter(Boolean).map(line => `<p>${escapeHTML(line)}</p>`).join('')}${link}</div>`;
  }

  function resolveSelected() {
    if (!state.selected) return {};
    const { kind, id } = state.selected;
    if (kind === 'incident') return { kind, item: data.trace.events.find(x => x.id === id) };
    if (kind === 'daemon') return { kind, item: data.daemons.find(x => eventId(kind, x) === id) };
    if (kind === 'pr') return { kind, item: data.prs.find(x => eventId(kind, x) === id) };
    if (kind === 'close') return { kind, item: data.closes.find(x => eventId(kind, x) === id) };
    if (kind === 'audit') return { kind, item: data.audits.find(x => eventId(kind, x) === id) };
    if (kind === 'molt') return { kind, item: data.molts.find(x => eventId(kind, x) === id) };
    if (kind === 'milestone') return { kind, item: data.milestones.find(x => eventId(kind, x) === id) };
    return {};
  }

  function visibleTraceEvents() {
    return data.trace.events.filter(ev => state.layers[INCIDENT_LAYER[ev.kind]]);
  }

  function renderEventList() {
    const events = visibleTraceEvents();
    if (!events.length) {
      ui.eventList.innerHTML = `<p>${escapeHTML(t('noVisibleEvents'))}</p>`;
      return;
    }
    ui.eventList.innerHTML = `<table><thead><tr><th>${escapeHTML(t('timestamp'))}</th><th>${escapeHTML(t('category'))}</th><th>${escapeHTML(t('relation'))}</th><th>${escapeHTML(t('evidence'))}</th></tr></thead><tbody>${events.map(ev => {
      const selected = state.selected?.kind === 'incident' && state.selected.id === ev.id;
      return `<tr class="${selected ? 'is-selected' : ''}"><td><button type="button" data-incident-id="${escapeHTML(ev.id)}">${escapeHTML(timeText(ev.timestamp))}</button></td><td>${escapeHTML(local(ev, 'label'))}</td><td>${escapeHTML(ev.relation || ev.traceId || '-')}</td><td>${escapeHTML(ev.evidence?.publicLabel || '-')}</td></tr>`;
    }).join('')}</tbody></table>`;
    ui.eventList.querySelectorAll('[data-incident-id]').forEach(button => button.addEventListener('click', () => {
      const item = data.trace.events.find(ev => ev.id === button.dataset.incidentId);
      if (item) select('incident', item, false);
    }));
  }

  function setView(start, end) {
    const fullSpan = state.fullEnd - state.fullStart;
    const minSpan = Math.min(fullSpan, 20 * 1000);
    const span = clamp(end - start, minSpan, fullSpan);
    let s = start, e = start + span;
    if (s < state.fullStart) { s = state.fullStart; e = s + span; }
    if (e > state.fullEnd) { e = state.fullEnd; s = e - span; }
    state.viewStart = s;
    state.viewEnd = e;
    renderAll();
  }

  function zoom(factor, anchor = (state.viewStart + state.viewEnd) / 2) {
    const span = state.viewEnd - state.viewStart;
    const ratio = (anchor - state.viewStart) / span;
    const next = span * factor;
    setView(anchor - next * ratio, anchor + next * (1 - ratio));
  }

  function setPreset(name) {
    if (name === 'all') setView(state.fullStart, state.fullEnd);
    if (name === 'execution') {
      const starts = data.daemons.map(d => asTime(d.startedAt));
      const ends = data.daemons.map(d => asTime(d.finishedAt));
      setView(Math.min(...starts) - 2 * 60000, Math.max(...ends) + 6 * 60000);
    }
    if (name === 'incidents') {
      const times = data.trace.events.map(e => asTime(e.timestamp));
      setView(Math.min(...times) - 3 * 60000, Math.max(...times) + 3 * 60000);
    }
    if (name === 'publication') setView(Date.parse('2026-08-09T04:20:00Z'), state.fullEnd);
  }

  function updatePlaybackVisuals(force = false) {
    if (!ui.playheadLine) return;
    const px = x(state.playhead);
    ui.playheadLine.setAttribute('x1', px);
    ui.playheadLine.setAttribute('x2', px);
    ui.playheadCap.setAttribute('d', `M ${px - 5} 18 L ${px + 5} 18 L ${px} 26 Z`);
    ui.clock.textContent = `${t('playhead')}: ${timeText(state.playhead)}`;
    if (force) {
      state.playbackNodes.forEach(({ node, time }) => {
        node.style.opacity = time <= state.playhead ? '1' : '.28';
      });
    }
  }

  function animate(now) {
    if (!state.playing) return;
    if (!lastFrame) lastFrame = now;
    const delta = Math.min(80, now - lastFrame);
    lastFrame = now;
    state.playhead += delta * state.speed * 18;
    if (state.playhead >= state.fullEnd) {
      state.playhead = state.fullEnd;
      setPlaying(false);
      updatePlaybackVisuals(true);
      return;
    }
    if (state.playhead < state.viewStart || state.playhead > state.viewEnd) {
      const span = state.viewEnd - state.viewStart;
      setView(state.playhead - span * .1, state.playhead + span * .9);
    }
    updatePlaybackVisuals(true);
    raf = requestAnimationFrame(animate);
  }

  function setPlaying(value) {
    state.playing = Boolean(value);
    ui.play.textContent = state.playing ? t('pause') : t('play');
    cancelAnimationFrame(raf);
    lastFrame = 0;
    if (state.playing) {
      if (state.playhead >= state.fullEnd) state.playhead = state.fullStart;
      raf = requestAnimationFrame(animate);
    }
  }

  function bindControls() {
    root.querySelectorAll('[data-lang]').forEach(button => button.addEventListener('click', () => {
      state.lang = button.dataset.lang;
      syncText();
    }));
    root.querySelectorAll('[data-theme-toggle]').forEach(button => button.addEventListener('click', () => {
      state.theme = button.dataset.themeToggle;
      root.dataset.theme = state.theme;
      syncText();
    }));
    root.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => setPreset(button.dataset.preset)));
    ui.play.addEventListener('click', () => setPlaying(!state.playing));
    root.querySelector('[data-action="restart"]').addEventListener('click', () => {
      state.playhead = state.fullStart;
      setView(state.fullStart, state.fullEnd);
      setPlaying(true);
    });
    root.querySelector('[data-action="zoom-in"]').addEventListener('click', () => zoom(.68));
    root.querySelector('[data-action="zoom-out"]').addEventListener('click', () => zoom(1.45));
    root.querySelector('[data-action="focus-incidents"]').addEventListener('click', () => setPreset('incidents'));
    ui.speed.addEventListener('change', () => { state.speed = Number(ui.speed.value) || 1; });

    ui.stage.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = ui.stage.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left - PLOT.left) / Math.max(1, rect.width - PLOT.left - PLOT.right), 0, 1);
      const anchor = state.viewStart + ratio * (state.viewEnd - state.viewStart);
      zoom(event.deltaY > 0 ? 1.18 : .84, anchor);
    }, { passive: false });

    ui.stage.addEventListener('pointerdown', event => {
      if (event.button !== 0 || event.target.closest('.tl-mark-group')) return;
      state.drag = { x: event.clientX, start: state.viewStart, end: state.viewEnd };
      ui.stage.classList.add('is-panning');
      ui.stage.setPointerCapture(event.pointerId);
    });
    ui.stage.addEventListener('pointermove', event => {
      if (!state.drag) return;
      const delta = event.clientX - state.drag.x;
      const plot = Math.max(1, ui.stage.getBoundingClientRect().width - PLOT.left - PLOT.right);
      const shift = -delta / plot * (state.drag.end - state.drag.start);
      setView(state.drag.start + shift, state.drag.end + shift);
    });
    const releaseStage = event => {
      state.drag = null;
      ui.stage.classList.remove('is-panning');
      if (event.pointerId !== undefined && ui.stage.hasPointerCapture(event.pointerId)) ui.stage.releasePointerCapture(event.pointerId);
    };
    ui.stage.addEventListener('pointerup', releaseStage);
    ui.stage.addEventListener('pointercancel', releaseStage);
    ui.stage.addEventListener('keydown', event => {
      const span = state.viewEnd - state.viewStart;
      if (event.key === 'ArrowLeft') { event.preventDefault(); setView(state.viewStart - span * .08, state.viewEnd - span * .08); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); setView(state.viewStart + span * .08, state.viewEnd + span * .08); }
      else if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(.72); }
      else if (event.key === '-') { event.preventDefault(); zoom(1.38); }
      else if (event.key === 'Home') { event.preventDefault(); setView(state.fullStart, state.fullEnd); }
    });

    ui.overview.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      const rect = ui.overview.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left - PLOT.left) / Math.max(1, rect.width - PLOT.left - PLOT.right), 0, 1);
      const center = state.fullStart + ratio * (state.fullEnd - state.fullStart);
      const span = state.viewEnd - state.viewStart;
      state.brushDrag = { span };
      setView(center - span / 2, center + span / 2);
      ui.overview.setPointerCapture(event.pointerId);
    });
    ui.overview.addEventListener('pointermove', event => {
      if (!state.brushDrag) return;
      const rect = ui.overview.getBoundingClientRect();
      const ratio = clamp((event.clientX - rect.left - PLOT.left) / Math.max(1, rect.width - PLOT.left - PLOT.right), 0, 1);
      const center = state.fullStart + ratio * (state.fullEnd - state.fullStart);
      setView(center - state.brushDrag.span / 2, center + state.brushDrag.span / 2);
    });
    const releaseBrush = event => {
      state.brushDrag = null;
      if (event.pointerId !== undefined && ui.overview.hasPointerCapture(event.pointerId)) ui.overview.releasePointerCapture(event.pointerId);
    };
    ui.overview.addEventListener('pointerup', releaseBrush);
    ui.overview.addEventListener('pointercancel', releaseBrush);
  }

  function hash(value) {
    let h = 2166136261;
    for (const ch of String(value)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    return h >>> 0;
  }

  function validate(dataset) {
    const errors = [];
    if (dataset.schemaVersion !== 2) errors.push('schemaVersion');
    if (dataset.daemons?.length !== 103) errors.push('daemons!=103');
    if (dataset.prs?.length !== 50) errors.push('prs!=50');
    if (dataset.closes?.length !== 23) errors.push('closes!=23');
    if (dataset.audits?.length !== 9) errors.push('audits!=9');
    if (dataset.dispatches?.map(x => x.count).join(',') !== '37,33,33') errors.push('dispatches');
    if (dataset.daemons?.filter(x => x.state === 'failed').length !== 4) errors.push('failures!=4');
    if (dataset.trace?.summary?.providerRateLimits !== 32) errors.push('providerRateLimits!=32');
    if (dataset.trace?.summary?.observedHttp429 !== 0) errors.push('observedHttp429!=0');
    if (dataset.trace?.summary?.operationalEvents !== 59) errors.push('operationalEvents!=59');
    if (dataset.trace?.events?.length !== 61) errors.push('plottedEvents!=61');
    if (dataset.trace.events.filter(e => e.kind === 'rate_limit').length !== 32) errors.push('rateLimitEvents!=32');
    if (dataset.trace.events.filter(e => e.kind === 'retry').length !== 23) errors.push('retryEvents!=23');
    if (dataset.trace.events.filter(e => e.kind === 'terminal_failure').length !== 4) errors.push('terminalFailureEvents!=4');
    if (dataset.trace.events.filter(e => e.kind === 'artifact_retained').length !== 2) errors.push('artifactRetainedEvents!=2');
    if (dataset.trace.events.some(e => e.details?.httpStatus === 429)) errors.push('eventMislabelsHttp429');
    if (dataset.recoveries?.some(r => r.mode === 'artifact-salvaged' && r.recoveredAt)) errors.push('artifactRecoveredAtPresent');
    if (errors.length) throw new Error(`timeline-data invariant failed: ${errors.join(', ')}`);
  }

  function showError(error) {
    root.setAttribute('aria-busy', 'false');
    root.innerHTML = `<div class="tl-error"><strong>Timeline data could not be loaded.</strong><p>${escapeHTML(error.message || error)}</p></div>`;
  }

  function boot() {
    try {
      data = loadData();
      validate(data);
      shell();
      configureState();
      populateStats();
      bindControls();
      syncText();
      root.setAttribute('aria-busy', 'false');
      ro = new ResizeObserver(() => renderAll());
      ro.observe(root.querySelector('.tl-overview-wrap'));
      ro.observe(root.querySelector('.tl-stage-wrap'));
    } catch (error) {
      showError(error);
    }
  }

  boot();
})();
