/* Where I've Been (/travel/ and /wen/travel/): charts and tables over data/travel/*.json.
   The drawing code comes from a claude.ai dashboard; `dash` below is a small stand-in for that runtime:
   each drawing records which datasets and params it read, and runs again when one of them changes. */
(function () {
  'use strict';
  const root = document.querySelector('.tv-page');
  if (!root) return;

  const WEN = document.documentElement.lang === 'lzh';
  const SERIES = getComputedStyle(root).getPropertyValue('--tv-series').trim() || '#f0c566';
  const T = WEN ? {
    loading: '载入中…', failed: '载入未成', allYears: '诸年', disputed: '有争之地',
    year: (y) => y + '年', items: (n) => n + '件', days: (n) => n + '日', adm2: (n) => '二级行政区' + n,
    block: (s) => '（' + s + '°格）', sep: '：',
    regionAria: '世界图，示照片、影片所记之行政区', blockAria: '世界图，示照片、影片所记之定格', barAria: '逐年件数之柱图',
  } : {
    loading: 'Loading…', failed: 'Failed to load', allYears: 'All years', disputed: 'Disputed area',
    year: (y) => String(y),
    items: (n) => n + (n === '1' ? ' item' : ' items'), days: (n) => n + (n === '1' ? ' day' : ' days'), adm2: (n) => n + ' second-level regions',
    block: (s) => '(' + s + '° block)', sep: ': ',
    regionAria: 'World map of regions with geotagged photos and videos', blockAria: 'World map of fixed blocks with geotagged photos and videos', barAria: 'Bar chart of geotagged items per year',
  };
  const COUNTRY_WEN = {
    'United States': '美国', China: '中国', Japan: '日本', Italy: '意大利', 'United Kingdom': '英国', Egypt: '埃及',
    Australia: '澳大利亚', France: '法国', Switzerland: '瑞士', 'Türkiye': '土耳其', Greece: '希腊',
    'Macao SAR, China': '中国澳门', 'Hong Kong SAR, China': '中国香港', Thailand: '泰国', Taiwan: '台湾',
    'Vatican City': '梵蒂冈', Unknown: '未详', Qatar: '卡塔尔', Canada: '加拿大',
  };
  const countryName = (c) => (WEN && COUNTRY_WEN[c]) || c;

  /* ---------- stand-in for the dashboard runtime ---------- */
  const sets = new Map(), calcs = new Map(), drawers = new Map(), watchers = [], state = {}, dirty = new Set();
  let reading = null, scheduled = false;

  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    let done = false;
    const flush = () => {
      if (done) return;
      done = true;
      scheduled = false;
      watchers.forEach((fn) => fn());
      const names = [...dirty];
      dirty.clear();
      names.forEach(run);
    };
    requestAnimationFrame(flush);
    setTimeout(flush, 250); // frames stop in a background tab
  };
  const touch = (key) => {
    for (const [name, d] of drawers) if (d.deps.has(key)) dirty.add(name);
    schedule();
  };
  const run = (name) => {
    const d = drawers.get(name), deps = new Set();
    reading = deps;
    try {
      // the document, not root: build.py moves the page header (the summary sentence) into the hero band
      document.querySelectorAll(`[data-draw="${name}"]`).forEach((el) => d.fn(el));
    } catch (err) {
      console.error('travel: drawing ' + name + ' failed', err); // the other drawings still run
    } finally {
      reading = null;
      d.deps = deps;
    }
  };
  // shared with js/travel-sky.js, so each file downloads once
  const requests = {};
  const tvRows = window.tvRows = (id) => requests[id] || (requests[id] = fetch('/data/travel/' + id + '.json').then((r) => {
    if (!r.ok) throw new Error(id + ': HTTP ' + r.status);
    return r.json();
  }));
  const load = (id) => {
    if (sets.has(id)) return;
    sets.set(id, {status: 'loading', data: []});
    tvRows(id)
      .then((rows) => sets.set(id, {status: 'ok', data: rows}), () => sets.set(id, {status: 'error', data: []}))
      .then(() => touch(id));
  };
  const dash = {
    colors: [SERIES],
    data(id) {
      if (reading) reading.add(id);
      if (calcs.has(id)) {
        const c = calcs.get(id), inputs = c.inputs.map((i) => dash.data(i));
        if (inputs.every((g) => g.status === 'ok')) return {status: 'ok', data: c.fn(...inputs.map((g) => g.data))};
        return {status: inputs.some((g) => g.status === 'error') ? 'error' : 'loading', data: []};
      }
      load(id);
      return sets.get(id);
    },
    calc(id, c) {
      calcs.set(id, c);
    },
    draw(name, fn) {
      if (fn) drawers.set(name, {fn, deps: new Set()});
      else run(name);
    },
    onData(fn) {
      watchers.push(fn);
    },
    params() {
      return new Proxy(state, {
        get(t, k) {
          if (reading) reading.add('param:' + String(k));
          return t[k];
        },
      });
    },
    setParams(p) {
      Object.assign(state, p);
      if ('year' in p) document.dispatchEvent(new CustomEvent('tv:year', {detail: p.year}));
      Object.keys(p).forEach((k) => touch('param:' + k));
    },
  };

  /* ---------- summary ---------- */
  const fmt = d3.format(',');

  dash.calc('top_share', {
    inputs: ['countries', 'summary'],
    fn: (countries, summary) => [{share: Math.round(countries[0].items / summary[0].items * 100) + '%'}],
  });

  const value = (el, id, pick) => {
    const g = dash.data(id);
    el.textContent = g.status === 'ok' && g.data.length ? pick(g.data[0]) : '—';
  };
  const summaryDraws = {
    items: 'items', countriesTile: 'countries', adm1Tile: 'adm1', adm2Tile: 'adm2', daysTile: 'days',
    photosTile: 'photos', videosTile: 'videos', inferred: 'inferred_fuji',
  };
  for (const [name, field] of Object.entries(summaryDraws)) {
    dash.draw(name, (el) => value(el, 'summary', (r) => fmt(Number(r[field]))));
  }
  dash.draw('firstYear', (el) => value(el, 'summary', (r) => String(r.first_year)));
  dash.draw('lastYear', (el) => value(el, 'summary', (r) => String(r.last_year)));
  dash.draw('topCountry', (el) => value(el, 'countries', (r) => countryName(r.country)));
  dash.draw('topShare', (el) => value(el, 'top_share', (r) => r.share));

  const failed = (el, ids) => {
    if (!ids.some((id) => dash.data(id).status === 'error')) return false;
    el.textContent = T.failed;
    return true;
  };

  const showTip = (box, tip, x, y, lines) => {
    tip.replaceChildren(...lines.map((t) => {
      const d = document.createElement('div');
      d.textContent = t;
      return d;
    }));
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(0, Math.min(box.clientWidth - w, x + 12)) + 'px';
    tip.style.top = (y - h - 10 < 0 ? y + 12 : y - h - 10) + 'px';
  };

  /* ---------- filters ---------- */
  const selectedYear = () => {
    const y = dash.params().year;
    return y === null || y === undefined || y === '' ? null : Number(y);
  };
  const selectedLevel = () => (Number(dash.params().level ?? 2) === 1 ? 1 : 2);
  const blockSizes = () => {
    const g = dash.data('grid_stats');
    return g.status === 'ok' ? g.data.map((r) => String(r.size).replace('°', '')) : [];
  };
  const selectedSize = () => {
    const sizes = blockSizes(), want = String(dash.params().blockSize ?? '0.1') === '0.5' ? '0.5' : '0.1';
    return sizes.length && !sizes.includes(want) ? sizes[0] : want;
  };

  root.querySelectorAll('.tv-level').forEach((sel) => {
    sel.addEventListener('change', () => dash.setParams({level: Number(sel.value)}));
  });
  root.querySelectorAll('.tv-block-size').forEach((sel) => {
    sel.addEventListener('change', () => dash.setParams({blockSize: sel.value}));
  });
  dash.onData(() => {
    const many = blockSizes().length !== 1;
    root.querySelectorAll('.tv-level').forEach((sel) => {
      sel.value = String(selectedLevel());
    });
    root.querySelectorAll('.tv-block-size').forEach((sel) => {
      sel.value = selectedSize();
      sel.hidden = !many;
    });
    root.querySelectorAll('.tv-if-sizes').forEach((el) => {
      el.hidden = !many;
    });
  });

  dash.draw('year', (sel) => {
    const g = dash.data('years');
    const years = g.status === 'ok' ? g.data : [];
    sel.replaceChildren(new Option(T.allYears, ''), ...years.map((r) => new Option(T.year(r.year), String(r.year))));
    sel.value = selectedYear() === null ? '' : String(selectedYear());
    sel.onchange = () => dash.setParams({year: sel.value ? Number(sel.value) : null});
  });

  /* ---------- maps ---------- */
  const TOP = 78, BOTTOM = -58;
  const mercY = (lat) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, lat)) * Math.PI / 360));
  const shade = (max) => d3.scaleLog([1, Math.max(2, max)], [0.22, 1]).clamp(true);
  const zooms = {regions: d3.zoomIdentity, blocks: d3.zoomIdentity}, zoomWidths = {regions: 0, blocks: 0};
  // lines stay a fixed pixel width, so a small map needs thinner ones or dense countries turn into dark clumps
  const fineness = (geo) => Math.min(1, geo.W / 900);
  let base = null;

  const geometry = (W) => {
    const k = W / (2 * Math.PI);
    return {
      W, H: Math.round(k * (mercY(TOP) - mercY(BOTTOM))),
      px: (lon) => (lon + 180) / 360 * W,
      py: (lat) => k * (mercY(TOP) - mercY(lat)),
    };
  };

  const pathOf = (lines, {px, py}, close) => {
    const path = d3.path();
    for (const line of lines) {
      line.forEach(([lon, lat], i) => {
        if (i && Math.abs(lon - line[i - 1][0]) <= 180) path.lineTo(px(lon), py(lat));
        else path.moveTo(px(lon), py(lat));
      });
      if (close) path.closePath();
    }
    return path.toString();
  };

  const baseLayers = (geo, withSecond) => {
    if (!base || base.width !== geo.W) {
      base = {width: geo.W};
      base.land = pathOf(dash.data('land').data.map((r) => r.ring).filter((ring) => d3.max(ring, (c) => c[1]) >= BOTTOM), geo, true);
      const lines = (rows, level) => pathOf(rows.filter((b) => Number(b.level) === level).flatMap((b) => b.rings), geo, false);
      const boundaries = dash.data('boundaries').data;
      base.country = lines(boundaries, 0);
      base.adm1 = lines(boundaries, 1);
      base.disputed = dash.data('disputed').data.map((a) => ({name: a.name, note: a.note, d: pathOf(a.rings, geo, true)}));
    }
    if (withSecond && !base.adm2) {
      base.adm2 = pathOf(dash.data('boundaries2').data.flatMap((b) => b.rings), geo, false);
    }
    return base;
  };

  const drawMap = (el, name, geo, withSecond, ariaLabel, drawMarks) => {
    const layers = baseLayers(geo, withSecond);
    if (zoomWidths[name] && zoomWidths[name] !== geo.W) {
      const r = geo.W / zoomWidths[name], t = zooms[name];
      zooms[name] = d3.zoomIdentity.translate(t.x * r, t.y * r).scale(t.k);
    }
    zoomWidths[name] = geo.W;
    const fine = fineness(geo);
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${geo.W} ${geo.H}`)
      .attr('role', 'img').attr('aria-label', ariaLabel);
    const g = svg.append('g');
    g.append('path').attr('d', layers.land).attr('fill-rule', 'evenodd').style('fill', 'var(--tv-land)');

    const tip = document.createElement('div');
    tip.className = 'tv-tip';
    tip.hidden = true;
    el.append(tip);
    const place = (event, lines) => {
      const b = el.getBoundingClientRect();
      showTip(el, tip, event.clientX - b.left, event.clientY - b.top, lines);
    };

    const onZoom = drawMarks(g, tip, place);

    const lineLayer = g.append('g').style('fill', 'none').style('pointer-events', 'none');
    const addLines = (d, color, width) => lineLayer.append('path').attr('d', d)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('stroke', color).style('stroke-width', width).style('stroke-linejoin', 'round');
    const second = withSecond ? addLines(layers.adm2, 'var(--tv-axis)', 0.5 * fine) : null;
    const first = addLines(layers.adm1, 'var(--tv-line)', 0.75 * fine);
    addLines(layers.country, 'var(--tv-line)', Math.max(0.5, 1.25 * fine));

    const disputedLayer = g.append('g').style('fill', 'none');
    disputedLayer.selectAll('path.line').data(layers.disputed).join('path').attr('class', 'line')
      .attr('d', (d) => d.d).attr('vector-effect', 'non-scaling-stroke')
      .style('stroke', 'var(--tv-line)').style('stroke-width', 1.25).style('stroke-dasharray', '4 3')
      .style('pointer-events', 'none');
    disputedLayer.selectAll('path.hit').data(layers.disputed).join('path').attr('class', 'hit')
      .attr('d', (d) => d.d).attr('vector-effect', 'non-scaling-stroke')
      .style('stroke', 'transparent').style('stroke-width', 10).style('pointer-events', 'stroke')
      .on('pointermove', (event, d) => place(event, d.note ? [d.name, d.note] : [d.name, T.disputed]))
      .on('pointerleave', () => {
        tip.hidden = true;
      });

    const apply = (t) => {
      g.attr('transform', t);
      if (onZoom) onZoom(t);
      if (second) second.style('stroke-opacity', Math.min(1, 0.3 + 0.2 * t.k));
      first.style('stroke-opacity', Math.min(1, 0.35 + 0.25 * t.k));
    };
    const zoom = d3.zoom().scaleExtent([1, 120]).translateExtent([[0, 0], [geo.W, geo.H]]).extent([[0, 0], [geo.W, geo.H]])
      .on('start', () => lineLayer.attr('visibility', 'hidden'))
      .on('zoom', (event) => {
        zooms[name] = event.transform;
        apply(event.transform);
        tip.hidden = true;
      })
      .on('end', () => lineLayer.attr('visibility', 'visible'));
    svg.call(zoom);
    svg.call(zoom.transform, zooms[name]);
    lineLayer.attr('visibility', 'visible');
    apply(zooms[name]);
  };

  const allLoaded = (el, ids) => {
    if (failed(el, ids)) return false;
    if (ids.some((id) => dash.data(id).status !== 'ok')) {
      el.textContent = T.loading;
      return false;
    }
    return true;
  };

  const yearLabel = () => (selectedYear() === null ? T.allYears : T.year(selectedYear()));
  const countLines = (d) => [yearLabel() + T.sep + T.items(fmt(d.items)), T.days(fmt(d.days))];

  const regionTotals = (rows) => {
    const year = selectedYear(), level = selectedLevel();
    const totals = new Map();
    for (const r of rows) {
      if (Number(r.level) !== level || (year !== null && Number(r.year) !== year)) continue;
      const t = totals.get(r.id) || {id: r.id, region: r.region, items: 0, days: 0, lat: r.lat, lon: r.lon};
      t.items += Number(r.items);
      t.days += Number(r.days);
      totals.set(r.id, t);
    }
    return totals;
  };
  const regionMax = (rows) => {
    const level = selectedLevel();
    const byId = d3.rollup(rows.filter((r) => Number(r.level) === level), (v) => d3.sum(v, (r) => Number(r.items)), (r) => r.id);
    return d3.max(byId.values()) || 1;
  };

  dash.draw('regionMap', (el) => {
    if (!allLoaded(el, ['regions', 'shapes', 'land', 'boundaries', 'boundaries2', 'disputed'])) return;
    const geo = geometry(el.clientWidth);
    const level = selectedLevel();
    const rows = dash.data('regions').data;
    const totals = regionTotals(rows);
    const opacity = shade(regionMax(rows));
    const drawn = dash.data('shapes').data
      .filter((s) => Number(s.level) === level && totals.has(s.id))
      .map((s) => ({...totals.get(s.id), d: pathOf(s.rings, geo, true)}));
    const dots = [...totals.values()].filter((t) => t.lat !== undefined && t.lat !== null && t.lat !== '')
      .map((t) => ({...t, x: geo.px(Number(t.lon)), y: geo.py(Number(t.lat))}));

    drawMap(el, 'regions', geo, level === 2, T.regionAria, (g, tip, place) => {
      const hover = (sel) => sel
        .on('pointermove', function (event, d) {
          d3.select(this).style('stroke', 'var(--ink)');
          place(event, [d.region, ...countLines(d)]);
        })
        .on('pointerleave', function () {
          d3.select(this).style('stroke', SERIES);
          tip.hidden = true;
        });
      g.append('g').selectAll('path').data(drawn).join('path')
        .attr('d', (d) => d.d).attr('fill-rule', 'evenodd').attr('vector-effect', 'non-scaling-stroke')
        .style('fill', SERIES).style('fill-opacity', (d) => opacity(d.items))
        .style('stroke', SERIES).style('stroke-width', 0.75 * fineness(geo))
        .call(hover);
      const circles = g.append('g').selectAll('circle').data(dots).join('circle')
        .attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('vector-effect', 'non-scaling-stroke')
        .style('fill', SERIES).style('fill-opacity', (d) => opacity(d.items))
        .style('stroke', SERIES).style('stroke-width', 1)
        .call(hover);
      return (t) => circles.attr('r', 4 / t.k);
    });
  });

  const blockRows = () => {
    const size = selectedSize();
    return dash.data('block_years').data.filter((r) => String(r.size) === size);
  };
  const blockMax = (rows) => {
    const byCell = d3.rollup(rows, (v) => d3.sum(v, (r) => Number(r.items)), (r) => r.lat + ',' + r.lon);
    return d3.max(byCell.values()) || 1;
  };
  const edge = (v, pos, neg) => Math.abs(v).toFixed(1) + '°' + (v >= 0 ? pos : neg);

  dash.draw('blockMap', (el) => {
    if (!allLoaded(el, ['block_years', 'land', 'boundaries', 'disputed'])) return;
    const geo = geometry(el.clientWidth);
    const size = Number(selectedSize());
    const year = selectedYear();
    const rows = blockRows();
    const opacity = shade(blockMax(rows));
    const cells = new Map();
    for (const r of rows) {
      if (year !== null && Number(r.year) !== year) continue;
      const key = r.lat + ',' + r.lon;
      const c = cells.get(key) || {lat: Number(r.lat), lon: Number(r.lon), place: r.place, items: 0, days: 0};
      c.items += Number(r.items);
      c.days += Number(r.days);
      cells.set(key, c);
    }
    const drawn = [...cells.values()].sort((a, b) => a.items - b.items);

    drawMap(el, 'blocks', geo, false, T.blockAria, (g, tip, place) => {
      g.append('g').selectAll('rect').data(drawn).join('rect')
        .attr('x', (d) => geo.px(d.lon)).attr('width', (d) => geo.px(d.lon + size) - geo.px(d.lon))
        .attr('y', (d) => geo.py(d.lat + size)).attr('height', (d) => geo.py(d.lat) - geo.py(d.lat + size))
        .attr('vector-effect', 'non-scaling-stroke')
        .style('fill', SERIES).style('fill-opacity', (d) => opacity(d.items))
        .style('stroke', SERIES).style('stroke-width', 0.75 * fineness(geo))
        .on('pointermove', function (event, d) {
          d3.select(this).style('stroke', 'var(--ink)');
          place(event, [d.place, `${edge(d.lat, 'N', 'S')}, ${edge(d.lon, 'E', 'W')} ${T.block(selectedSize())}`, ...countLines(d)]);
        })
        .on('pointerleave', function () {
          d3.select(this).style('stroke', SERIES);
          tip.hidden = true;
        });
      return null;
    });
  });

  const drawScale = (el, max) => {
    const opacity = shade(max);
    const swatches = document.createElement('span');
    swatches.className = 'tv-swatches';
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const i = document.createElement('i');
      i.style.background = SERIES;
      i.style.opacity = opacity(Math.pow(max, t));
      swatches.append(i);
    }
    const low = document.createElement('span');
    low.textContent = T.items('1');
    const high = document.createElement('span');
    high.textContent = T.items(fmt(max));
    el.replaceChildren(low, swatches, high);
  };
  dash.draw('regionScale', (el) => {
    const g = dash.data('regions');
    if (g.status === 'ok') drawScale(el, regionMax(g.data));
    else el.textContent = '—';
  });
  dash.draw('blockScale', (el) => {
    if (dash.data('block_years').status === 'ok') drawScale(el, blockMax(blockRows()));
    else el.textContent = '—';
  });

  /* ---------- years ---------- */
  dash.draw('yearBars', (el) => {
    const g = dash.data('years');
    if (failed(el, ['years'])) return;
    if (g.status !== 'ok') {
      el.textContent = T.loading;
      return;
    }
    const rows = g.data.map((r) => ({year: Number(r.year), items: Number(r.items), days: Number(r.days), adm2: Number(r.adm2)}));
    const all = d3.range(d3.min(rows, (r) => r.year), d3.max(rows, (r) => r.year) + 1);
    const W = el.clientWidth, H = 176;
    el.replaceChildren();
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`)
      .attr('role', 'img').attr('aria-label', T.barAria);
    const y0 = d3.scaleLinear([0, d3.max(rows, (r) => r.items)], [H - 22, 8]).nice();
    const ticks = y0.ticks(3);
    const labels = svg.append('g').selectAll('text').data(ticks).join('text').attr('class', 'tv-tick')
      .attr('x', 0).attr('y', (t) => y0(t) + 4).text((t) => fmt(t));
    const left = d3.max(labels.nodes(), (n) => n.getComputedTextLength()) + 8;
    const x = d3.scaleBand(all, [left, W]).padding(0.18);
    svg.insert('g', ':first-child').selectAll('line').data(ticks).join('line')
      .attr('x1', left).attr('x2', W).attr('y1', (t) => y0(t)).attr('y2', (t) => y0(t))
      .style('stroke', (t) => (t === 0 ? 'var(--tv-axis)' : 'var(--tv-grid)'));
    const step = Math.max(1, Math.ceil(all.length * 44 / (W - left)));
    svg.append('g').selectAll('text').data(all.filter((yr) => (yr - all[all.length - 1]) % step === 0)).join('text')
      .attr('class', 'tv-tick').attr('text-anchor', 'middle')
      .attr('x', (yr) => x(yr) + x.bandwidth() / 2).attr('y', H - 4).text((yr) => String(yr));
    const picked = selectedYear();
    svg.append('g').selectAll('rect').data(rows).join('rect')
      .attr('x', (r) => x(r.year) + Math.max(0, (x.bandwidth() - 32) / 2)).attr('width', Math.min(32, x.bandwidth()))
      .attr('y', (r) => y0(r.items)).attr('height', (r) => Math.max(1, y0(0) - y0(r.items))).attr('rx', 2)
      .style('fill', (r) => (picked === null || picked === r.year ? SERIES : 'var(--tv-faded)'));
    const tip = document.createElement('div');
    tip.className = 'tv-tip';
    tip.hidden = true;
    el.append(tip);
    svg.append('g').selectAll('rect').data(rows).join('rect').attr('class', 'hit')
      .attr('x', (r) => x(r.year) - x.step() * x.paddingInner() / 2).attr('width', x.step())
      .attr('y', 0).attr('height', H - 22).style('fill', 'transparent')
      .on('click', (event, r) => dash.setParams({year: picked === r.year ? null : r.year}))
      .on('pointermove', (event, r) => {
        const b = el.getBoundingClientRect();
        showTip(el, tip, event.clientX - b.left, event.clientY - b.top, [
          T.year(r.year), T.items(fmt(r.items)), T.days(fmt(r.days)), T.adm2(fmt(r.adm2)),
        ]);
      })
      .on('pointerleave', () => {
        tip.hidden = true;
      });
  });

  /* ---------- tables ---------- */
  const fillRows = (body, rows, cells, leftAt) => {
    body.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr');
      cells(r).forEach((text, i) => {
        const td = document.createElement('td');
        td.textContent = text;
        if (i === leftAt) td.className = 'tv-left';
        tr.append(td);
      });
      return tr;
    }));
  };
  const totalsRow = (name) => (r) => [name(r), fmt(Number(r.items)), fmt(Number(r.days)), r.first, r.last];
  const searchFor = (name) => (root.querySelector(`.tv-search[data-table="${name}"]`)?.value || '').trim().toLowerCase();

  dash.draw('countriesTable', (body) => {
    const g = dash.data('countries');
    fillRows(body, g.status === 'ok' ? g.data : [], totalsRow((r) => countryName(r.country)));
  });
  for (const [name, id] of [['adm1Table', 'adm1'], ['adm2Table', 'adm2']]) {
    dash.draw(name, (body) => {
      const g = dash.data(id);
      const q = searchFor(name);
      const rows = g.status === 'ok' ? g.data : [];
      fillRows(body, q ? rows.filter((r) => r.region.toLowerCase().includes(q)) : rows, totalsRow((r) => r.region));
    });
  }
  dash.draw('gridStatsTable', (body) => {
    const g = dash.data('grid_stats');
    fillRows(body, g.status === 'ok' ? g.data : [], (r) => [
      r.size, fmt(Number(r.blocks)), fmt(Number(r.km2)), fmt(Number(r.blocks_50)), fmt(Number(r.blocks_90)), r.top_share, fmt(Number(r.singles)),
    ]);
  });
  dash.draw('blocksTable', (body) => {
    const g = dash.data('blocks');
    const q = searchFor('blocksTable');
    const size = selectedSize();
    const rows = (g.status === 'ok' ? g.data : []).filter((r) => String(r.size) === size)
      .filter((r) => !q || r.place.toLowerCase().includes(q) || r.block.toLowerCase().includes(q));
    fillRows(body, rows, (r) => [r.block, r.place, fmt(Number(r.items)), fmt(Number(r.days)), fmt(Number(r.km2))], 1);
  });
  root.querySelectorAll('.tv-search').forEach((input) => {
    input.addEventListener('input', () => dash.draw(input.dataset.table));
  });

  /* ---------- start, and redraw the charts when the page width changes ---------- */
  drawers.forEach((d, name) => run(name));
  watchers.forEach((fn) => fn());

  let width = root.clientWidth, timer = 0;
  new ResizeObserver(() => {
    if (root.clientWidth === width) return;
    width = root.clientWidth;
    clearTimeout(timer);
    timer = setTimeout(() => {
      ['yearBars', 'regionMap', 'blockMap'].forEach((n) => dirty.add(n));
      schedule();
    }, 200);
  }).observe(root);
})();
