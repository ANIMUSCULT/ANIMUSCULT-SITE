// OUIJA CAT MUSIC MACHINE — page: skins, lights, SoundCloud, controls.
(() => {
  const E = window.OC_ENGINE, SKINS = window.OC_SKINS;
  const $ = (id) => document.getElementById(id);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';
  const W = 2000, H = 1120, RES = .5; // lights canvas at half the image size

  // ---------------- state ----------------
  const S = {
    skin: 1, widget: null, sounds: [], index: -1, playing: false, pos: 0, posAt: 0, dur: 0,
    map: null, title: 'OUIJA CAT MUSIC MACHINE', timeScale: 1, tapeHeld: false,
    beat: 0, beatAt: 0, lowAvg: .2, flareAt: 0, lastFlash: 0, glitchUntil: 0, monad: 0, powered: false,
  };
  // nothing bright flashes more than ~3 times a second
  const flashOK = () => { const n = performance.now(); if (n - S.lastFlash < 340) return false; S.lastFlash = n; return true; };

  // ---------------- stage fit ----------------
  const stage = $('stage'), skinImg = $('skin'), cv = $('lights'), g = cv.getContext('2d');
  cv.width = W * RES; cv.height = H * RES;
  let fit = { s: 1, x: 0, y: 0 };
  const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
  function layout() {
    const vw = innerWidth, vh = innerHeight, deckH = document.querySelector('.deck').offsetHeight;
    let s, x, y;
    if (vw / vh < 1) { // portrait: the whole machine, above the deck
      s = vw / W; x = 0; y = Math.max(navH() + 64, (vh - deckH - H * s) / 2);
    } else { // landscape: fill the screen
      s = Math.max(vw / W, vh / H); x = (vw - W * s) / 2; y = (vh - H * s) / 2;
      // keep the machine's own controls (down to about y 975 in the image) above the deck
      // (any gap this leaves at the bottom sits behind the deck)
      const skn = SKINS[S.skin];
      if (skn && (skn.hots || skn.play)) y = Math.min(y, Math.max(vh - deckH - H * s, (vh - deckH) - 975 * s));
    }
    fit = { s, x, y };
    const tf = `translate(${x}px, ${y}px) scale(${s})`;
    stage.style.transform = tf; stage.style.setProperty('--tf', tf);
  }
  addEventListener('resize', layout);

  // ---------------- skins ----------------
  const hots = $('hots');
  const skinVid = $('skinVid');
  const ACTIONS = {
    toggle: () => togglePlay(), play: () => { if (!S.playing) togglePlay(); }, pause: () => { if (S.playing) togglePlay(); },
    prev: () => $('prev').click(), next: () => $('next').click(), cat: () => fxCat(), skin: () => randomSkin(),
    shuffle: () => { if (S.sounds.length) { let n; do { n = Math.random() * S.sounds.length | 0; } while (n === S.index && S.sounds.length > 1); powerOrDo(() => playIndex(n)); toast('SHUFFLE'); } },
    repeat: () => { S.repeat = !S.repeat; toast(S.repeat ? 'REPEAT ON' : 'REPEAT OFF'); },
  };
  const powerOrDo = (fn) => { if (!S.powered) { powerOn().then(() => setTimeout(fn, 400)); } else fn(); };
  function applySkin(i, animate) {
    S.skin = i; const sk = SKINS[i];
    const swap = () => {
      skinImg.src = sk.img; skinImg.alt = sk.name;
      if (sk.video) {
        const small = Math.min(screen.width, screen.height) < 700 || (navigator.connection && navigator.connection.saveData);
        skinVid.src = small && sk.videoLite ? sk.videoLite : sk.video; skinVid.hidden = false; skinVid.currentTime = 0;
        skinVid.play().catch(() => {});
      } else { skinVid.pause(); skinVid.hidden = true; skinVid.removeAttribute('src'); skinVid.load(); }
      hots.innerHTML = '';
      sk.eyes.forEach((e) => addHot(e, 'Cat', fxCat));
      if (sk.play) addHot(sk.play, 'Play or pause', togglePlay);
      (sk.hots || []).forEach((h) => addHot(h, h.label, () => ACTIONS[h.act] && ACTIONS[h.act]()));
      if (sk.seek) addSeek(sk.seek);
      layout();
      panelCache.clear();
    };
    if (!animate || reduced) { swap(); return; }
    skinImg.style.opacity = 0; skinVid.style.opacity = 0; S.glitchUntil = performance.now() + 450;
    setTimeout(() => { swap(); const show = () => { skinImg.style.opacity = 1; skinVid.style.opacity = 1; }; if (sk.video) setTimeout(show, 120); else skinImg.onload = show; }, 220);
  }
  // moving skins: play through once, then loop from loopFrom, with a tape glitch over the join
  skinVid.addEventListener('ended', () => { const sk = SKINS[S.skin]; skinVid.currentTime = sk.loopFrom || 0; skinVid.play().catch(() => {}); S.glitchUntil = performance.now() + 260; });
  // some browsers hold back the first autoplay; try again on canplay and on the first touch or key
  skinVid.addEventListener('canplay', () => { if (skinVid.paused && !skinVid.hidden) skinVid.play().catch(() => {}); });
  ['pointerdown', 'keydown'].forEach((ev) => addEventListener(ev, () => { if (skinVid.paused && !skinVid.hidden) skinVid.play().catch(() => {}); }, { passive: true }));
  function addHot(c, label, fn) {
    const b = document.createElement('button'); b.className = 'hot'; b.type = 'button'; b.setAttribute('aria-label', label); b.title = label;
    Object.assign(b.style, { left: c.x - c.r + 'px', top: c.y - c.r + 'px', width: c.r * 2 + 'px', height: c.r * 2 + 'px' });
    b.addEventListener('click', fn); hots.appendChild(b);
  }
  function addSeek(r) {
    const b = document.createElement('div'); b.className = 'hot rect'; b.setAttribute('aria-hidden', 'true');
    Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    b.addEventListener('click', (e) => {
      if (!S.widget || !S.dur) return;
      const bb = b.getBoundingClientRect(), f = Math.max(0, Math.min(1, (e.clientX - bb.left) / bb.width));
      S.widget.seekTo(f * S.dur * 1000); S.pos = f * S.dur; S.posAt = performance.now();
    });
    hots.appendChild(b);
  }
  function randomSkin(quiet, videoOnly) {
    const pool = SKINS.map((s, i) => i).filter((i) => i !== S.skin && (!videoOnly || SKINS[i].video));
    if (!pool.length) return;
    const n = pool[Math.random() * pool.length | 0];
    applySkin(n, true); // no name shown: the skins just rotate
  }

  // ---------------- LED drawing ----------------
  const dot = document.createElement('canvas'); dot.width = dot.height = 64;
  { const d = dot.getContext('2d'), gr = d.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,235,225,1)'); gr.addColorStop(.18, 'rgba(255,90,70,1)'); gr.addColorStop(.45, 'rgba(255,30,20,.55)'); gr.addColorStop(1, 'rgba(255,0,0,0)');
    d.fillStyle = gr; d.fillRect(0, 0, 64, 64); }
  const glow = document.createElement('canvas'); glow.width = glow.height = 128;
  { const d = glow.getContext('2d'), gr = d.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,200,180,.95)'); gr.addColorStop(.25, 'rgba(255,40,25,.7)'); gr.addColorStop(1, 'rgba(255,0,0,0)');
    d.fillStyle = gr; d.fillRect(0, 0, 128, 128); }

  const panelCache = new Map(); // per panel offscreen grid canvas
  const MODES = ['spectrum', 'runes', 'title', 'vu', 'wave'];
  function grid(p) {
    let c = panelCache.get(p);
    if (!c) {
      const cols = Math.max(2, Math.floor(p.w / p.pitch)), rows = Math.max(2, Math.floor(p.h / p.pitch));
      const o = document.createElement('canvas'); o.width = cols; o.height = rows;
      c = { o, x: o.getContext('2d', { willReadFrequently: true }), cols, rows, seed: Math.random() * 1000, runes: Array.from({ length: 40 }, () => RUNES[Math.random() * RUNES.length | 0]) };
      panelCache.set(p, c);
    }
    return c;
  }
  const mmss = (s) => { s = Math.max(0, s | 0); return String(s / 60 | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };

  function drawMatrix(p, r, t, k) {
    const c = grid(p), o = c.x, { cols, rows } = c;
    o.globalCompositeOperation = 'source-over'; o.fillStyle = '#000'; o.fillRect(0, 0, cols, rows);
    o.fillStyle = '#f00';
    let mode = p.mode;
    if (!mode) { const usable = MODES.filter((m) => m !== 'title' || rows >= 7); mode = usable[Math.floor((t / 9 + c.seed) % usable.length)]; }
    if (S.summon > 0.02) mode = 'fill';
    const B = r.bands;
    if (mode === 'spectrum' || mode === 'fill') {
      for (let x = 0; x < cols; x++) {
        const v = mode === 'fill' ? S.summon * (0.6 + 0.4 * Math.random()) : B[Math.min(31, Math.floor(x / cols * 28))];
        const hgt = Math.round(v * rows);
        o.globalAlpha = 1; o.fillRect(x, rows - hgt, 1, hgt);
      }
    } else if (mode === 'vu') {
      const lv = [r.l, r.r];
      if (cols >= rows) { for (let i = 0; i < 2; i++) { const n = Math.round(lv[i] * cols); const h2 = Math.max(1, Math.floor(rows / 2) - 0); o.fillRect(0, i * Math.ceil(rows / 2), n, h2); } }
      else { for (let i = 0; i < 2; i++) { const n = Math.round(lv[i] * rows); const w2 = Math.max(1, Math.floor(cols / 2)); o.fillRect(i * Math.ceil(cols / 2), rows - n, w2, n); } }
    } else if (mode === 'runes') {
      o.font = `${Math.max(5, Math.floor(rows * .5))}px "Noto Sans Runic"`; o.textBaseline = 'top';
      const step = Math.max(5, Math.floor(rows * .5)), off = (t * (6 + r.low * 14)) % step;
      for (let y = -1, i = 0; y * step < rows + step; y++) for (let x = 0; x * step < cols; x++, i++) {
        o.globalAlpha = .35 + .65 * ((i + Math.floor(t * 2)) % 5 === 0 ? 1 : r.mid);
        o.fillText(c.runes[(i + y * 3) % c.runes.length], x * step, y * step - off + step);
      }
      o.globalAlpha = 1;
    } else if (mode === 'title' || mode === 'time') {
      const txt = mode === 'time' ? mmss(curPos()) : (S.title + '   ✦   ');
      o.font = `${rows + 1}px VT323`; o.textBaseline = 'top';
      if (mode === 'time') { const tw = o.measureText(txt).width; o.fillText(txt, Math.max(0, (cols - tw) / 2), 0); }
      else { const tw = o.measureText(txt).width, x = -((t * 8) % tw); o.fillText(txt, x, 0); o.fillText(txt, x + tw, 0); }
    } else if (mode === 'wave') {
      for (let x = 0; x < cols; x++) {
        const v = Math.sin(x / cols * Math.PI * 4 + t * 3) * (0.25 + r.mid * .7) * rows / 2;
        o.fillRect(x, Math.round(rows / 2 - v), 1, 1); o.fillRect(x, Math.round(rows / 2 + v * .3), 1, 1);
      }
    }
    if (S.glitchUntil > performance.now()) { for (let i = 0; i < 3; i++) { o.globalAlpha = Math.random(); o.fillRect(0, Math.random() * rows | 0, cols, 1); } o.globalAlpha = 1; }
    const px = o.getImageData(0, 0, cols, rows).data;
    const sz = p.pitch * 1.6;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const v = px[(y * cols + x) * 4] / 255; if (v < .04) continue;
      g.globalAlpha = Math.min(1, v * k);
      g.drawImage(dot, p.x + (x + .5) * (p.w / cols) - sz / 2, p.y + (y + .5) * (p.h / rows) - sz / 2, sz, sz);
    }
    g.globalAlpha = 1;
  }

  function drawRays(p, r, t, k) {
    g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
    const N = 56, R = Math.hypot(p.w, p.h);
    g.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const a = i / N * Math.PI * 2 + t * .05;
      const band = Math.floor(Math.abs(Math.sin(a * 1.5)) * 28);
      const v = Math.min(1, r.bands[band] * 1.2 + S.summon * .8);
      if (v < .08) continue;
      const r0 = 150 + (1 - v) * 120;
      g.strokeStyle = `rgba(255,${40 + v * 60 | 0},30,${(v * .55 * k).toFixed(3)})`;
      g.lineWidth = 5 + v * 7;
      g.beginPath(); g.moveTo(p.cx + Math.cos(a) * r0, p.cy + Math.sin(a) * r0); g.lineTo(p.cx + Math.cos(a) * R, p.cy + Math.sin(a) * R); g.stroke();
    }
    g.restore();
  }

  function drawRunes(p, r, t, k, sk) {
    const n = Math.max(4, Math.round(p.w / p.h * 1.3)), c = grid(p), step = p.w / n;
    g.font = `${Math.round(p.h * .78)}px "Noto Sans Runic"`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const lit = S.beatCount % n;
    for (let i = 0; i < n; i++) {
      const on = i === lit || i === (lit + Math.floor(n / 2)) % n;
      g.globalAlpha = Math.min(1, (on ? .95 : .12 + r.mid * .35) * k + S.summon * .6);
      g.shadowColor = '#ff2a1f'; g.shadowBlur = on ? 18 : 6; g.fillStyle = on ? '#ffd2c8' : '#ff3a2a';
      g.fillText(c.runes[(i + S.beatCount) % c.runes.length], p.x + step * (i + .5), p.y + p.h / 2);
    }
    g.shadowBlur = 0; g.globalAlpha = 1; g.textAlign = 'start';
  }

  function drawList(p, r, t, k) {
    const lh = 19; g.font = '18px VT323'; g.textBaseline = 'top';
    const list = S.sounds.length ? S.sounds : [{ title: 'POWER ON' }];
    const visible = Math.floor(p.h / lh), start = Math.max(0, Math.min(list.length - visible, S.index - Math.floor(visible / 2)));
    g.save(); g.beginPath(); g.rect(p.x, p.y, p.w, p.h); g.clip();
    for (let i = 0; i < visible && start + i < list.length; i++) {
      const s = list[start + i], cur = start + i === S.index;
      g.globalAlpha = cur ? 1 : .55 * k; g.fillStyle = cur ? '#ffd8cf' : '#ff3a2a'; g.shadowColor = '#ff2a1f'; g.shadowBlur = cur ? 10 : 0;
      const label = `${String(start + i + 1).padStart(2, '0')} ${cur ? '▶ ' : ''}${(s.title || '...').toUpperCase()}`;
      g.fillText(label.slice(0, 34), p.x + 6, p.y + 4 + i * lh);
    }
    g.restore(); g.shadowBlur = 0; g.globalAlpha = 1;
  }

  function drawGlow(x, y, rad, a) { if (a < .02) return; g.globalAlpha = Math.min(1, a); g.drawImage(glow, x - rad, y - rad, rad * 2, rad * 2); g.globalAlpha = 1; }

  // ---------------- song position ----------------
  const curPos = () => S.playing ? S.pos + (performance.now() - S.posAt) / 1000 * S.timeScale : S.pos;

  // ---------------- frame ----------------
  let last = performance.now();
  S.beatCount = 0; S.summon = 0;
  function frame(now) {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    const t = now / 1000, pos = curPos();
    const r = E.read(S.map, pos, S.playing && S.timeScale > .05);
    // beat
    S.lowAvg += (r.low - S.lowAvg) * Math.min(1, dt * 2.5);
    if (r.low > S.lowAvg * 1.3 + .04 && r.low > .25 && now - S.beatAt > 260) { S.beatAt = now; S.beatCount++; }
    const beat = Math.max(0, 1 - (now - S.beatAt) / 220);
    S.summon = E.summonLevel();
    const flare = Math.max(0, 1 - (now - S.flareAt) / 600);

    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.clearRect(0, 0, W, H);
    g.globalCompositeOperation = 'lighter';
    const sk = SKINS[S.skin], k = .55 + r.level * .7 + beat * .25;
    for (const p of sk.panels) {
      if (p.kind === 'matrix') drawMatrix(p, r, t, k);
      else if (p.kind === 'rays') drawRays(p, r, t, k);
      else if (p.kind === 'runes') drawRunes(p, r, t, k, sk);
      else if (p.kind === 'list') drawList(p, r, t, k);
    }
    // eyes: the side eyes follow the bass, the third eye follows the mids
    sk.eyes.forEach((e, i) => {
      const base = i === 0 ? .2 + r.mid * .8 : .15 + r.low * .75 + beat * .25;
      drawGlow(e.x, e.y, e.r * (1.6 + flare * 1.4 + S.summon), (base + flare + S.summon * .7) * (S.powered ? 1 : .35));
    });
    if (sk.pulse) { // view-only skins: a red glow from the edges on the beat, the centre stays clear
      const a = (.06 + r.low * .22 + beat * .18 + S.summon * .3 + flare * .3) * (S.powered ? 1 : .4);
      const gr = g.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, W * .62);
      gr.addColorStop(0, 'rgba(255,20,10,0)'); gr.addColorStop(1, `rgba(255,20,10,${Math.min(.6, a).toFixed(3)})`);
      g.fillStyle = gr; g.fillRect(0, 0, W, H);
    }
    (sk.lamps || []).forEach((l, i) => drawGlow(l.x, l.y, l.r * 2, (S.beatCount + i) % 2 === 0 ? .25 + beat * .7 : .12));
    if (sk.play) drawGlow(sk.play.x, sk.play.y, sk.play.r * 1.7, S.playing ? .18 + beat * .35 : .1 + .1 * Math.sin(t * 2));
    // monad: a soft breath over the whole machine
    if (S.monad > 0) { const br = .5 + .5 * Math.sin(t * 2 * Math.PI / 1.618); g.globalAlpha = .05 + S.monad * .07 * br; g.fillStyle = '#ff1a10'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    g.globalCompositeOperation = 'source-over';

    if (PZ.on) PZ.frame(skinVid.hidden ? skinImg : skinVid, { low: r.low, mid: r.mid, high: r.high, beat, summon: S.summon, glitch: S.glitchUntil > now ? 1 : 0, calm: reduced ? .3 : 1 });
    drawSeek(pos); drawMonad(t);
    $('time').textContent = mmss(pos) + (S.dur ? ' / ' + mmss(S.dur) : '');
    requestAnimationFrame(frame);
  }

  // ---------------- seek bar ----------------
  const seekCv = $('seekCv'), sg = seekCv.getContext('2d');
  function drawSeek(pos) {
    const w = seekCv.clientWidth * devicePixelRatio | 0, h = seekCv.clientHeight * devicePixelRatio | 0;
    if (seekCv.width !== w) { seekCv.width = w; seekCv.height = h; }
    sg.clearRect(0, 0, w, h);
    const n = 120, frac = S.dur ? pos / S.dur : 0;
    for (let i = 0; i < n; i++) {
      const v = S.map ? S.map.wave[Math.floor(i / n * S.map.wave.length)] / 255 : .25 + .2 * Math.sin(i * .7);
      const bh = Math.max(2, v * h);
      sg.fillStyle = i / n <= frac ? '#ff4a35' : 'rgba(255,42,31,.28)';
      sg.fillRect(i / n * w, (h - bh) / 2, w / n - 1, bh);
    }
    $('seek').setAttribute('aria-valuenow', Math.round(frac * 100));
  }
  $('seek').addEventListener('click', (e) => {
    if (!S.widget || !S.dur) return;
    const b = e.currentTarget.getBoundingClientRect(), f = (e.clientX - b.left) / b.width;
    S.widget.seekTo(f * S.dur * 1000); S.pos = f * S.dur; S.posAt = performance.now();
  });
  $('seek').addEventListener('keydown', (e) => {
    if (!S.widget) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const p = Math.max(0, curPos() + (e.key === 'ArrowRight' ? 5 : -5)); S.widget.seekTo(p * 1000); S.pos = p; S.posAt = performance.now(); }
  });

  // ---------------- monad dial ----------------
  const mcv = $('monadCv'), mg = mcv.getContext('2d'), monadEl = $('monad');
  const TET = []; // tetractys points: rows of 1, 2, 3, 4
  for (let row = 0; row < 4; row++) for (let j = 0; j <= row; j++) TET.push({ x: (j - row / 2) * 22, y: -30 + row * 20 });
  function drawMonad(t) {
    const W2 = 192, c = W2 / 2; mg.clearRect(0, 0, W2, W2);
    const v = S.monad, n = v <= 0.001 ? 0 : 1 + Math.min(9, Math.floor(v * 10)), br = .5 + .5 * Math.sin(t * 2 * Math.PI / 1.618);
    // ring
    mg.lineWidth = 3; mg.strokeStyle = 'rgba(255,42,31,.25)'; mg.beginPath(); mg.arc(c, c, 80, Math.PI * .75, Math.PI * 2.25); mg.stroke();
    mg.strokeStyle = `rgba(255,70,50,${.6 + br * .4 * (n ? 1 : 0)})`; mg.shadowColor = '#ff2a1f'; mg.shadowBlur = 12;
    mg.beginPath(); mg.arc(c, c, 80, Math.PI * .75, Math.PI * (.75 + 1.5 * v)); mg.stroke();
    // ticks
    for (let i = 0; i < 10; i++) { const a = Math.PI * (.75 + 1.5 * (i + .5) / 10); mg.fillStyle = i < n ? '#ff5a45' : 'rgba(255,42,31,.25)'; mg.beginPath(); mg.arc(c + Math.cos(a) * 92, c + Math.sin(a) * 92, 3, 0, 7); mg.fill(); }
    // pointer
    const a = Math.PI * (.75 + 1.5 * v); mg.strokeStyle = '#ffd0c5'; mg.lineWidth = 4; mg.beginPath(); mg.moveTo(c + Math.cos(a) * 60, c + Math.sin(a) * 60); mg.lineTo(c + Math.cos(a) * 76, c + Math.sin(a) * 76); mg.stroke();
    // tetractys
    TET.forEach((p, i) => { const on = i < n; mg.fillStyle = on ? `rgba(255,${90 + br * 80 | 0},70,1)` : 'rgba(255,42,31,.18)'; mg.shadowBlur = on ? 10 + br * 8 : 0; mg.beginPath(); mg.arc(c + p.x, c + p.y + 6, i === 0 ? 7 : 5.5, 0, 7); mg.fill(); });
    mg.shadowBlur = 0;
    monadEl.setAttribute('aria-valuenow', n);
  }
  function setMonad(v) {
    S.monad = Math.max(0, Math.min(1, v));
    if (!S.powered) return;
    E.monad(S.monad);
  }
  {
    let drag = false;
    const angleTo = (e) => { const b = monadEl.getBoundingClientRect(); let a = Math.atan2(e.clientY - (b.top + b.height / 2), e.clientX - (b.left + b.width / 2)); let d = (a / Math.PI - .75); while (d < 0) d += 2; return Math.max(0, Math.min(1, d / 1.5)); };
    monadEl.addEventListener('pointerdown', (e) => { drag = true; monadEl.setPointerCapture(e.pointerId); setMonad(angleTo(e)); });
    monadEl.addEventListener('pointermove', (e) => { if (drag) setMonad(angleTo(e)); });
    monadEl.addEventListener('pointerup', () => { drag = false; });
    monadEl.addEventListener('wheel', (e) => { e.preventDefault(); setMonad(S.monad - Math.sign(e.deltaY) * .04); }, { passive: false });
    monadEl.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowRight'].includes(e.key)) { e.preventDefault(); setMonad(S.monad + .1); }
      if (['ArrowDown', 'ArrowLeft'].includes(e.key)) { e.preventDefault(); setMonad(S.monad - .1); }
      if (e.key === '0' || e.key === 'Home') setMonad(0);
    });
  }

  // ---------------- knobs ----------------
  document.querySelectorAll('.knob').forEach((kn) => {
    const inp = kn.querySelector('input'), dial = kn.querySelector('.dial');
    const apply = () => {
      const v = +inp.value; dial.style.setProperty('--a', (-135 + v * 270) + 'deg');
      const key = inp.dataset.k;
      if (key === 'echo') E.setEcho(v);
      else if (key === 'vol') { E.setVolume(v); if (S.widget) S.widget.setVolume(Math.round(v * 100)); }
      else E.setEQ(key, v);
    };
    inp.addEventListener('input', apply); apply();
    let y0 = 0, v0 = 0, drag = false;
    kn.addEventListener('pointerdown', (e) => { drag = true; y0 = e.clientY; v0 = +inp.value; kn.setPointerCapture(e.pointerId); e.preventDefault(); inp.focus(); });
    kn.addEventListener('pointermove', (e) => { if (!drag) return; inp.value = Math.max(0, Math.min(1, v0 + (y0 - e.clientY) / 150)); apply(); });
    kn.addEventListener('pointerup', () => { drag = false; });
    kn.addEventListener('dblclick', () => { inp.value = inp.dataset.k === 'echo' ? 0 : .8; apply(); });
    kn.applyNow = apply;
  });
  const reapplyKnobs = () => document.querySelectorAll('.knob').forEach((kn) => kn.applyNow());

  // ---------------- toast ----------------
  let toastT = 0;
  function toast(txt) { const el = $('toast'); el.textContent = txt; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 900); }

  // ---------------- effects ----------------
  function flare() { if (flashOK()) S.flareAt = performance.now(); }
  function shake() { if (reduced) return; stage.classList.remove('shake'); void stage.offsetWidth; stage.classList.add('shake'); }
  function fxCat() { E.cat(); flare(); }
  function fxGlitch() { E.glitch(); S.glitchUntil = performance.now() + 650; shake(); toast('GLITCH'); }
  function summonStart() { if (!S.powered) return; E.summonStart(); $('fxSummon').classList.add('on'); toast('SUMMON'); }
  function summonEnd() { if (!$('fxSummon').classList.contains('on')) return; $('fxSummon').classList.remove('on'); const lvl = E.summonEnd(); if (lvl > .15) { flare(); shake(); } }
  $('fxCat').addEventListener('click', fxCat);
  const sm = $('fxSummon');
  sm.addEventListener('pointerdown', (e) => { e.preventDefault(); sm.setPointerCapture(e.pointerId); summonStart(); });
  sm.addEventListener('pointerup', summonEnd); sm.addEventListener('pointercancel', summonEnd);
  sm.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); summonStart(); } });
  sm.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') summonEnd(); });
  $('skinBtn').addEventListener('click', () => randomSkin());

  // ---------------- songs panel ----------------
  const songsEl = $('songs');
  const openSongs = (o) => { songsEl.classList.toggle('open', o); $('songsBtn').setAttribute('aria-expanded', String(o)); $('songsBtn').classList.toggle('on', o); };
  $('songsBtn').addEventListener('click', () => openSongs(!songsEl.classList.contains('open')));
  $('songsClose').addEventListener('click', () => openSongs(false));
  function renderSongs() {
    const ol = $('songList'); ol.innerHTML = '';
    S.sounds.forEach((s, i) => {
      const li = document.createElement('li'), b = document.createElement('button'); b.type = 'button';
      b.innerHTML = `<span class="n">${String(i + 1).padStart(2, '0')}</span><span></span><span>${s.duration ? mmss(s.duration / 1000) : ''}</span>`;
      b.children[1].textContent = (s.title || '...').toUpperCase();
      if (i === S.index) b.setAttribute('aria-current', 'true');
      b.addEventListener('click', () => { playIndex(i); openSongs(false); });
      li.appendChild(b); ol.appendChild(li);
    });
  }

  // ---------------- music services ----------------
  // Each service is wrapped so the rest of the machine talks to it the same way:
  // play, pause, seekTo(ms), setVolume(0-100), skip(i), next, prev, isPaused(cb).
  // Every service plays through its own official player (visitors' own logins; plays count for the artist).
  const SC_URL = 'https://soundcloud.com/animuscult';
  const START_WITH = { soundcloud: 'so-toxic', spotify: '' };
  // Songs play through SoundCloud (full songs for everyone). Spotify's player only gave visitors who weren't
  // signed in a short preview and covered the machine with a banner, so the page links to Spotify instead.
  const service = 'soundcloud';
  try { localStorage.removeItem('oc-service'); } catch (e) { /* storage off */ }

  async function setCurrent(i, title, secs) {
    if (S.index >= 0 && i !== S.index) randomSkin(true, true); // a different film for each song
    S.index = i;
    S.title = (title || '').toUpperCase(); $('title').textContent = S.title;
    document.title = S.title + ' · OUIJA CAT MUSIC MACHINE';
    S.dur = secs || 0;
    const m = E.findMap(title, S.dur);
    S.map = null; if (m) { try { S.map = await E.loadMap(m.slug); } catch (e) { S.map = null; } }
    renderSongs();
  }
  const onPlay = () => { S.playing = true; S.posAt = performance.now(); setPlayBtn(); if (!S.tapeHeld) S.timeScale = 1; };
  const onPause = () => { S.pos = curPos(); S.playing = false; setPlayBtn(); };
  const onFinish = () => { S.playing = false; setPlayBtn(); if (S.repeat) { S.widget.seekTo(0); S.widget.play(); } else if (service !== 'soundcloud') S.widget.next(); };

  // --- SoundCloud ---
  function initSoundCloud() {
    const f = document.createElement('iframe');
    f.title = 'ANIMUSCULT on SoundCloud'; f.allow = 'autoplay';
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(SC_URL) + '&color=%23ff2a1f&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false&show_artwork=false';
    $('dock').appendChild(f);
    if (!window.SC) { toast('SOUNDCLOUD OFFLINE'); return; }
    const w = SC.Widget(f); S.widget = w;
    let tries = 0;
    const refresh = () => w.getSounds((list) => { S.sounds = list || []; renderSongs(); if (S.sounds.some((x) => !x.title) && tries++ < 12) setTimeout(refresh, 1500); });
    w.bind(SC.Widget.Events.READY, () => { refresh(); w.setVolume(Math.round(+document.querySelector('[data-k=vol]').value * 100)); if (S.powered) startFirst(); });
    w.bind(SC.Widget.Events.PLAY, () => {
      onPlay();
      w.getCurrentSoundIndex((i) => w.getCurrentSound((x) => { if (!x) return; S.sounds[i] = Object.assign(S.sounds[i] || {}, x); setCurrent(i, x.title, (x.full_duration || x.duration || 0) / 1000); }));
    });
    w.bind(SC.Widget.Events.PAUSE, onPause);
    w.bind(SC.Widget.Events.FINISH, onFinish);
    w.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => { S.pos = e.currentPosition / 1000; S.posAt = performance.now(); });
  }

  // --- Spotify (official embed + iFrame API). Signed-in listeners hear full songs, others hear previews. ---
  let spCtrl = null, spData = null, spLoadPromise = null;
  function loadSpotifyApi() {
    if (spLoadPromise) return spLoadPromise;
    spLoadPromise = new Promise((res) => {
      window.onSpotifyIframeApiReady = (API) => res(API);
      const sc = document.createElement('script'); sc.src = 'https://open.spotify.com/embed/iframe-api/v1'; sc.async = true; document.head.appendChild(sc);
    });
    return spLoadPromise;
  }
  async function initSpotify() {
    try { spData = await (await fetch('assets/data/spotify.json')).json(); } catch (e) { toast('SPOTIFY OFFLINE'); return; }
    S.sounds = spData.tracks.map((t) => ({ title: t.title, duration: t.secs * 1000, uri: t.uri }));
    renderSongs();
    const API = await loadSpotifyApi();
    if (service !== 'spotify') return;
    const host = document.createElement('div'); $('dock').appendChild(host);
    let pending = false, lastPos = 0, lastDur = 0, wasPlaying = false;
    API.createController(host, { uri: spData.tracks[0].uri, width: '100%', height: 80 }, (ctrl) => {
      spCtrl = ctrl;
      ctrl.addListener('ready', () => { if (pending) { pending = false; ctrl.play(); } });
      ctrl.addListener('playback_update', (e) => {
        const d = e.data, playing = !d.isPaused && !d.isBuffering;
        S.pos = d.position / 1000; S.posAt = performance.now(); if (d.duration) S.dur = d.duration / 1000;
        if (playing && !S.playing) onPlay(); else if (!playing && S.playing && !d.isBuffering) onPause();
        if (wasPlaying && d.isPaused && lastDur && lastPos > lastDur - 1.5) { wasPlaying = false; onFinish(); }
        if (playing) wasPlaying = true;
        lastPos = d.position / 1000; lastDur = d.duration / 1000;
      });
      S.widget = {
        play: () => (S.index < 0 ? startFirst() : (S.pos > 0 ? ctrl.resume() : ctrl.play())),
        pause: () => ctrl.pause(),
        seekTo: (ms) => ctrl.seek(ms / 1000),
        setVolume: () => {}, // the Spotify player keeps its own volume
        skip: (i) => { const t = S.sounds[(i + S.sounds.length) % S.sounds.length]; const idx = S.sounds.indexOf(t); pending = true; wasPlaying = false; ctrl.loadUri(t.uri); setCurrent(idx, t.title, t.duration / 1000); },
        next: () => S.widget.skip(S.index + 1),
        prev: () => S.widget.skip(S.index - 1),
        isPaused: (cb) => cb(!S.playing),
      };
      if (S.powered) startFirst();
    });
  }

  function initService() {
    $('dock').innerHTML = ''; S.widget = null; S.sounds = []; S.index = -1; S.playing = false; S.pos = 0; S.dur = 0; S.map = null;
    if (spCtrl) { try { spCtrl.destroy(); } catch (e) { /* gone */ } spCtrl = null; }
    setPlayBtn(); renderSongs();
    if (service === 'spotify') initSpotify(); else initSoundCloud();
  }

  function playIndex(i) { if (!S.widget) return; S.widget.skip(i); }
  function togglePlay() {
    if (!S.powered) { powerOn(); return; }
    if (!S.widget) return;
    S.widget.isPaused((p) => { if (p) { if (S.index < 0) startFirst(); else S.widget.play(); } else S.widget.pause(); });
  }
  function startFirst(tries = 0) {
    const key = START_WITH[service];
    const i = key ? S.sounds.findIndex((x) => (x.permalink_url || x.uri || '').includes(key)) : -1;
    if (key && i < 0 && tries < 8) { setTimeout(() => startFirst(tries + 1), 600); return; } // the song list is still filling in
    playIndex(i >= 0 ? i : 0);
  }
  function setPlayBtn() { $('playBtn').textContent = S.playing ? '❚❚' : '▶'; $('playBtn').setAttribute('aria-label', S.playing ? 'Pause' : 'Play'); }
  $('playBtn').addEventListener('click', togglePlay);
  $('next').addEventListener('click', () => S.widget && (S.index < 0 ? startFirst() : S.widget.next()));
  $('prev').addEventListener('click', () => S.widget && (curPos() > 4 ? S.widget.seekTo(0) : S.widget.prev()));

  // ---------------- power ----------------
  async function powerOn() {
    if (S.powered) return;
    if (skinVid.paused && !skinVid.hidden) skinVid.play().catch(() => {});
    S.powered = true; $('power').classList.add('gone');
    try { await E.start(); } catch (e) { /* machine layer unavailable; songs still play */ }
    reapplyKnobs(); setMonad(S.monad);
    if (S.widget) startFirst();
    setTimeout(() => E.cat(), 900);
  }
  $('powerBtn').addEventListener('click', powerOn);

  // ---------------- keys ----------------
  addEventListener('keydown', (e) => {
    if (window.OC_SLIDES && OC_SLIDES.isOpen()) return; // the slideshow has its own keys
    if (e.target.closest && e.target.closest('input, textarea') && e.target.type !== 'range') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (e.target === document.body || e.target.classList.contains('hot')) {
      if (k === ' ') { e.preventDefault(); togglePlay(); return; }
      if (e.key === 'ArrowRight') { $('next').click(); return; }
      if (e.key === 'ArrowLeft') { $('prev').click(); return; }
    }
    if (e.repeat) return;
    if (k === 'c') fxCat(); else if (k === 's') randomSkin(); else if (k === 'x') summonStart();
    else if (k === 'escape') openSongs(false);
  });
  addEventListener('keyup', (e) => { if (e.key.toLowerCase() === 'x') summonEnd(); });

  // ---------------- POSSESS (GPU shader over the skin) ----------------
  const PZ = window.OC_POSSESS || { on: false, ok: false };
  if (PZ.init && PZ.init(stage, $('lights'))) {
    let want = true; try { want = localStorage.getItem('oc-possess') !== 'off'; } catch (e) { /* storage off */ }
    const setPZ = (on) => { PZ.set(on, []); $('fxPossess').classList.toggle('on', PZ.on); $('fxPossess').setAttribute('aria-pressed', String(PZ.on)); };
    setPZ(want);
    $('fxPossess').addEventListener('click', () => { setPZ(!PZ.on); toast(PZ.on ? 'POSSESSED' : 'RELEASED'); try { localStorage.setItem('oc-possess', PZ.on ? 'on' : 'off'); } catch (e) { /* storage off */ } });
  } else { $('fxPossess').hidden = true; }

  // ---------------- SLIDESHOW ----------------
  // Full-screen photos from the gallery (assets/data/gallery.json, made from GALLERY DROP), shuffled each time.
  // The song keeps playing. assets/js/slideshow.js draws it; Esc or the ✕ ESC button comes back here.
  {
    let gallery = null;
    $('fxShow').addEventListener('click', async () => {
      if (!gallery) { try { gallery = (await (await fetch('assets/data/gallery.json')).json()).items || []; } catch (e) { gallery = []; } }
      if (!gallery.length || !window.OC_SLIDES) { toast('NO PHOTOS YET'); return; }
      if (!S.powered) powerOn();
      OC_SLIDES.open({ list: gallery, shuffle: true, caption: () => (S.title && S.playing ? '♪ ' + S.title : ''), onClose: () => $('fxShow').focus() });
    });
  }

  // ---------------- go ----------------
  const vids = SKINS.map((s, i) => i).filter((i) => SKINS[i].video);
  const startSkin = vids.length ? vids[Math.random() * vids.length | 0] : 0; // a different film on each load
  applySkin(startSkin >= 0 ? startSkin : 0, false);
  layout(); requestAnimationFrame(layout);
  E.loadMapIndex();
  initService();
  requestAnimationFrame(frame);
  // Came in through ENTER (the visitor has already clicked): turn the machine on and start the song right away.
  // If the browser still holds the sound back, the POWER screen comes back so one press starts it.
  const viaEnter = (() => { try { return window.parent !== window && !!window.parent.OC_SHELL; } catch (e) { return false; } })();
  if (viaEnter) {
    powerOn();
    setTimeout(() => { if (!S.playing) { S.powered = false; $('power').classList.remove('gone'); } }, 7000);
  }
  if (window.__OC_DEBUG || location.search.includes('debug')) window.__oc = { S, E };
})();
