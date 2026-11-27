// ANIMUSCULT — shared VHS frame: film grain, arrival fade, channel-change links.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Film layers
  const mk = (cls, tag = 'div') => { const el = document.createElement(tag); el.className = 'vhs-layer ' + cls; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); return el; };
  mk('vhs-vignette'); mk('vhs-scan'); mk('vhs-roll');
  const cut = document.createElement('div'); cut.className = 'vhs-cut'; document.body.appendChild(cut);

  // Grain: a small noise canvas scaled up, redrawn ~12 times a second
  const c = mk('vhs-grain', 'canvas');
  const W = 480, H = 270; c.width = W; c.height = H;
  const g = c.getContext('2d'); const img = g.createImageData(W, H);
  const draw = () => {
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
    g.putImageData(img, 0, 0);
  };
  draw();
  if (!reduced) { let t = 0; const loop = (now) => { if (now - t > 83 && !document.hidden) { draw(); t = now; } requestAnimationFrame(loop); }; requestAnimationFrame(loop); }

  // Arrival
  document.body.classList.add('is-arriving');
  setTimeout(() => document.body.classList.remove('is-arriving'), 700);

  // Channel change: any link with data-channel plays the tape cut, then goes
  window.VHS_GO = (href) => {
    if (document.body.classList.contains('is-leaving')) return;
    document.body.classList.add('is-leaving');
    setTimeout(() => { location.href = href; }, reduced ? 380 : 720);
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-channel]');
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault(); window.VHS_GO(a.getAttribute('href'));
  });
  // Coming back with the browser's back button: clear the cut
  addEventListener('pageshow', (e) => { if (e.persisted) document.body.classList.remove('is-leaving'); });
})();
