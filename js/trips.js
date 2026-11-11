/* /travel/trips/: the road trips as one map and one list (data/travel/trips.json, written by _src/make_trips_data.py).
   Everything is projected once to Web-Mercator unit coordinates; pan and zoom are a canvas transform (d3.zoom). */
(() => {
  const root = document.querySelector('.trips');
  if (!root || !window.d3) return;
  const zh = document.documentElement.lang === 'lzh';
  const still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const nf = new Intl.NumberFormat('en-US');
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const T = zh ? {
    all: '诸游', pick: '择一游于右，或点图中之路。拖之可移，滚轮或两指可缩放。', allDays: '全程',
    days: (n) => n + '日', miles: (n) => nf.format(n) + '英里', media: (n) => nf.format(n) + '照',
    photos: (p, v) => (p ? '照片' + nf.format(p) : '') + (p && v ? '，' : '') + (v ? '影片' + nf.format(v) : ''),
    sub: (t) => `${range(t)}　${t.days}日　约${nf.format(t.miles)}英里`,
    places: '所至：', la: '洛杉矶', fail: '图未能载入，请重载此页。', off: '（在此图之外）',
  } : {
    all: 'All trips', pick: 'Pick a trip from the list, or click a road. Drag to pan, and scroll or pinch to zoom.', allDays: 'Whole trip',
    days: (n) => n + (n === 1 ? ' day' : ' days'), miles: (n) => nf.format(n) + ' mi', media: (n) => nf.format(n) + ' photos',
    photos: (p, v) => [p ? nf.format(p) + (p === 1 ? ' photo' : ' photos') : '', v ? nf.format(v) + (v === 1 ? ' video' : ' videos') : ''].filter(Boolean).join(', '),
    sub: (t) => `${range(t)}. ${t.days} ${t.days === 1 ? 'day' : 'days'} with photos, about ${nf.format(t.miles)} miles.`,
    places: 'Places: ', la: 'Los Angeles', fail: 'The map could not load. Reload the page to try again.', off: ' (outside this view)',
  };
  const ymd = (s) => s.split('-').map(Number);
  function dayLabel(s) {
    const [y, m, d] = ymd(s);
    return zh ? `${m}月${d}日` : `${MONTHS[m - 1]} ${d}`;
  }
  function range(t) {
    const [y1, m1, d1] = ymd(t.start), [y2, m2, d2] = ymd(t.end);
    if (zh) {
      if (t.start === t.end) return `${y1}年${m1}月${d1}日`;
      if (y1 !== y2) return `${y1}年${m1}月${d1}日至${y2}年${m2}月${d2}日`;
      return m1 === m2 ? `${y1}年${m1}月${d1}日至${d2}日` : `${y1}年${m1}月${d1}日至${m2}月${d2}日`;
    }
    if (t.start === t.end) return `${MONTHS[m1 - 1]} ${d1}, ${y1}`;
    if (y1 !== y2) return `${MONTHS[m1 - 1]} ${d1}, ${y1} – ${MONTHS[m2 - 1]} ${d2}, ${y2}`;
    return m1 === m2 ? `${MONTHS[m1 - 1]} ${d1}–${d2}, ${y1}` : `${MONTHS[m1 - 1]} ${d1} – ${MONTHS[m2 - 1]} ${d2}, ${y1}`;
  }

  // Web Mercator on the unit square
  const ux = (lon) => (lon + 180) / 360;
  const uy = (lat) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2;
  const unit = (p) => [ux(p[0]), uy(p[1])];
  const WEST = [[-125.5, 31.2], [-103.5, 49.6]]; // where most of the trips are

  const canvas = root.querySelector('.trips-canvas'), ctx = canvas.getContext('2d');
  const stage = root.querySelector('.trips-stage'), tip = root.querySelector('.trips-tip');
  const nowEl = root.querySelector('.trips-now'), subEl = root.querySelector('.trips-sub');
  const allBtn = root.querySelector('.trips-all'), daysEl = root.querySelector('.trips-days');
  const placesEl = root.querySelector('.trips-places'), listEl = root.querySelector('.trips-list');
  const C = {land: '#15243f', coast: 'rgba(163,177,200,.34)', state: 'rgba(163,177,200,.2)', country: 'rgba(163,177,200,.5)',
    road: 'rgba(226,198,130,.5)', dim: 'rgba(226,198,130,.13)', hot: '#fff3c8', glow: 'rgba(240,197,102,.75)',
    stop: 'rgba(240,197,102,.92)', faint: 'rgba(240,197,102,.24)', ink: '#ece6d6', night: '#060c1c', ash: '#a3b1c8'};

  let W = 0, H = 0, dpr = 1, tf = d3.zoomIdentity, trips = [], home = null, landPath, statePath, countryPath;
  let sel = null, day = null, hoverTrip = null, hoverStop = null, ready = false, frame = 0;

  const zoom = d3.zoom().on('zoom', (e) => { tf = e.transform; hideTip(); schedule(); });
  const sc = d3.select(canvas).call(zoom).on('dblclick.zoom', null);

  function path(lines, close) {
    const p = new Path2D();
    for (const line of lines) {
      for (let i = 0; i < line.length; i++) { const [x, y] = line[i]; if (i) p.lineTo(x, y); else p.moveTo(x, y); }
      if (close) p.closePath();
    }
    return p;
  }
  function boundsOf(points) {
    let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (const [x, y] of points) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    return [x0, y0, x1, y1];
  }
  function fit(b, animate) {
    const pad = Math.min(W, H) * 0.1 + 14;
    const dx = Math.max(b[2] - b[0], 2e-4), dy = Math.max(b[3] - b[1], 2e-4);
    const k = Math.min((W - 2 * pad) / dx, (H - 2 * pad) / dy);
    const t = d3.zoomIdentity.translate(W / 2 - k * (b[0] + b[2]) / 2, H / 2 - k * (b[1] + b[3]) / 2).scale(k);
    (animate && !still ? sc.transition().duration(1100) : sc).call(zoom.transform, t);
  }
  const westBounds = () => boundsOf(WEST.map(unit));

  function resize() {
    const r = stage.getBoundingClientRect();
    if (!r.width) return;
    const first = !W;
    const cx = W ? tf.invertX(W / 2) : 0, cy = W ? tf.invertY(H / 2) : 0, k0 = tf.k / (W || 1);
    W = r.width; H = r.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    zoom.scaleExtent([W * 1.2, W * 6000]);
    if (!ready) return;
    if (first) fit(sel ? sel.bounds : westBounds(), false);
    else sc.call(zoom.transform, d3.zoomIdentity.translate(W / 2 - k0 * W * cx, H / 2 - k0 * W * cy).scale(k0 * W));
    schedule();
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(() => { frame = 0; draw(); }); }

  function draw() {
    if (!ready) return;
    const k = tf.k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(tf.x, tf.y); ctx.scale(k, k);
    ctx.lineJoin = ctx.lineCap = 'round';
    ctx.fillStyle = C.land; ctx.fill(landPath);
    ctx.lineWidth = 1 / k; ctx.strokeStyle = C.coast; ctx.stroke(landPath);
    ctx.lineWidth = 0.8 / k; ctx.strokeStyle = C.state; ctx.stroke(statePath);
    ctx.lineWidth = 1.1 / k; ctx.strokeStyle = C.country; ctx.stroke(countryPath);
    for (const t of trips) {
      if (t === sel || t === hoverTrip) continue;
      ctx.lineWidth = 1.25 / k; ctx.strokeStyle = sel ? C.dim : C.road; ctx.stroke(t.path);
    }
    const lit = sel || hoverTrip;
    if (lit) {
      ctx.shadowColor = C.glow; ctx.shadowBlur = 9;
      ctx.lineWidth = 2.3 / k; ctx.strokeStyle = C.hot; ctx.stroke(lit.path);
      ctx.shadowBlur = 0;
    }
    ctx.restore();

    const sx = (p) => p[0] * k + tf.x, sy = (p) => p[1] * k + tf.y;
    // Los Angeles: where the roads are cut
    const hx = sx(home), hy = sy(home);
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, 6.2832); ctx.fillStyle = C.night; ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = C.hot; ctx.stroke();
    const boxes = [];
    label(T.la, hx, hy, 8, boxes, C.ash);

    if (sel) {
      const shown = sel.stops.slice().sort((a, b) => (a.d === day) - (b.d === day));
      for (const s of shown) {
        const on = !day || s.d === day;
        ctx.beginPath(); ctx.arc(sx(s.u), sy(s.u), s.r, 0, 6.2832);
        ctx.fillStyle = on ? C.stop : C.faint; ctx.fill();
        if (on) { ctx.lineWidth = 1; ctx.strokeStyle = C.night; ctx.stroke(); }
      }
      if (hoverStop) {
        ctx.beginPath(); ctx.arc(sx(hoverStop.u), sy(hoverStop.u), hoverStop.r + 3, 0, 6.2832);
        ctx.lineWidth = 1.5; ctx.strokeStyle = C.hot; ctx.stroke();
      }
      for (const g of placeGroups(sel, day).slice(0, 12)) label(g.name, sx(g.u), sy(g.u), g.r + 4, boxes, C.ink);
    }
  }
  // a name beside its dot, skipped if it would cover an earlier one or leave the map
  function label(text, x, y, off, boxes, color) {
    ctx.font = (zh ? '13px "Noto Serif SC", "Songti SC", serif' : '600 12.5px "Avenir Next", Avenir, "Segoe UI", "Helvetica Neue", Arial, sans-serif');
    const short = text.split(', ')[0], w = ctx.measureText(short).width;
    for (const side of [1, -1]) {
      const bx = side > 0 ? x + off : x - off - w, box = [bx - 3, y - 9, bx + w + 3, y + 9];
      if (box[0] < 2 || box[2] > W - 2 || box[1] < 2 || box[3] > H - 2) continue;
      if (boxes.some((b) => box[0] < b[2] && box[2] > b[0] && box[1] < b[3] && box[3] > b[1])) continue;
      boxes.push(box);
      ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(6,12,28,.9)'; ctx.strokeText(short, bx, y);
      ctx.fillStyle = color; ctx.fillText(short, bx, y);
      return;
    }
  }
  // stops of a trip (or of one of its days) merged by name, busiest first
  function placeGroups(t, d) {
    const by = new Map();
    for (const s of t.stops) {
      if (d && s.d !== d) continue;
      const g = by.get(s.n) || {name: s.n, n: 0, u: s.u, r: s.r, top: 0};
      g.n += s.ph + s.v;
      if (s.ph + s.v > g.top) { g.top = s.ph + s.v; g.u = s.u; g.r = s.r; }
      by.set(s.n, g);
    }
    return [...by.values()].sort((a, b) => b.n - a.n);
  }

  function choose(t, d, opts) {
    const changed = t !== sel;
    sel = t; day = t && d && t.dayList.includes(d) ? d : null; hoverTrip = hoverStop = null; hideTip();
    nowEl.textContent = t ? t.title : T.all;
    subEl.textContent = t ? T.sub(t) : T.pick;
    allBtn.hidden = !t;
    listEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(!!t && b.dataset.id === t.id)));
    daysEl.hidden = placesEl.hidden = !t;
    if (t) {
      if (changed) {
        daysEl.replaceChildren();
        const mk = (text, value) => {
          const b = document.createElement('button');
          b.type = 'button'; b.textContent = text; b.dataset.day = value;
          b.addEventListener('click', () => choose(sel, value));
          daysEl.appendChild(b);
        };
        if (t.dayList.length > 1) { mk(T.allDays, ''); t.dayList.forEach((x) => mk(dayLabel(x), x)); }
        daysEl.hidden = t.dayList.length < 2;
      }
      daysEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.day === (day || ''))));
      const names = placeGroups(t, day).map((g) => g.name.split(', ')[0]);
      placesEl.textContent = T.places + [...new Set(names)].slice(0, 14).join(zh ? '、' : ', ') + (zh ? '。' : '.');
      if (opts !== 'keep') {
        const pts = day ? t.stops.filter((s) => s.d === day).map((s) => s.u) : null;
        fit(pts && pts.length ? boundsOf(pts) : t.bounds, true);
      }
    } else if (opts !== 'keep') fit(westBounds(), true);
    try { history.replaceState(null, '', t ? '#' + t.id : location.pathname); } catch (e) {}
    schedule();
  }

  // ---- pointer ----
  function nearest(mx, my) {
    const k = tf.k, px = (mx - tf.x) / k, py = (my - tf.y) / k;
    if (sel) {
      let best = null, bd = 14;
      for (const s of sel.stops) {
        if (day && s.d !== day) continue;
        const d = Math.hypot((s.u[0] - px) * k, (s.u[1] - py) * k) - s.r;
        if (d < bd) { bd = d; best = s; }
      }
      if (best) return {stop: best};
    }
    let bt = null, bd = 9 / k;
    for (const t of trips) {
      const b = t.bounds;
      if (px < b[0] - bd || px > b[2] + bd || py < b[1] - bd || py > b[3] + bd) continue;
      for (const line of t.lines) {
        for (let i = 1; i < line.length; i++) {
          const ax = line[i - 1][0], ay = line[i - 1][1], dx = line[i][0] - ax, dy = line[i][1] - ay;
          const q = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1e-18)));
          const d = Math.hypot(px - ax - q * dx, py - ay - q * dy);
          if (d < bd || (d === bd && t === sel)) { bd = d; bt = t; }
        }
      }
    }
    return bt ? {trip: bt} : null;
  }
  function showTip(html, mx, my) {
    tip.replaceChildren(...html.map((line) => { const d = document.createElement('div'); d.textContent = line; return d; }));
    tip.hidden = false;
    const w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(4, Math.min(W - w - 4, mx + 14)) + 'px';
    tip.style.top = Math.max(4, my - h - 10 < 4 ? my + 16 : my - h - 10) + 'px';
  }
  function hideTip() { tip.hidden = true; }
  function at(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener('pointermove', (e) => {
    if (!ready || e.buttons) return;
    const [mx, my] = at(e), hit = nearest(mx, my);
    const ht = hit && hit.trip && hit.trip !== sel ? hit.trip : null, hs = hit && hit.stop ? hit.stop : null;
    canvas.style.cursor = ht || hs ? 'pointer' : '';
    if (hs) showTip([hs.n, dayLabel(hs.d), T.photos(hs.ph, hs.v)], mx, my);
    else if (ht) showTip([ht.title, range(ht)], mx, my);
    else hideTip();
    if (ht !== hoverTrip || hs !== hoverStop) { hoverTrip = ht; hoverStop = hs; schedule(); }
  });
  canvas.addEventListener('pointerleave', () => { hideTip(); if (hoverTrip || hoverStop) { hoverTrip = hoverStop = null; schedule(); } });
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { down = at(e); });
  canvas.addEventListener('click', (e) => {
    const [mx, my] = at(e);
    if (!ready || (down && Math.hypot(mx - down[0], my - down[1]) > 5)) return; // that was a drag
    const hit = nearest(mx, my);
    if (hit && hit.trip && hit.trip !== sel) choose(hit.trip, null);
    else if (hit && hit.stop) { choose(sel, day === hit.stop.d ? null : hit.stop.d, 'keep'); showTip([hit.stop.n, dayLabel(hit.stop.d), T.photos(hit.stop.ph, hit.stop.v)], mx, my); }
  });
  allBtn.addEventListener('click', () => choose(null));

  // ---- list ----
  function buildList() {
    let year = null, group = null;
    for (const t of trips.slice().reverse()) {
      const y = t.start.slice(0, 4);
      if (y !== year) {
        year = y;
        const h = document.createElement('h3'); h.textContent = y; listEl.appendChild(h);
        group = document.createElement('div'); group.className = 'trips-year'; listEl.appendChild(group);
      }
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'trip'; b.dataset.id = t.id; b.setAttribute('aria-pressed', 'false');
      const add = (cls, text) => { const s = document.createElement('span'); s.className = cls; s.textContent = text; b.appendChild(s); };
      add('trip-title', t.title);
      add('trip-when', range(t));
      add('trip-num', T.days(t.days)); add('trip-num', T.miles(t.miles)); add('trip-num', T.media(t.photos + t.videos));
      b.addEventListener('click', () => {
        choose(sel === t ? null : t, null);
        if (window.matchMedia('(max-width: 900px)').matches) root.querySelector('.trips-mapcard').scrollIntoView({behavior: still ? 'auto' : 'smooth', block: 'start'});
      });
      group.appendChild(b);
    }
  }

  Promise.all(['trips', 'trips-base'].map((n) => fetch('/data/travel/' + n + '.json').then((r) => { if (!r.ok) throw new Error(n + ' ' + r.status); return r.json(); })))
    .then(([data, base]) => {
      home = unit(data.home);
      trips = data.trips.map((t) => {
        const lines = t.routes.map((r) => r.map(unit));
        const stops = t.stops.map((s) => ({...s, u: unit(s.p), r: Math.min(10, 2.6 + Math.sqrt(s.ph + s.v) * 0.42)}));
        const pts = lines.flat().concat(stops.map((s) => s.u)).filter((p) => p[0] !== home[0] || p[1] !== home[1]);
        return {...t, lines, stops, path: path(lines, false), bounds: boundsOf(pts.length ? pts : [home]), dayList: [...new Set(stops.map((s) => s.d))].sort()};
      });
      landPath = path(base.land.map((r) => r.map(unit)), true);
      statePath = path(base.borders.filter((b) => b[1] === 1).map((b) => b[0].map(unit)), false);
      countryPath = path(base.borders.filter((b) => b[1] === 0).map((b) => b[0].map(unit)), false);
      const sum = (f) => trips.reduce((a, t) => a + f(t), 0);
      const vals = {count: trips.length, first: trips[0].start.slice(0, 4), days: nf.format(sum((t) => t.days)),
        miles: nf.format(Math.round(sum((t) => t.miles) / 100) * 100), media: nf.format(sum((t) => t.photos + t.videos)), homekm: data.home_km};
      document.querySelectorAll('[data-trip]').forEach((el) => { if (el.dataset.trip in vals) el.textContent = vals[el.dataset.trip]; });
      buildList();
      ready = true; root.classList.add('trips-ready');
      const want = trips.find((t) => '#' + t.id === location.hash);
      resize();
      if (want) choose(want, null); else { fit(westBounds(), false); schedule(); }
    })
    .catch((err) => { console.error('trips:', err); root.querySelector('.trips-load').textContent = T.fail; });

  if (window.ResizeObserver) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);
})();
