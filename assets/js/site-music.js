// ANIMUSCULT — site music: the songs play one after another after ENTER, starting with BLEED BETWEEN THE LINES,
// and keep playing between pages. NEXT SONG (beside the jewel) skips ahead from any page.
//
// How it holds together:
//   index.html is the shell. After ENTER it starts the song (SoundCloud's player: no ads, plays count),
//   then shows every other page inside a full-screen frame, so the song never stops between pages.
//   Pages in the frame tell the shell what they need:
//     body[data-music="off"]   (the music machine) the site song fades out while you're there
//     OC_MUSIC.yieldTo()       a page is about to play its own sound (a video, a single): fade out
//   The OUROBOROS JEWEL silences or brings the song back; the choice is remembered.
//   A page opened on its own (not through ENTER) gets its own jewel; the song starts when it's pressed.
(() => {
  const TRACKS = 'https://soundcloud.com/animuscult'; // every song on the SoundCloud page, in its order
  const FIRST = 'so-toxic';                            // start with BLEED BETWEEN THE LINES
  const MAPS = 'assets/machine/maps/';
  const TARGET = 55, FADE_IN = 12000, FADE_OUT = 1500;
  const body = document.body;
  const inFrame = window.parent !== window && (() => { try { return !!window.parent.OC_SHELL; } catch (e) { return false; } })();
  const page = (location.pathname.split('/').pop() || 'index.html');
  const wantsMusic = body.dataset.music !== 'off';

  // ---------- pages inside the shell: just report to it ----------
  if (inFrame) {
    const shell = window.parent.OC_SHELL;
    shell.onPage(page, wantsMusic, document.title);
    document.querySelectorAll('a[href="index.html"]').forEach((a) => a.setAttribute('href', 'home.html')); // never nest the entry inside itself
    window.OC_MUSIC = { yieldTo: () => shell.yieldTo(), resume: () => shell.resume() };
    return;
  }

  // ---------- shell (index.html) or a page opened on its own ----------
  const isShell = body.dataset.shell === '1';
  if (!isShell && !wantsMusic) { window.OC_MUSIC = { yieldTo() {}, resume() {} }; return; }

  let silenced = false; try { silenced = localStorage.getItem('oc-silence') === '1'; } catch (e) { /* storage off */ }
  let widget = null, ready = false, started = false, firstIdx = -1, everPlayed = false, count = 0, vol = 0, fadeT = 0, yielded = false, pos = 0, posAt = 0, playing = false, map = null;

  // the jewel
  const jewel = document.createElement('button');
  jewel.type = 'button'; jewel.className = 'oc-jewel';
  jewel.innerHTML = '<img src="assets/img/jewel.svg" alt="" width="200" height="200" draggable="false">';
  const dock = document.createElement('div'); dock.className = 'oc-scdock';
  const css = document.createElement('style');
  css.textContent = `
    .oc-jewel { position: fixed; z-index: 70; left: 18px; bottom: 18px; width: 64px; height: 64px; padding: 0; border: 0; background: none; cursor: pointer;
      border-radius: 50%; --pulse: 0; transition: transform .25s, opacity .4s; -webkit-tap-highlight-color: transparent; }
    .oc-jewel img { width: 100%; height: 100%; display: block; pointer-events: none; user-select: none;
      filter: drop-shadow(0 0 calc(6px + var(--pulse) * 22px) rgba(255,30,20,calc(.45 + var(--pulse) * .5))) brightness(calc(1 + var(--pulse) * .25));
      animation: oc-turn 60s linear infinite; transition: filter .6s; }
    .oc-jewel:hover { transform: scale(1.08); }
    .oc-jewel:focus-visible { outline: 1px solid #ff2a1f; outline-offset: 6px; }
    .oc-jewel.is-silent img { filter: grayscale(.75) brightness(.45) drop-shadow(0 0 3px rgba(255,30,20,.25)); animation-play-state: paused; }
    .oc-jewel.is-waiting img { animation: oc-turn 60s linear infinite, oc-call 2.4s ease-in-out infinite; }
    .oc-jewel.is-hidden { opacity: 0; pointer-events: none; }
    .oc-jewel .oc-tip { position: absolute; left: 74px; bottom: 20px; white-space: nowrap; font-family: "VT323", ui-monospace, monospace; font-size: 19px;
      letter-spacing: .14em; color: #ff6b55; text-shadow: 0 0 8px rgba(255,42,31,.8); opacity: 0; transition: opacity .3s; pointer-events: none; }
    .oc-jewel:hover .oc-tip, .oc-jewel:focus-visible .oc-tip { opacity: 1; }
    @keyframes oc-turn { to { transform: rotate(360deg); } }
    @keyframes oc-call { 0%, 100% { filter: drop-shadow(0 0 4px rgba(255,30,20,.4)) brightness(.8); } 50% { filter: drop-shadow(0 0 18px rgba(255,30,20,.9)) brightness(1.1); } }
    .oc-scdock { position: fixed; z-index: 69; left: 92px; bottom: 34px; width: 220px; opacity: .55; transition: opacity .3s; }
    .oc-scdock:hover { opacity: 1; }
    .oc-scdock iframe { width: 100%; height: 20px; border: 0; display: block; }
    .oc-scdock.is-hidden { opacity: 0; pointer-events: none; }
    .oc-skip { position: fixed; z-index: 70; left: 92px; bottom: 6px; padding: 4px 0; font-family: "VT323", ui-monospace, monospace; font-size: 18px; letter-spacing: .14em;
      color: rgba(255,107,85,.8); text-shadow: 0 0 6px rgba(255,42,31,.7); background: none; border: 0; cursor: pointer; transition: color .2s, opacity .3s; }
    .oc-skip:hover, .oc-skip:focus-visible { color: #fff; outline: none; text-shadow: 0 0 10px rgba(255,42,31,1); }
    .oc-skip.is-hidden { opacity: 0; pointer-events: none; }
    @media (max-width: 760px) { .oc-jewel { width: 52px; height: 52px; left: 12px; bottom: 12px; } .oc-scdock { left: 72px; bottom: 26px; width: 160px; } .oc-skip { left: 72px; bottom: 2px; font-size: 17px; } }
    @media (prefers-reduced-motion: reduce) { .oc-jewel img { animation: none !important; } }`;
  document.head.appendChild(css);
  const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'oc-skip'; skip.textContent = 'NEXT SONG ▶'; skip.setAttribute('aria-label', 'Next song');
  const tip = document.createElement('span'); tip.className = 'oc-tip'; jewel.appendChild(tip);
  const paint = () => {
    jewel.classList.toggle('is-silent', silenced || !started);
    jewel.classList.toggle('is-waiting', !started && !isShell);
    const label = !started ? 'PLAY THE SONG' : silenced ? 'SOUND ON' : 'SILENCE';
    jewel.setAttribute('aria-label', !started ? 'Play the music' : silenced ? 'Sound on' : 'Silence');
    jewel.setAttribute('aria-pressed', String(silenced)); tip.textContent = label;
  };

  function mount() {
    if (widget || !window.SC) return;
    const f = document.createElement('iframe');
    f.title = 'ANIMUSCULT on SoundCloud'; f.allow = 'autoplay';
    f.src = 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(TRACKS) + '&color=%23ff2a1f&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&sharing=false&download=false&buying=false&show_artwork=false';
    dock.appendChild(f);
    widget = SC.Widget(f);
    // find BLEED BETWEEN THE LINES in the list (SoundCloud fills the list in slowly, so look a few times)
    let tries = 0;
    const findFirst = (then) => widget.getSounds((list) => {
      list = list || []; count = list.length;
      firstIdx = list.findIndex((x) => (x.permalink_url || '').includes('/' + FIRST));
      if (firstIdx < 0 && tries++ < 6) setTimeout(() => findFirst(then), 700); else then();
    });
    widget.bind(SC.Widget.Events.READY, () => { widget.setVolume(0); findFirst(() => { ready = true; if (pendingStart) { pendingStart = false; start(); } }); });
    widget.bind(SC.Widget.Events.PLAY, () => { playing = true; everPlayed = true; posAt = performance.now(); widget.getCurrentSound((x) => x && useMap(x.title)); });
    widget.bind(SC.Widget.Events.PAUSE, () => { playing = false; });
    // when a song ends, the next one plays; after the last, back to the first
    widget.bind(SC.Widget.Events.FINISH, () => setTimeout(() => widget.isPaused((p) => { if (p && !silenced && !yielded && currentWants) nextSong(); }), 900));
    widget.bind(SC.Widget.Events.PLAY_PROGRESS, (e) => { pos = e.currentPosition / 1000; posAt = performance.now(); });
  }
  function loadSC(cb) {
    if (window.SC) { cb(); return; }
    const s = document.createElement('script'); s.src = 'https://w.soundcloud.com/player/api.js'; s.onload = cb; document.head.appendChild(s);
  }

  function fadeTo(target, ms, then) {
    clearInterval(fadeT); const from = vol, t0 = performance.now();
    fadeT = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      vol = from + (target - from) * (k * k * (3 - 2 * k)); // eased
      if (widget) widget.setVolume(Math.round(vol));
      if (k >= 1) { clearInterval(fadeT); if (then) then(); }
    }, 80);
  }
  let pendingStart = false;
  function start() {
    if (!ready) { pendingStart = true; return; }
    started = true; paint();
    if (silenced || yielded || !currentWants) return;
    if (!everPlayed && firstIdx >= 0) widget.skip(firstIdx); else widget.play();
    fadeTo(TARGET, FADE_IN);
  }
  function nextSong() {
    widget.getCurrentSoundIndex((i) => widget.getSounds((list) => {
      const n = (list || []).length || count || 1;
      widget.skip((i + 1) % n);
    }));
  }
  skip.addEventListener('click', () => {
    if (!started || silenced) { if (!started) { jewel.click(); return; } silenced = false; save(); paint(); }
    yielded = false;
    if (!everPlayed && firstIdx >= 0) { everPlayed = true; widget.skip((firstIdx + 1) % (count || 1)); } else nextSong();
    if (vol < TARGET) fadeTo(TARGET, 1200);
  });
  function quiet(pause = true) { fadeTo(0, FADE_OUT, () => { if (pause && widget) widget.pause(); }); }
  function resume() { if (!started || silenced || !currentWants) return; yielded = false; widget.play(); fadeTo(TARGET, 3000); }

  jewel.addEventListener('click', () => {
    if (!started) { loadSC(() => { mount(); silenced = false; save(); start(); }); return; }
    silenced = !silenced; save(); paint();
    if (silenced) quiet(); else { yielded = false; resume(); }
  });
  const save = () => { try { localStorage.setItem('oc-silence', silenced ? '1' : '0'); } catch (e) { /* storage off */ } };

  // the jewel glows with the bass of whichever song is playing (from the song maps)
  const norm = (t) => (t || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '');
  let maps = []; fetch(MAPS + 'index.json').then((r) => r.json()).then((d) => { maps = d; }).catch(() => {});
  let mapFor = '';
  function useMap(title) {
    const t = norm(title); if (!t || t === mapFor) return; mapFor = t; map = null;
    const m = maps.find((x) => norm(x.title) === t) || maps.find((x) => { const k = norm(x.title); return k && (t.startsWith(k) || k.startsWith(t)); });
    if (!m) return;
    fetch(MAPS + m.slug + '.json').then((r) => r.json()).then((d) => {
      if (mapFor !== t) return;
      const b = atob(d.spec), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
      map = { hz: d.hz, frames: d.frames, spec: u };
    }).catch(() => {});
  }
  let pulse = 0;
  (function glow() {
    let target = 0;
    if (map && playing && !silenced && vol > 1) {
      const t = pos + (performance.now() - posAt) / 1000, f = Math.min(map.frames - 1, Math.max(0, Math.floor(t * map.hz)));
      let lo = 0; for (let i = 0; i < 6; i++) lo += map.spec[f * 32 + i]; target = Math.min(1, (lo / 6 / 255) * 1.4) * (vol / TARGET);
    }
    pulse += (target - pulse) * .25; jewel.style.setProperty('--pulse', pulse.toFixed(3));
    requestAnimationFrame(glow);
  })();

  // what the page in view wants
  let currentWants = wantsMusic;
  window.OC_MUSIC = {
    yieldTo() { yielded = true; if (started) quiet(); },
    resume() { yielded = false; resume(); },
  };

  // ---------- shell only ----------
  if (isShell) {
    window.OC_SHELL = {
      // called by ENTER, inside the click, so the browser allows sound
      begin() {
        if (!dock.isConnected) body.appendChild(dock);
        dock.classList.remove('is-hidden'); body.appendChild(jewel); body.appendChild(skip); paint();
        loadSC(() => { mount(); start(); });
      },
      // load SoundCloud's player while the entry film plays, so it's ready the moment ENTER is pressed
      prepare() { dock.classList.add('is-hidden'); body.appendChild(dock); loadSC(mount); },
      onPage(name, wants, title) {
        currentWants = wants; yielded = false;
        jewel.classList.toggle('is-hidden', !wants); dock.classList.toggle('is-hidden', !wants); skip.classList.toggle('is-hidden', !wants);
        if (title) document.title = title;
        try { history.replaceState(null, '', '#' + name.replace(/\.html$/, '')); } catch (e) { /* file:// */ }
        if (!started) return;
        if (!wants) quiet(); else if (!silenced) resume();
      },
      yieldTo: () => window.OC_MUSIC.yieldTo(),
      resume: () => window.OC_MUSIC.resume(),
    };
    return;
  }

  // ---------- a page opened on its own ----------
  body.appendChild(jewel); body.appendChild(dock); body.appendChild(skip); paint();
})();
