/* zesen.me site layer: animated field-line hero, scroll reveals, publication filter, CV section index. */
(function () {
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- hero: magnetic field lines carrying solitary Alfvénic kinks ---------- */
  var cv = document.querySelector('.hero-canvas');
  if (cv && cv.getContext) {
    var ctx = cv.getContext('2d'), W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var NL = 15, solitons = [], rings = [], last = 0, lastSpawn = 0, seen = true;
    function size() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(x, y, dir, amp) {
      solitons.push({ x: x, y: y, v: (dir || (Math.random() < 0.5 ? -1 : 1)) * (55 + Math.random() * 35),
        a: amp || (14 + Math.random() * 16), w: 34 + Math.random() * 26, h: 46 + Math.random() * 40, life: 0 });
      if (solitons.length > 9) solitons.shift();
    }
    var stars = [];
    function seedStars() { stars = []; for (var i = 0; i < Math.round(W * H / 5200); i++) stars.push([Math.random() * W, Math.random() * H, Math.random() * 1.1 + 0.3, Math.random() * 6.28]); }
    function chart(ts) {
      var cx = W * 0.5, cy = H * 1.32, R = Math.max(W, H), rot = reduce ? 0 : ts * 0.000012;
      ctx.save(); ctx.lineWidth = 1;
      [0.46, 0.74, 1.02, 1.36].forEach(function (f, k) {
        ctx.beginPath(); ctx.arc(cx, cy, H * f * 1.15 + k * 40, 0, 6.2832);
        ctx.setLineDash(k === 2 ? [3, 7] : []); ctx.strokeStyle = 'rgba(226,198,130,' + (k === 2 ? 0.1 : 0.075) + ')'; ctx.stroke();
      });
      ctx.setLineDash([]); ctx.strokeStyle = 'rgba(226,198,130,0.055)';
      for (var a = 0; a < 28; a++) {
        var th = rot + a * 6.2832 / 28, r0 = H * 0.46 * 1.15;
        ctx.beginPath(); ctx.moveTo(cx + r0 * Math.cos(th), cy + r0 * Math.sin(th)); ctx.lineTo(cx + R * 1.6 * Math.cos(th), cy + R * 1.6 * Math.sin(th)); ctx.stroke();
      }
      for (var i = 0; i < stars.length; i++) {
        var st = stars[i], tw = reduce ? 0.7 : 0.55 + 0.45 * Math.sin(ts * 0.0012 + st[3]);
        ctx.fillStyle = 'rgba(236,227,204,' + (0.5 * tw).toFixed(3) + ')'; ctx.fillRect(st[0], st[1], st[2], st[2]);
      }
      ctx.restore();
    }
    function seedInitial() { for (var i = 0; i < 4; i++) spawn(Math.random() * W, H * (0.2 + Math.random() * 0.6), i % 2 ? 1 : -1); }
    function disp(x, y) {
      var d = 0, gold = 0;
      for (var i = 0; i < solitons.length; i++) {
        var s = solitons[i], u = (x - s.x) / s.w, q = (y - s.y) / s.h;
        if (Math.abs(u) > 4 || Math.abs(q) > 3) continue;
        var e = 1 / Math.cosh(u), f = Math.exp(-q * q), k = s.a * e * e * f * Math.min(1, s.life * 1.5);
        d += k; gold += Math.abs(k);
      }
      return [d, gold];
    }
    function frame(ts) {
      var dt = Math.min(0.05, (ts - (last || ts)) / 1000); last = ts;
      if (!seen) { requestAnimationFrame(frame); return; }
      ctx.clearRect(0, 0, W, H);
      chart(ts);
      for (var i = solitons.length - 1; i >= 0; i--) {
        var s = solitons[i]; s.x += s.v * dt; s.life += dt;
        if (s.x < -200 || s.x > W + 200) solitons.splice(i, 1);
      }
      for (i = 0; i < solitons.length; i++) for (var j = i + 1; j < solitons.length; j++) {
        var A = solitons[i], B = solitons[j];
        if (A.v * B.v < 0 && Math.abs(A.x - B.x) < 6 && Math.abs(A.y - B.y) < (A.h + B.h) * 0.6 && !A['c' + j]) {
          A['c' + j] = 1; rings.push({ x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, r: 4, a: 0.55 });
        }
      }
      if (solitons.length < 4 && ts - lastSpawn > 1800) { spawn(Math.random() < 0.5 ? -100 : W + 100, H * (0.15 + Math.random() * 0.7)); lastSpawn = ts; }
      for (i = rings.length - 1; i >= 0; i--) {
        var r = rings[i]; r.r += 90 * dt; r.a -= 0.28 * dt;
        if (r.a <= 0) { rings.splice(i, 1); continue; }
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(226,198,130,' + r.a.toFixed(3) + ')'; ctx.lineWidth = 1.4; ctx.stroke();
      }
      var step = Math.max(6, W / 220);
      for (var l = 0; l < NL; l++) {
        var y0 = H * (l + 0.5) / NL;
        ctx.beginPath();
        var hot = 0;
        for (var x = -10; x <= W + 10; x += step) {
          var dd = disp(x, y0), y = y0 - dd[0];
          hot = Math.max(hot, dd[1]);
          if (x <= -10) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        var g = Math.min(1, hot / 20);
        ctx.strokeStyle = 'rgba(' + Math.round(150 + 76 * g) + ',' + Math.round(175 + 23 * g) + ',' + Math.round(230 - 100 * g) + ',' + (0.12 + 0.45 * g).toFixed(3) + ')';
        ctx.lineWidth = 1 + 0.6 * g; ctx.stroke();
      }
      if (!reduce) requestAnimationFrame(frame);
    }
    size(); seedStars(); seedInitial();
    window.addEventListener('resize', function () { size(); seedStars(); });
    var hero = cv.parentElement;
    hero.addEventListener('pointermove', function (e) {
      var now = performance.now(); if (now - lastSpawn < 380) return; lastSpawn = now;
      var b = cv.getBoundingClientRect(); spawn(e.clientX - b.left, e.clientY - b.top, e.movementX < 0 ? -1 : 1, 18 + Math.random() * 10);
    });
    hero.addEventListener('pointerdown', function (e) {
      var b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
      spawn(x - 30, y, 1, 30); spawn(x + 30, y, -1, 30);
    });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }).observe(cv);
    if (reduce) { for (var t = 0; t < 60; t++) solitons.forEach(function (s) { s.life = 1; }); frame(performance.now()); }
    else requestAnimationFrame(frame);
  }

  /* ---------- scroll reveals ---------- */
  if (!reduce && 'IntersectionObserver' in window) {
    var els = document.querySelectorAll('.post-content .wp-caption, .topic, .stat, .focus-card, .sw, .misc-card, .news li, .cv-row, .reflist li');
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el, i) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight * 0.95) return;
      el.classList.add('reveal'); el.style.transitionDelay = ((i % 4) * 60) + 'ms'; io.observe(el);
    });
  }

  /* ---------- publications: live search and filters ---------- */
  var pf = document.querySelector('.pub-filter');
  if (pf) {
    var q = pf.querySelector('input'), chips = pf.querySelectorAll('button'), count = pf.querySelector('.pf-count');
    var groups = document.querySelectorAll('[data-pubgroup]'), kind = 'all';
    function apply() {
      var term = q.value.trim().toLowerCase(), n = 0;
      groups.forEach(function (g) {
        var show = kind === 'all' || g.dataset.pubgroup === kind, any = 0;
        g.querySelectorAll('li').forEach(function (li) {
          var ok = show && (!term || li.textContent.toLowerCase().indexOf(term) >= 0);
          li.hidden = !ok; if (ok) { any++; n++; }
        });
        var h = g.previousElementSibling; g.hidden = !any; if (h && h.tagName === 'H2') h.hidden = !any;
      });
      count.textContent = n + (n === 1 ? ' work' : ' works');
    }
    q.addEventListener('input', apply);
    chips.forEach(function (c) { c.addEventListener('click', function () {
      kind = c.dataset.kind; chips.forEach(function (o) { o.setAttribute('aria-pressed', o === c); }); apply(); }); });
    apply();
  }

  /* ---------- CV: sticky section index ---------- */
  var cvpage = document.querySelector('.cv .post-content');
  if (cvpage) {
    var hs = cvpage.querySelectorAll('h2'), nav = document.createElement('nav');
    nav.className = 'cv-toc no-print'; nav.setAttribute('aria-label', 'CV sections');
    hs.forEach(function (h, i) {
      h.id = h.id || 'cv-' + i;
      var a = document.createElement('a'); a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/:.*$/, '').replace(/\b\w/g, function (c) { return c; });
      nav.appendChild(a);
    });
    cvpage.insertBefore(nav, cvpage.firstChild);
    if ('IntersectionObserver' in window) {
      var links = nav.querySelectorAll('a');
      var ob = new IntersectionObserver(function (en) {
        en.forEach(function (e) { if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); }); });
      }, { rootMargin: '-20% 0px -70% 0px' });
      hs.forEach(function (h) { ob.observe(h); });
    }
  }
})();
