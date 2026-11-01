/* Simulation movie player: play/pause, scrubber mapped to simulation time, speed toggle.
   Markup: <div class="sim-player" data-tmax="1" data-frames="101"><video ...></video></div> */
(function () {
  document.querySelectorAll('.sim-player').forEach(function (box) {
    var v = box.querySelector('video'); if (!v) return;
    var tmax = parseFloat(box.dataset.tmax || '1'), frames = parseInt(box.dataset.frames || '0', 10);
    var bar = document.createElement('div'); bar.className = 'sim-controls';
    bar.innerHTML = '<button type="button" class="pp" aria-label="Play or pause">Pause</button>' +
      '<input type="range" min="0" max="1000" value="0" step="1" aria-label="Simulation time">' +
      '<span class="t" aria-live="off">t = 0.00</span><button type="button" class="rate" aria-label="Playback speed">1×</button>';
    box.appendChild(bar);
    var pp = bar.querySelector('.pp'), rg = bar.querySelector('input'), lab = bar.querySelector('.t'), rate = bar.querySelector('.rate');
    var dragging = false;
    function sync() {
      if (!v.duration) return;
      var f = v.currentTime / v.duration;
      if (!dragging) rg.value = Math.round(f * 1000);
      lab.textContent = 't = ' + (f * tmax).toFixed(2);
      pp.textContent = v.paused ? 'Play' : 'Pause';
    }
    v.addEventListener('timeupdate', sync); v.addEventListener('play', sync); v.addEventListener('pause', sync); v.addEventListener('loadedmetadata', sync);
    pp.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); });
    v.addEventListener('click', function () { if (v.paused) v.play(); else v.pause(); });
    rg.addEventListener('input', function () {
      dragging = true; v.pause();
      var f = rg.value / 1000;
      if (frames > 1 && v.duration) { var k = Math.round(f * (frames - 1)); f = k / (frames - 1); }
      if (v.duration) v.currentTime = Math.min(v.duration - 0.001, f * v.duration);
      lab.textContent = 't = ' + (f * tmax).toFixed(2);
    });
    rg.addEventListener('change', function () { dragging = false; });
    var rates = [1, 0.5, 0.25], ri = 0;
    rate.addEventListener('click', function () { ri = (ri + 1) % rates.length; v.playbackRate = rates[ri]; rate.textContent = rates[ri] + '×'; });
    if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { v.removeAttribute('autoplay'); v.pause(); }
  });
})();
