// ANIMUSCULT — the slideshow. Fills the whole screen, with a light VHS look over the pictures.
// Used by the player (SLIDESHOW button) and the gallery page.
//   OC_SLIDES.open({ list, start, shuffle, caption, onClose })
//     list: gallery items ({type, src, thumb, w, h}); start: index to begin at
//     caption(): text for the bottom line (e.g. the song playing), checked every 2 s
// Controls (BACK, PAUSE, NEXT, ESC) show when you touch the screen or move the mouse, then fade.
// Keys: Esc or Backspace closes, arrows step, space pauses, F full screen, M sound on/off. Swipe left or right on a phone.
// The big knob (bottom right): turn it to wind through the pictures, one click per picture. Tap it to pause.
// The SECONDS dial next to it: how long each picture or clip stays, 1 to 30 s (remembered). Keys: - and + too.
// Clips marked audio:true play with sound (site music fades out meanwhile) and move on when they end; 🔊 button turns it off, remembered.
// Pictures can't be right-clicked, dragged or long-pressed to save.
(() => {
  const IDLE = 2600, SECS_MIN = 1, SECS_MAX = 30;
  let secs = 7; try { const v = +localStorage.getItem('ocs-secs'); if (v >= SECS_MIN && v <= SECS_MAX) secs = v; } catch (e) { /* fine */ }
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = Math.min(screen.width, screen.height) < 700;

  const css = document.createElement('style');
  css.textContent = `
    .ocs { position: fixed; inset: 0; z-index: 90; background: #000; overflow: hidden; cursor: none; touch-action: pan-y; user-select: none; -webkit-user-select: none; }
    .ocs[hidden] { display: none; }
    .ocs.ui { cursor: default; }
    /* the picture fills the screen: a dim, blurred copy behind, the whole picture in front */
    .ocs-back { position: absolute; inset: -6%; width: 112%; height: 112%; object-fit: cover; filter: blur(38px) brightness(.42) saturate(1.3); opacity: 0; transition: opacity 1.6s ease; }
    .ocs-back.on { opacity: 1; }
    .ocs-back { transition-duration: calc(var(--fade, 1.4s) + .2s); } .ocs-frame { transition-duration: var(--fade, 1.4s) !important; }
    .ocs-frame { position: absolute; inset: 0; opacity: 0; transition: opacity 1.4s ease; }
    .ocs-frame.on { opacity: 1; }
    .ocs-frame.kb { animation: ocs-kb 10s ease-out forwards; }
    .ocs-frame img, .ocs-frame video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; display: block; }
    .ocs-frame.chroma img, .ocs-frame.chroma video { filter: url(#ocs-chroma); }
    @keyframes ocs-kb { from { transform: scale(1); } to { transform: scale(1.06); } }

    /* light VHS: scanlines, grain, vignette, a slow tracking band */
    .ocs-fx { position: absolute; inset: 0; pointer-events: none; }
    .ocs-scan { background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,.2) 3px, rgba(0,0,0,0) 4px); mix-blend-mode: multiply; }
    .ocs-grain { width: 100%; height: 100%; opacity: .07; mix-blend-mode: screen; }
    .ocs-vig { background: radial-gradient(ellipse at center, rgba(0,0,0,0) 58%, rgba(0,0,0,.6) 100%); }
    .ocs-roll::before { content: ""; position: absolute; left: 0; right: 0; height: 12vh; top: -14vh;
      background: linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,.04) 45%, rgba(255,255,255,.075) 50%, rgba(255,255,255,.04) 55%, rgba(255,255,255,0));
      animation: ocs-roll 11s linear infinite; }
    @keyframes ocs-roll { to { transform: translateY(130vh); } }
    /* a soft tape wobble as each picture comes in */
    .ocs-frame.wob { animation: ocs-wob .7s steps(7) 1, ocs-kb 10s ease-out forwards; }
    @keyframes ocs-wob { 0% { transform: translateX(5px) skewX(-.6deg); } 30% { transform: translateX(-4px); } 60% { transform: translateX(2px) skewX(.3deg); } 100% { transform: none; } }

    /* controls */
    .ocs-ui { position: absolute; z-index: 3; font-family: "VT323", ui-monospace, monospace; font-size: 22px; letter-spacing: .12em; color: #ff6b55;
      text-shadow: 0 0 8px rgba(255,42,31,.85), 0 0 2px #000; opacity: 0; transition: opacity .35s; pointer-events: none; }
    .ocs.ui .ocs-ui, .ocs:focus-within .ocs-ui.keep { opacity: 1; pointer-events: auto; }
    .ocs-ui button { font-family: inherit; font-size: inherit; letter-spacing: inherit; color: inherit; text-shadow: inherit; background: rgba(12,0,0,.55);
      border: 1px solid rgba(255,42,31,.45); padding: 10px 16px; min-width: 52px; min-height: 48px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
    .ocs-ui button:hover, .ocs-ui button:focus-visible { color: #fff; background: rgba(255,42,31,.22); box-shadow: 0 0 16px rgba(255,42,31,.45); outline: none; }
    .ocs-top { top: max(16px, env(safe-area-inset-top)); right: 18px; left: 18px; display: flex; justify-content: space-between; align-items: center; }
    .ocs-bottom { left: 0; right: 0; bottom: max(18px, env(safe-area-inset-bottom)); display: flex; justify-content: center; gap: 12px; }
    .ocs-cap { position: absolute; z-index: 3; left: 20px; bottom: max(86px, calc(env(safe-area-inset-bottom) + 76px)); max-width: 70vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      font-family: "VT323", ui-monospace, monospace; font-size: 20px; letter-spacing: .12em; color: #ff6b55; text-shadow: 0 0 8px rgba(255,42,31,.8), 0 0 2px #000; opacity: .0; transition: opacity .35s; }
    .ocs.ui .ocs-cap { opacity: .9; }
    .ocs-rec { display: inline-flex; gap: 10px; align-items: center; }
    .ocs-rec i { width: 10px; height: 10px; border-radius: 50%; background: #ff2a1f; box-shadow: 0 0 8px #ff2a1f; }
    .ocs.paused .ocs-rec i { background: transparent; border: 1px solid #ff2a1f; }
    .ocs img, .ocs video { -webkit-touch-callout: none; -webkit-user-drag: none; user-select: none; pointer-events: none; }
    .ocs-fs[hidden] { display: none; }
    .ocs-topr { display: flex; gap: 10px; }

    /* the knob: a fat rubber dial with a lit notch */
    .ocs-knobwrap { right: max(22px, env(safe-area-inset-right)); bottom: max(18px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ocs-knobwrap small { font-size: 15px; letter-spacing: .2em; opacity: .8; }
    .ocs-knob { --a: 0deg; position: relative; width: 116px; height: 116px; border-radius: 50%; cursor: grab; touch-action: none; outline: none;
      background:
        radial-gradient(circle at 50% 50%, transparent 54%, rgba(0,0,0,.6) 55%, transparent 57%),
        repeating-conic-gradient(from var(--a), #1b1413 0 4deg, #2c201e 4deg 8deg);
      box-shadow: 0 0 0 3px #0b0707, 0 0 0 4px rgba(255,42,31,.35), 0 14px 28px rgba(0,0,0,.75), inset 0 3px 6px rgba(255,255,255,.12), inset 0 -6px 12px rgba(0,0,0,.7); }
    .ocs-knob::before { content: ""; position: absolute; inset: 17%; border-radius: 50%;
      background: radial-gradient(circle at 38% 30%, #4a3a37 0%, #241918 45%, #110a0a 100%);
      box-shadow: inset 0 2px 3px rgba(255,255,255,.18), inset 0 -4px 8px rgba(0,0,0,.8), 0 4px 10px rgba(0,0,0,.7); }
    .ocs-knob i { position: absolute; left: 50%; top: 21%; width: 7px; height: 18px; margin-left: -3.5px; border-radius: 4px; background: #ff2a1f;
      box-shadow: 0 0 10px #ff2a1f, 0 0 3px #ffb3a8 inset; transform-origin: 50% calc(116px * .29); transform: rotate(var(--a)); }
    .ocs-knob.turning { cursor: grabbing; }
    /* the SECONDS dial: smaller, sits left of the big one; its notch shows the setting, from 1 s (far left) to 30 s (far right) */
    .ocs-spdwrap { right: calc(max(22px, env(safe-area-inset-right)) + 140px); bottom: max(18px, env(safe-area-inset-bottom)); display: flex; flex-direction: column; align-items: center; gap: 6px; }
    .ocs-spdwrap small { font-size: 15px; letter-spacing: .2em; opacity: .8; }
    .ocs-spdwrap .ocs-led { font-size: 26px; letter-spacing: .1em; color: #ffd9d1; min-width: 4.6em; text-align: center; padding: 0 6px; background: rgba(12,0,0,.65); border: 1px solid rgba(255,42,31,.45); }
    .ocs-spd { width: 84px; height: 84px; }
    .ocs-spd i { height: 14px; transform-origin: 50% calc(84px * .29); }
    .ocs-knob:focus-visible { box-shadow: 0 0 0 3px #0b0707, 0 0 0 5px #ff2a1f, 0 14px 28px rgba(0,0,0,.75); }
    .ocs-knob.tick { animation: ocs-tick .09s ease-out; }
    @keyframes ocs-tick { 50% { transform: scale(.975); } }
    @media (max-width: 600px) { .ocs-knob { width: 84px; height: 84px; } .ocs-knob i { height: 13px; transform-origin: 50% calc(84px * .29); } .ocs-spd { width: 70px; height: 70px; } .ocs-spd i { height: 11px; transform-origin: 50% calc(70px * .29); } .ocs-spdwrap { right: auto; left: 14px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 66px); } .ocs-spdwrap small { display: none; } .ocs-spdwrap .ocs-led { font-size: 21px; } .ocs-cap { bottom: calc(max(18px, env(safe-area-inset-bottom)) + 190px); } .ocs-knobwrap { right: 14px; bottom: calc(max(18px, env(safe-area-inset-bottom)) + 66px); } .ocs-knobwrap small { display: none; } }
    @media (max-width: 600px) { .ocs-ui { font-size: 19px; } .ocs-ui button { padding: 8px 12px; } .ocs-bottom { gap: 8px; } }
    @media (prefers-reduced-motion: reduce) { .ocs-frame, .ocs-back { transition: opacity .2s; } .ocs-frame.kb, .ocs-frame.wob { animation: none; } .ocs-roll { display: none; } }`;
  document.head.appendChild(css);

  const box = document.createElement('div');
  box.className = 'ocs'; box.hidden = true; box.tabIndex = -1;
  box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Slideshow');
  box.innerHTML = `
    <svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="ocs-chroma" color-interpolation-filters="sRGB">
      <feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>
      <feOffset in="r" dx="2.5" dy="0" result="r2"/>
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb"/>
      <feOffset in="gb" dx="-1.5" dy="0" result="gb2"/>
      <feBlend in="r2" in2="gb2" mode="screen"/></filter></svg>
    <img class="ocs-back" alt="" aria-hidden="true"><img class="ocs-back" alt="" aria-hidden="true">
    <div class="ocs-frame"></div><div class="ocs-frame"></div>
    <div class="ocs-fx ocs-vig"></div><div class="ocs-fx ocs-scan"></div><canvas class="ocs-fx ocs-grain" width="320" height="180"></canvas><div class="ocs-fx ocs-roll"></div>
    <div class="ocs-ui ocs-top"><span class="ocs-rec" aria-hidden="true"><i></i><span class="ocs-count">01 / 01</span></span><span class="ocs-topr"><button type="button" class="ocs-snd" hidden></button><button type="button" class="ocs-fs" aria-label="Full screen">⛶ FULL</button><button type="button" class="ocs-esc" aria-label="Close the slideshow">✕ ESC</button></span></div>
    <div class="ocs-cap" aria-hidden="true"></div>
    <div class="ocs-ui ocs-bottom">
      <button type="button" class="ocs-prev" aria-label="Back one picture">◀ BACK</button>
      <button type="button" class="ocs-pause" aria-label="Pause">❚❚ PAUSE</button>
      <button type="button" class="ocs-next" aria-label="Next picture">NEXT ▶</button>
    </div>
    <div class="ocs-ui ocs-knobwrap"><div class="ocs-knob" role="slider" tabindex="0" aria-label="Turn to wind through the pictures" aria-valuemin="1"><i></i></div><small aria-hidden="true">TURN</small></div>
    <div class="ocs-ui ocs-spdwrap"><span class="ocs-led" aria-hidden="true">07 SEC</span><div class="ocs-knob ocs-spd" role="slider" tabindex="0" aria-label="Seconds per picture" aria-valuemin="1" aria-valuemax="30"><i></i></div><small aria-hidden="true">SECONDS</small></div>`;
  const q = (s) => box.querySelector(s);
  const backs = [...box.querySelectorAll('.ocs-back')], frames = [...box.querySelectorAll('.ocs-frame')];
  const btnPause = q('.ocs-pause'), count = q('.ocs-count'), cap = q('.ocs-cap');
  const add = () => { if (!box.isConnected) document.body.appendChild(box); };

  // grain, ~10 times a second, only while open
  const gc = q('.ocs-grain'), gg = gc.getContext('2d'), gimg = gg.createImageData(320, 180);
  const grain = () => { const d = gimg.data; for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } gg.putImageData(gimg, 0, 0); };
  grain();
  let gT = 0; const gLoop = (now) => { if (!S.open) return; if (!reduced && now - gT > 100) { grain(); gT = now; } requestAnimationFrame(gLoop); };

  const S = { open: false, list: [], i: 0, front: 0, timer: 0, paused: false, opts: {}, capT: 0, idleT: 0, lastFocus: null };
  const pad = (n) => String(n).padStart(2, '0');
  // clips with sound: the sound plays when the clip is on (you opened the slideshow, so the browser allows it), the site music steps aside
  const btnSnd = q('.ocs-snd');
  let soundOn = true; try { soundOn = localStorage.getItem('ocs-sound') !== 'off'; } catch (e) { /* fine */ }
  let ducked = false;
  const music = (want) => { const m = window.OC_MUSIC; if (!m || want === ducked) return; ducked = want; if (want) m.yieldTo(); else m.resume(); };
  const paintSnd = (it) => { const has = !!(it && it.type === 'video' && it.audio); btnSnd.hidden = !has;
    btnSnd.textContent = soundOn ? '🔊 SOUND' : '🔇 MUTED'; btnSnd.setAttribute('aria-label', soundOn ? 'Turn the sound off' : 'Turn the sound on'); btnSnd.setAttribute('aria-pressed', soundOn); };
  const soundFor = (v, it) => { const loud = !!(it.audio && soundOn && S.open && !S.paused); v.muted = !loud; music(loud);
    if (loud) v.play().catch(() => { v.muted = true; music(false); v.play().catch(() => {}); }); };

  function show(i, dir = 1) {
    const L = S.list; if (!L.length) return;
    S.i = (i + L.length) % L.length;
    const it = L[S.i];
    count.textContent = `${pad(S.i + 1)} / ${pad(L.length)}`;
    knob.setAttribute('aria-valuemax', L.length); knob.setAttribute('aria-valuenow', S.i + 1);
    clearTimeout(S.timer); paintSnd(it); if (!(it.type === 'video' && it.audio)) music(false);
    const nf = frames[1 - S.front], of = frames[S.front], nb = backs[1 - S.front], ob = backs[S.front];
    nf.classList.remove('on', 'kb', 'wob'); nf.innerHTML = '';
    const reveal = () => {
      void nf.offsetWidth;
      nf.classList.add('on', reduced ? 'on' : (Math.random() < .5 ? 'wob' : 'kb'));
      of.classList.remove('on'); nb.classList.add('on'); ob.classList.remove('on');
      const old = of.querySelector('video'); if (old) { old.muted = true; setTimeout(() => old.pause(), 1500); }
      S.front = 1 - S.front;
      schedule();
    };
    nb.src = it.thumb || it.src;
    if (it.type === 'video') {
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.loop = !it.audio; v.src = it.src;
      if (it.audio) v.addEventListener('ended', () => { if (S.open && !S.paused && S.list[S.i] === it) show(S.i + 1); else v.play().catch(() => {}); });
      nf.appendChild(v); v.play().catch(() => {}); soundFor(v, it); reveal();
    } else {
      const im = new Image(); im.alt = ''; im.decoding = 'async'; im.draggable = false;
      im.onload = reveal; im.onerror = () => { if (S.open) show(S.i + dir, dir); };
      im.src = it.src; nf.appendChild(im);
    }
    const nx = L[(S.i + 1) % L.length]; if (nx && nx.type !== 'video') { const p = new Image(); p.src = nx.src; } // preload the next one
  }
  function schedule() { clearTimeout(S.timer); if (!S.paused && S.open) S.timer = setTimeout(() => show(S.i + 1), secs * 1000); }
  function setPaused(p) {
    S.paused = p; box.classList.toggle('paused', p);
    btnPause.textContent = p ? '▶ PLAY' : '❚❚ PAUSE'; btnPause.setAttribute('aria-label', p ? 'Play' : 'Pause');
    const v = frames[S.front].querySelector('video'), cur = S.list[S.i]; if (v) { if (p) { v.pause(); music(false); } else { v.play().catch(() => {}); if (cur) soundFor(v, cur); } }
    if (p) clearTimeout(S.timer); else schedule();
  }
  function wake() { box.classList.add('ui'); clearTimeout(S.idleT); S.idleT = setTimeout(() => { if (!box.contains(document.activeElement) || document.activeElement === box) box.classList.remove('ui'); }, IDLE); }

  function open(opts = {}) {
    add();
    let list = (opts.list || []).slice();
    if (!list.length) return false;
    let start = opts.start || 0;
    if (opts.shuffle) { for (let k = list.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [list[k], list[j]] = [list[j], list[k]]; } start = 0; }
    Object.assign(S, { list, opts, open: true, lastFocus: document.activeElement });
    frames.forEach((f) => f.classList.toggle('chroma', !small && !reduced));
    box.hidden = false; document.documentElement.style.overflow = 'hidden';
    setPaused(false); show(start); wake(); box.focus({ preventScroll: true });
    requestAnimationFrame(gLoop);
    const upd = () => { const t = opts.caption ? opts.caption() : ''; cap.textContent = t || ''; };
    upd(); clearInterval(S.capT); S.capT = setInterval(upd, 2000);
    return true;
  }
  function close() {
    if (!S.open) return;
    exitFs();
    S.open = false; box.hidden = true; clearTimeout(S.timer); clearInterval(S.capT);
    document.documentElement.style.overflow = '';
    box.querySelectorAll('video').forEach((v) => { v.muted = true; v.pause(); }); music(false);
    frames.forEach((f) => { f.classList.remove('on'); f.innerHTML = ''; }); backs.forEach((b) => b.classList.remove('on'));
    if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus({ preventScroll: true });
    if (S.opts.onClose) S.opts.onClose(S.i);
  }

  q('.ocs-esc').addEventListener('click', close);
  btnSnd.addEventListener('click', () => { soundOn = !soundOn; try { localStorage.setItem('ocs-sound', soundOn ? 'on' : 'off'); } catch (e) { /* fine */ }
    const it = S.list[S.i], v = frames[S.front].querySelector('video'); paintSnd(it); if (v && it) soundFor(v, it); wake(); });

  // full screen (hidden where the browser can't do it, like iPhone Safari)
  const btnFs = q('.ocs-fs');
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
  const canFs = !!(box.requestFullscreen || box.webkitRequestFullscreen) && (document.fullscreenEnabled || document.webkitFullscreenEnabled);
  btnFs.hidden = !canFs;
  function exitFs() { if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); }
  function toggleFs() {
    if (!canFs) return;
    if (fsEl()) exitFs(); else { const r = (box.requestFullscreen || box.webkitRequestFullscreen).call(box); if (r && r.catch) r.catch(() => {}); }
  }
  const paintFs = () => { const on = !!fsEl(); btnFs.textContent = on ? '⛶ EXIT FULL' : '⛶ FULL'; btnFs.setAttribute('aria-label', on ? 'Leave full screen' : 'Full screen'); };
  document.addEventListener('fullscreenchange', paintFs); document.addEventListener('webkitfullscreenchange', paintFs);
  btnFs.addEventListener('click', () => { toggleFs(); wake(); });

  // the knob: every 30 degrees of turn is one picture, with a little click
  const knob = q('.ocs-knob'); const STEP = 30;
  let ang = 0, dragging = false, lastA = 0, acc = 0, moved = 0;
  const setA = () => knob.style.setProperty('--a', ang + 'deg');
  const click = (d) => {
    show(S.i + d, d); knob.classList.remove('tick'); void knob.offsetWidth; knob.classList.add('tick');
    if (navigator.vibrate) try { navigator.vibrate(6); } catch (e) { /* no buzz */ }
  };
  const turn = (deg) => { ang += deg; acc += deg; setA(); while (acc >= STEP) { acc -= STEP; click(1); } while (acc <= -STEP) { acc += STEP; click(-1); } };
  const angleAt = (e) => { const r = knob.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  knob.addEventListener('pointerdown', (e) => { e.stopPropagation(); dragging = true; moved = 0; lastA = angleAt(e); knob.setPointerCapture(e.pointerId); knob.classList.add('turning'); wake(); });
  knob.addEventListener('pointermove', (e) => {
    if (!dragging) return; wake();
    const a = angleAt(e); let d = a - lastA; if (d > 180) d -= 360; if (d < -180) d += 360; lastA = a; moved += Math.abs(d); turn(d);
  });
  const endTurn = (e) => { if (!dragging) return; dragging = false; knob.classList.remove('turning'); if (moved < 6) setPaused(!S.paused); e.stopPropagation(); };
  knob.addEventListener('pointerup', endTurn); knob.addEventListener('pointercancel', endTurn);
  knob.addEventListener('wheel', (e) => { e.preventDefault(); const d = (e.deltaY || e.deltaX) > 0 ? 1 : -1; ang += d * STEP; acc = 0; setA(); click(d); wake(); }, { passive: false });
  // the SECONDS dial: turn right for longer on each picture (slower), left for shorter (faster); 12 degrees per second
  const spd = q('.ocs-spd'), led = q('.ocs-led'), SPD_STEP = 12;
  const paintSpd = () => { spd.style.setProperty('--a', ((secs - SECS_MIN) * SPD_STEP - 174) + 'deg'); led.textContent = `${pad(secs)} SEC`;
    spd.setAttribute('aria-valuenow', secs); spd.setAttribute('aria-valuetext', secs === 1 ? '1 second' : `${secs} seconds`);
    box.style.setProperty('--fade', Math.min(1.4, secs * .45).toFixed(2) + 's'); };
  const setSecs = (n) => { n = Math.max(SECS_MIN, Math.min(SECS_MAX, Math.round(n))); if (n === secs) return; secs = n; paintSpd();
    try { localStorage.setItem('ocs-secs', secs); } catch (e) { /* fine */ }
    spd.classList.remove('tick'); void spd.offsetWidth; spd.classList.add('tick'); if (navigator.vibrate) try { navigator.vibrate(4); } catch (e) { /* no buzz */ }
    schedule(); wake(); };
  paintSpd();
  let sDrag = false, sLast = 0, sAcc = 0;
  const sAngle = (e) => { const r = spd.getBoundingClientRect(); return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI; };
  spd.addEventListener('pointerdown', (e) => { e.stopPropagation(); sDrag = true; sAcc = 0; sLast = sAngle(e); spd.setPointerCapture(e.pointerId); spd.classList.add('turning'); wake(); });
  spd.addEventListener('pointermove', (e) => { if (!sDrag) return; wake();
    const a = sAngle(e); let d = a - sLast; if (d > 180) d -= 360; if (d < -180) d += 360; sLast = a; sAcc += d;
    while (sAcc >= SPD_STEP) { sAcc -= SPD_STEP; setSecs(secs + 1); } while (sAcc <= -SPD_STEP) { sAcc += SPD_STEP; setSecs(secs - 1); } });
  const sEnd = (e) => { if (!sDrag) return; sDrag = false; spd.classList.remove('turning'); e.stopPropagation(); };
  spd.addEventListener('pointerup', sEnd); spd.addEventListener('pointercancel', sEnd);
  spd.addEventListener('wheel', (e) => { e.preventDefault(); setSecs(secs + ((e.deltaY || e.deltaX) > 0 ? 1 : -1)); }, { passive: false });
  spd.addEventListener('keydown', (e) => { const d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (d) { e.preventDefault(); e.stopPropagation(); setSecs(secs + d); } else if (e.key === 'Home') { e.preventDefault(); setSecs(SECS_MIN); } else if (e.key === 'End') { e.preventDefault(); setSecs(SECS_MAX); } });
  // no saving: no right-click menu or dragging inside the slideshow
  box.addEventListener('contextmenu', (e) => e.preventDefault());
  box.addEventListener('dragstart', (e) => e.preventDefault());
  q('.ocs-prev').addEventListener('click', () => { show(S.i - 1, -1); wake(); });
  q('.ocs-next').addEventListener('click', () => { show(S.i + 1); wake(); });
  btnPause.addEventListener('click', () => { setPaused(!S.paused); wake(); });
  // touching or moving shows the controls; a swipe steps
  let sx = 0, sy = 0, st = 0;
  box.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') wake(); });
  box.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; st = performance.now(); if (!e.target.closest('button')) wake(); });
  box.addEventListener('pointerup', (e) => {
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (e.target.closest('button, .ocs-knob')) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4 && performance.now() - st < 700) { if (dx < 0) show(S.i + 1); else show(S.i - 1, -1); }
  });
  box.addEventListener('focusin', wake);
  addEventListener('keydown', (e) => {
    if (!S.open) return;
    const k = e.key;
    if (e.target === spd && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End'].includes(k)) return; // the SECONDS dial uses these itself
    if (k === 'Escape' || k === 'Backspace') { e.preventDefault(); e.stopImmediatePropagation(); close(); }
    else if (k === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); show(S.i + 1); wake(); }
    else if (k === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); show(S.i - 1, -1); wake(); }
    else if (k === ' ' && !(e.target.closest && e.target.closest('button'))) { e.preventDefault(); e.stopImmediatePropagation(); setPaused(!S.paused); wake(); }
    else if ((k === 'f' || k === 'F') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); toggleFs(); wake(); }
    else if ((k === 'm' || k === 'M') && !e.metaKey && !e.ctrlKey && !btnSnd.hidden) { e.preventDefault(); btnSnd.click(); }
    else if ((k === '-' || k === '_') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setSecs(secs - 1); }
    else if ((k === '=' || k === '+') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); setSecs(secs + 1); }
    else if (k === 'Tab') wake();
  }, true);

  window.OC_SLIDES = { open, close, isOpen: () => S.open };
})();
