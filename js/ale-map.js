/* ALE astronomy star map: taxonomy (7 arXiv categories -> 32 areas -> 71 research directions) as a radial chart.
   Each direction is a ray: length = open problems harvested, gold base = strong RSI seeds, pale band = possible seeds.
   Data: /data/ale-map.json (written by _src/make_ale_map.py). No dependencies. */
(function () {
  var NS = 'http://www.w3.org/2000/svg';
  var COLORS = {
    'astro-ph.CO': '#7fa8ff', 'astro-ph.EP': '#58d6a9', 'astro-ph.GA': '#c4a0ff', 'astro-ph.HE': '#ff7f91',
    'astro-ph.IM': '#66d1ec', 'astro-ph.SR': '#ffae66', 'physics.space-ph': '#b6e86f'
  };
  var GOLD = '#ffe08a';
  var R = { core: 92, catIn: 108, catOut: 146, areaIn: 154, areaOut: 170, ray0: 186, rayLen: 236 };

  function el(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function pol(r, a) { return [r * Math.cos(a), r * Math.sin(a)]; }
  function arc(r0, r1, a0, a1) {
    var large = (a1 - a0) > Math.PI ? 1 : 0, p0 = pol(r1, a0), p1 = pol(r1, a1), p2 = pol(r0, a1), p3 = pol(r0, a0);
    return 'M' + p0 + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + p1 + 'L' + p2 +
      'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + p3 + 'Z';
  }
  function fmt(n) { return n.toLocaleString('en-US'); }
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }

  function render(box, D) {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var svg = el('svg', { viewBox: '-640 -560 1280 1120', role: 'img', 'aria-label':
      'Star map of the Agent Last Exam astronomy taxonomy: ' + D.directions + ' research directions in ' + D.areas +
      ' areas and 7 arXiv categories, with ' + fmt(D.problems) + ' open problems and ' + (D.strong + D.possible) +
      ' RSI task seeds' });
    var defs = el('defs', {}, svg);
    var g0 = el('radialGradient', { id: 'ale-sky', cx: '0', cy: '0', r: '760', gradientUnits: 'userSpaceOnUse' }, defs);
    el('stop', { offset: '0', 'stop-color': '#16304d' }, g0);
    el('stop', { offset: '0.55', 'stop-color': '#0c1b2e' }, g0);
    el('stop', { offset: '1', 'stop-color': '#070f1b' }, g0);
    var glow = el('filter', { id: 'ale-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    el('feGaussianBlur', { stdDeviation: '3.2', result: 'b' }, glow);
    var m = el('feMerge', {}, glow); el('feMergeNode', { in: 'b' }, m); el('feMergeNode', { in: 'SourceGraphic' }, m);
    el('rect', { x: -640, y: -560, width: 1280, height: 1120, fill: 'url(#ale-sky)' }, svg);
    var stars = el('g', { opacity: '0.7' }, svg), rand = rng(20261031);
    for (var i = 0; i < 220; i++) {
      el('circle', { cx: (rand() * 1280 - 640).toFixed(1), cy: (rand() * 1120 - 560).toFixed(1),
        r: (rand() * 1.1 + 0.2).toFixed(2), fill: '#cfe3ff', opacity: (rand() * 0.6 + 0.15).toFixed(2) }, stars);
    }
    [R.ray0 + R.rayLen * 0.25, R.ray0 + R.rayLen * 0.5, R.ray0 + R.rayLen * 0.75, R.ray0 + R.rayLen].forEach(function (r) {
      el('circle', { r: r, fill: 'none', stroke: '#9fc3ff', 'stroke-opacity': '0.1', 'stroke-dasharray': '2 5' }, svg);
    });

    var maxP = 0;
    D.cats.forEach(function (c) { c.areas.forEach(function (a) { a.dirs.forEach(function (d) { maxP = Math.max(maxP, d.p); }); }); });
    var gapCat = 1.6, gapArea = 0.35, slots = 0;
    D.cats.forEach(function (c, ci) { c.areas.forEach(function (a, ai) { slots += a.dirs.length + (ai ? gapArea : 0); }); slots += gapCat; });
    var unit = 2 * Math.PI / slots, ang = -Math.PI / 2 + unit * gapCat / 2;
    var scale = R.rayLen / maxP;
    var layers = { cat: el('g', {}, svg), area: el('g', {}, svg), rays: el('g', {}, svg), labels: el('g', {}, svg) };
    var catGroups = [], rays = [];

    D.cats.forEach(function (c) {
      var col = COLORS[c.code] || '#ccc', a0 = ang;
      var cg = { code: c.code, nodes: [] };
      c.areas.forEach(function (a, ai) {
        if (ai) ang += unit * gapArea;
        var b0 = ang;
        a.dirs.forEach(function (d) {
          var mid = ang + unit / 2, w = unit * 0.62;
          var g = el('g', { class: 'ale-ray', tabindex: '-1' }, layers.rays);
          var tip = R.ray0 + d.p * scale;
          var line = el('line', { x1: pol(R.ray0, mid)[0], y1: pol(R.ray0, mid)[1], x2: pol(tip, mid)[0], y2: pol(tip, mid)[1],
            stroke: col, 'stroke-width': '1.6', 'stroke-linecap': 'round', opacity: '0.9' }, g);
          var sq = el('path', { d: arc(R.ray0, R.ray0 + (d.s + d.q) * scale, mid - w / 2, mid + w / 2), fill: col, opacity: '0.45' }, g);
          var ss = el('path', { d: arc(R.ray0, R.ray0 + d.s * scale, mid - w / 2, mid + w / 2), fill: GOLD }, g);
          var dot = el('circle', { cx: pol(tip, mid)[0], cy: pol(tip, mid)[1], r: 2.6 + d.s * 0.45, fill: '#fff', filter: 'url(#ale-glow)' }, g);
          el('circle', { cx: pol(tip, mid)[0], cy: pol(tip, mid)[1], r: 1.6 + d.s * 0.3, fill: col }, g);
          el('path', { d: arc(R.ray0 - 4, R.ray0 + R.rayLen + 14, ang, ang + unit), fill: 'transparent' }, g);
          var t = el('title', {}, g);
          t.textContent = d.name + ' (' + a.name + '): ' + d.p + ' open problems, ' + d.s + ' strong and ' + d.q + ' possible seeds';
          var rec = { g: g, line: line, parts: [sq, ss], dot: dot, mid: mid, tip: tip, cat: c, area: a, d: d, col: col };
          rays.push(rec); cg.nodes.push(g);
          ang += unit;
        });
        var ap = el('path', { d: arc(R.areaIn, R.areaOut, b0 + unit * 0.06, ang - unit * 0.06), fill: col, opacity: '0.5', class: 'ale-area' }, layers.area);
        var at = el('title', {}, ap);
        at.textContent = a.name + (a.iau ? ' [IAU ' + a.iau + ']' : '') + ': ' + a.dirs.length + ' directions';
        ap._rec = { cat: c, area: a, col: col }; cg.nodes.push(ap);
      });
      var a1 = ang;
      var cp = el('path', { d: arc(R.catIn, R.catOut, a0, a1), fill: col, opacity: '0.85', class: 'ale-cat' }, layers.cat);
      cp._code = c.code; cg.nodes.push(cp);
      var mid = (a0 + a1) / 2, lr = R.ray0 + R.rayLen + 34, p = pol(lr, mid);
      var cos = Math.cos(mid), sin = Math.sin(mid), anchor = Math.abs(cos) < 0.3 ? 'middle' : (cos > 0 ? 'start' : 'end');
      var lines = c.short.length > 12 && c.short.indexOf(' & ') > 0 ? [c.short.split(' & ')[0] + ' &', c.short.split(' & ')[1]] : [c.short];
      var y0 = p[1] + (sin < -0.3 ? -(lines.length * 24) : (sin > 0.3 ? 8 : -(lines.length * 12)));
      lines.forEach(function (ln, li) {
        var tx = el('text', { x: p[0].toFixed(1), y: (y0 + li * 24 + 10).toFixed(1), 'text-anchor': anchor, 'dominant-baseline': 'middle',
          fill: col, 'font-size': '22', 'font-weight': '600', 'font-family': 'Avenir Next, Helvetica Neue, Arial, sans-serif' }, layers.labels);
        tx.textContent = ln; cg.nodes.push(tx);
      });
      var tx2 = el('text', { x: p[0].toFixed(1), y: (y0 + lines.length * 24 + 8).toFixed(1), 'text-anchor': anchor, 'dominant-baseline': 'middle',
        fill: '#9fb4cc', 'font-size': '14', 'font-family': 'Menlo, monospace' }, layers.labels);
      tx2.textContent = c.code;
      cg.nodes.push(tx2);
      catGroups.push(cg);
      ang += unit * gapCat;
    });

    el('circle', { r: R.core, fill: '#0a1626', stroke: '#9fc3ff', 'stroke-opacity': '0.25' }, svg);
    var ct = el('g', { 'text-anchor': 'middle', 'font-family': 'Avenir Next, Helvetica Neue, Arial, sans-serif' }, svg);
    var big = el('text', { y: '-6', fill: '#fff', 'font-size': '40', 'font-weight': '600' }, ct); big.textContent = fmt(D.problems);
    var s1 = el('text', { y: '20', fill: '#9fb4cc', 'font-size': '14' }, ct); s1.textContent = 'open problems';
    var s2 = el('text', { y: '44', fill: GOLD, 'font-size': '14' }, ct); s2.textContent = (D.strong + D.possible) + ' seeds · ' + D.strong + ' strong';

    box.innerHTML = '';
    box.appendChild(svg);
    var tip = document.createElement('div'); tip.className = 'ale-tip'; tip.hidden = true; box.appendChild(tip);

    function setCenter(a, b, c) { big.textContent = a; s1.textContent = b; s2.textContent = c; }
    function resetCenter() { setCenter(fmt(D.problems), 'open problems', (D.strong + D.possible) + ' seeds · ' + D.strong + ' strong'); }
    var focus = null;
    function applyFocus() {
      catGroups.forEach(function (cg) {
        var on = !focus || cg.code === focus;
        cg.nodes.forEach(function (n) { n.style.opacity = on ? '' : '0.13'; });
      });
      legend.querySelectorAll('button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.code === focus ? 'true' : 'false'); });
      if (focus) {
        var c = D.cats.filter(function (x) { return x.code === focus; })[0], p = 0, s = 0, q = 0, n = 0;
        c.areas.forEach(function (a) { p += a.p; s += a.s; q += a.q; a.dirs.forEach(function (d) { p += d.p; s += d.s; q += d.q; n++; }); });
        setCenter(fmt(p), c.short, (s + q) + ' seeds · ' + s + ' strong');
      } else resetCenter();
    }
    function showTip(html, evt) {
      tip.innerHTML = html; tip.hidden = false;
      var b = box.getBoundingClientRect(), x = evt.clientX - b.left, y = evt.clientY - b.top;
      var w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(b.width - w - 8, x + 14)) + 'px';
      tip.style.top = Math.max(8, Math.min(b.height - h - 8, y + 14)) + 'px';
    }
    rays.forEach(function (r) {
      function on(e) {
        r.line.setAttribute('stroke-width', '3.4'); r.dot.setAttribute('r', String(4.5 + r.d.s * 0.5));
        showTip('<b>' + r.d.name + '</b><span class="zh">' + r.d.zh + '</span><div class="k">' + r.area.name +
          (r.area.iau ? ' · IAU ' + r.area.iau : '') + '</div><div class="k">' + r.cat.short + ' · ' + r.cat.code + '</div>' +
          '<div class="n"><span>' + r.d.p + '</span> open problems</div><div class="n"><span class="g">' + r.d.s +
          '</span> strong · <span>' + r.d.q + '</span> possible seeds</div>', e);
      }
      function off() { r.line.setAttribute('stroke-width', '1.6'); r.dot.setAttribute('r', String(2.6 + r.d.s * 0.45)); tip.hidden = true; }
      r.g.addEventListener('mousemove', on); r.g.addEventListener('mouseleave', off);
      r.g.addEventListener('click', function (e) { on(e); e.stopPropagation(); });
    });
    svg.querySelectorAll('.ale-area').forEach(function (ap) {
      var x = ap._rec;
      ap.addEventListener('mousemove', function (e) {
        var p = x.area.p, s = x.area.s, q = x.area.q;
        x.area.dirs.forEach(function (d) { p += d.p; s += d.s; q += d.q; });
        showTip('<b>' + x.area.name + '</b><span class="zh">' + x.area.zh + '</span><div class="k">' + x.cat.short +
          (x.area.iau ? ' · IAU ' + x.area.iau : '') + ' · ' + x.area.dirs.length + ' directions</div>' +
          '<div class="n"><span>' + p + '</span> open problems</div><div class="n"><span class="g">' + s + '</span> strong · <span>' +
          q + '</span> possible seeds</div>', e);
      });
      ap.addEventListener('mouseleave', function () { tip.hidden = true; });
    });
    svg.querySelectorAll('.ale-cat').forEach(function (cp) {
      cp.style.cursor = 'pointer';
      cp.addEventListener('click', function (e) { focus = focus === cp._code ? null : cp._code; applyFocus(); e.stopPropagation(); });
    });
    svg.addEventListener('click', function () { tip.hidden = true; if (focus) { focus = null; applyFocus(); } });

    var legend = document.createElement('div'); legend.className = 'ale-legend';
    D.cats.forEach(function (c) {
      var b = document.createElement('button'); b.type = 'button'; b.dataset.code = c.code; b.setAttribute('aria-pressed', 'false');
      b.innerHTML = '<i style="background:' + COLORS[c.code] + '"></i>' + c.short;
      b.addEventListener('click', function () { focus = focus === c.code ? null : c.code; applyFocus(); });
      legend.appendChild(b);
    });
    var key = document.createElement('div'); key.className = 'ale-key';
    key.innerHTML = '<span><i class="ray"></i>ray length = open problems</span><span><i class="gold"></i>strong RSI seeds</span>' +
      '<span><i class="pale"></i>possible RSI seeds</span><span><i class="dot"></i>brighter star = more strong seeds</span>';
    box.appendChild(legend); box.appendChild(key);

    if (!reduce && 'IntersectionObserver' in window) {
      var shown = false;
      rays.forEach(function (r) { r.g.style.transformOrigin = '0px 0px'; r.g.style.transform = 'scale(0.55)'; r.g.style.opacity = '0'; });
      var grow = function () {
        if (shown) return; shown = true; io.disconnect();
        svg.getBoundingClientRect();
        rays.forEach(function (r, i) {
          r.g.style.transition = 'transform 900ms cubic-bezier(.2,.8,.2,1) ' + (i * 12) + 'ms, opacity 600ms ease ' + (i * 12) + 'ms';
          r.g.style.transform = ''; r.g.style.opacity = '';
        });
      };
      var io = new IntersectionObserver(function (ents) { if (ents[0].isIntersecting) setTimeout(grow, 30); }, { threshold: 0.2 });
      io.observe(svg);
      setTimeout(grow, 2500);
    }
  }

  document.querySelectorAll('[data-ale-map]').forEach(function (box) {
    fetch(box.getAttribute('data-ale-map')).then(function (r) { return r.json(); })
      .then(function (D) { render(box, D); })
      .catch(function () { box.textContent = 'The interactive map could not load.'; });
  });
})();
