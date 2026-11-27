// OUIJA CAT MUSIC MACHINE — sound engine.
// Two layers:
//   1. Songs: SoundCloud's official widget (no ads, plays count). Its sound can't be touched by the page,
//      so the lights read a song map made ahead of time (32-band spectrum + L/R level, 20 frames a second).
//   2. The machine: cat sounds, the monad purr and the effects, made here with Web Audio.
//      LOW / MID / HIGH / ECHO shape the machine layer and the lights.
(() => {
  const E = {};
  window.OC_ENGINE = E;

  // ---------------- song maps ----------------
  const b64 = (s) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
  let mapIndex = [];
  const mapCache = {};
  E.loadMapIndex = async () => { try { mapIndex = await (await fetch('assets/machine/maps/index.json')).json(); } catch (e) { mapIndex = []; } };
  const words = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !['the', 'with', 'remix', 'version', 'feat', 'demo'].includes(w));
  // Match a SoundCloud sound to a map by length (within 2.5 s) and a shared title word
  E.findMap = (title, secs) => {
    const tw = words(title);
    let best = null;
    for (const m of mapIndex) {
      if (Math.abs(m.secs - secs) > 2.5) continue;
      const mw = words(m.title + ' ' + m.slug.replace(/-/g, ' '));
      if (tw.some((w) => mw.includes(w))) { best = m; break; }
    }
    return best;
  };
  E.loadMap = async (slug) => {
    if (mapCache[slug]) return mapCache[slug];
    const d = await (await fetch(`assets/machine/maps/${slug}.json`)).json();
    const m = { hz: d.hz, bands: d.bands, frames: d.frames, secs: d.secs, spec: b64(d.spec), l: b64(d.l), r: b64(d.r), wave: b64(d.wave) };
    mapCache[slug] = m; return m;
  };

  // Reading at time t. Without a map, a steady stand-in pulse keeps the lights alive.
  const out = { bands: new Float32Array(32), low: 0, mid: 0, high: 0, l: 0, r: 0, level: 0 };
  E.read = (map, t, playing) => {
    const B = out.bands;
    if (map && playing) {
      const f = Math.min(map.frames - 1, Math.max(0, Math.floor(t * map.hz)));
      const f2 = Math.min(map.frames - 1, f + 1), k = t * map.hz - Math.floor(t * map.hz);
      for (let i = 0; i < 32; i++) B[i] = (map.spec[f * 32 + i] * (1 - k) + map.spec[f2 * 32 + i] * k) / 255;
      out.l = map.l[f] / 255; out.r = map.r[f] / 255;
    } else {
      const beat = playing ? Math.pow(1 - ((t * 2) % 1), 3) : 0; // 120 BPM stand-in
      const idle = 0.05 + 0.03 * Math.sin(performance.now() / 900);
      for (let i = 0; i < 32; i++) B[i] = playing ? Math.max(0, (i < 6 ? beat * .9 : .25 + .35 * Math.random() * (1 - i / 40))) : idle * (1 - i / 40);
      out.l = out.r = playing ? .4 + beat * .5 : idle;
    }
    // machine layer adds to the lights
    if (E.an) {
      E.an.getByteFrequencyData(E.anData);
      for (let i = 0; i < 32; i++) { const v = E.anData[Math.min(E.anData.length - 1, Math.floor(Math.pow(i / 32, 2) * 180) + 1)] / 255; B[i] = Math.min(1, B[i] + v * .8); }
    }
    // LOW / MID / HIGH also scale what the lights see
    const g = E.eqVisual;
    for (let i = 0; i < 32; i++) B[i] = Math.min(1, B[i] * (i < 8 ? g.low : i < 20 ? g.mid : g.high));
    let lo = 0, mi = 0, hi = 0;
    for (let i = 0; i < 8; i++) lo += B[i]; for (let i = 8; i < 20; i++) mi += B[i]; for (let i = 20; i < 32; i++) hi += B[i];
    out.low = lo / 8; out.mid = mi / 12; out.high = hi / 12; out.level = (out.l + out.r) / 2;
    return out;
  };
  E.eqVisual = { low: 1, mid: 1, high: 1 };

  // ---------------- Web Audio: the machine layer ----------------
  let ctx = null;
  const samples = {};
  E.start = async () => {
    if (ctx) { if (ctx.state !== 'running') await ctx.resume(); return; }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    E.ctx = ctx;
    // chain: bus -> low shelf -> mid peak -> high shelf -> crusher -> master ; echo send
    E.bus = ctx.createGain();
    E.low = ctx.createBiquadFilter(); E.low.type = 'lowshelf'; E.low.frequency.value = 220;
    E.mid = ctx.createBiquadFilter(); E.mid.type = 'peaking'; E.mid.frequency.value = 1100; E.mid.Q.value = .8;
    E.high = ctx.createBiquadFilter(); E.high.type = 'highshelf'; E.high.frequency.value = 4200;
    E.crush = ctx.createWaveShaper(); E.crush.oversample = 'none'; setCrush(0);
    E.master = ctx.createGain(); E.master.gain.value = .8;
    E.comp = ctx.createDynamicsCompressor(); E.comp.threshold.value = -10; E.comp.ratio.value = 4;
    E.bus.connect(E.low); E.low.connect(E.mid); E.mid.connect(E.high); E.high.connect(E.crush); E.crush.connect(E.master);
    E.master.connect(E.comp); E.comp.connect(ctx.destination);
    // echo
    E.dly = ctx.createDelay(2); E.dly.delayTime.value = .375;
    E.fb = ctx.createGain(); E.fb.gain.value = .45;
    E.send = ctx.createGain(); E.send.gain.value = 0;
    const dlyTone = ctx.createBiquadFilter(); dlyTone.type = 'lowpass'; dlyTone.frequency.value = 2600;
    E.high.connect(E.send); E.send.connect(E.dly); E.dly.connect(dlyTone); dlyTone.connect(E.fb); E.fb.connect(E.dly); dlyTone.connect(E.master);
    // analyser for the lights
    E.an = ctx.createAnalyser(); E.an.fftSize = 512; E.an.smoothingTimeConstant = .7; E.anData = new Uint8Array(E.an.frequencyBinCount);
    E.crush.connect(E.an);
    // noise buffer for hiss/riser/tape
    E.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = E.noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // cat sounds
    const names = ['meow-1', 'meow-2', 'meow-3', 'meow-4', 'meow-5', 'meow-6', 'purr-1', 'purr-2', 'purr-3', 'purr-4', 'purr-5', 'hiss-1'];
    await Promise.all(names.map(async (n) => {
      try { const buf = await (await fetch(`assets/machine/cat/${n}.m4a`)).arrayBuffer(); samples[n] = await ctx.decodeAudioData(buf); } catch (e) { /* skip missing */ }
    }));
  };

  function setCrush(amount) { // 0 = clean, 1 = crushed
    const n = 1024, c = new Float32Array(n), steps = amount > 0 ? Math.max(3, Math.round(64 - amount * 60)) : 0;
    for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = steps ? Math.round(x * steps) / steps : x; }
    E.crush.curve = c;
  }
  E.setCrush = (a) => ctx && setCrush(a);

  // dB: -24 .. +6 for knob 0..1 (0.8 = flat)
  const knobDb = (v) => v >= .8 ? (v - .8) / .2 * 6 : -24 * (1 - v / .8);
  E.setEQ = (band, v) => {
    E.eqVisual[band] = v < .8 ? .15 + .85 * (v / .8) : 1 + (v - .8) * 2.5;
    if (!ctx) return;
    E[band].gain.setTargetAtTime(knobDb(v), ctx.currentTime, .03);
  };
  E.setEcho = (v) => { if (ctx) E.send.gain.setTargetAtTime(v * .9, ctx.currentTime, .05); };
  E.setVolume = (v) => { if (ctx) E.master.gain.setTargetAtTime(v, ctx.currentTime, .05); };

  const play = (name, { rate = 1, gain = 1, pan = 0 } = {}) => {
    if (!ctx || !samples[name]) return null;
    const s = ctx.createBufferSource(); s.buffer = samples[name]; s.playbackRate.value = rate;
    const g = ctx.createGain(); g.gain.value = gain;
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(g); if (p) { p.pan.value = pan; g.connect(p); p.connect(E.bus); } else g.connect(E.bus);
    s.start(); return s;
  };

  E.cat = () => {
    const pool = ['meow-1', 'meow-2', 'meow-3', 'meow-4', 'meow-5', 'meow-6'].filter((n) => samples[n]);
    if (!pool.length) return;
    play(pool[Math.random() * pool.length | 0], { rate: .78 + Math.random() * .4, gain: .9, pan: Math.random() * 1.2 - .6 });
  };
  E.hiss = () => play('hiss-1', { rate: .9 + Math.random() * .2, gain: .8 });

  // SUMMON: hold to rise, release to drop
  let riser = null;
  E.summonStart = () => {
    if (!ctx || riser) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource(); src.buffer = E.noise; src.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 6; bp.frequency.setValueAtTime(180, t); bp.frequency.exponentialRampToValueAtTime(5200, t + 6);
    const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.setValueAtTime(55, t); osc.frequency.exponentialRampToValueAtTime(440, t + 6);
    const og = ctx.createGain(); og.gain.value = .05;
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.55, t + 6);
    src.connect(bp); bp.connect(g); osc.connect(og); og.connect(g); g.connect(E.bus);
    src.start(); osc.start();
    riser = { src, osc, g, t0: performance.now() };
  };
  E.summonLevel = () => riser ? Math.min(1, (performance.now() - riser.t0) / 6000) : 0;
  E.summonEnd = () => {
    if (!ctx || !riser) return 0;
    const lvl = E.summonLevel(), t = ctx.currentTime;
    riser.g.gain.cancelScheduledValues(t); riser.g.gain.setValueAtTime(riser.g.gain.value, t); riser.g.gain.linearRampToValueAtTime(0, t + .08);
    riser.src.stop(t + .1); riser.osc.stop(t + .1); riser = null;
    // the drop: a falling sub and a thump
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(28, t + 1.6);
    const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.9 * (.4 + lvl * .6), t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + 2);
    o.connect(g); g.connect(E.bus); o.start(t); o.stop(t + 2.1);
    return lvl;
  };

  // TAPE: the sound of a tape stopping (down) or spinning up (up)
  E.tape = (dir) => {
    if (!ctx) return;
    const t = ctx.currentTime, d = .9;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const f = ctx.createBiquadFilter(); f.type = 'lowpass';
    const g = ctx.createGain();
    if (dir === 'down') { o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(18, t + d); f.frequency.setValueAtTime(2400, t); f.frequency.exponentialRampToValueAtTime(120, t + d); g.gain.setValueAtTime(.25, t); g.gain.linearRampToValueAtTime(0, t + d); }
    else { o.frequency.setValueAtTime(18, t); o.frequency.exponentialRampToValueAtTime(110, t + d * .7); f.frequency.setValueAtTime(120, t); f.frequency.exponentialRampToValueAtTime(2400, t + d * .7); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.22, t + d * .5); g.gain.linearRampToValueAtTime(0, t + d * .75); }
    o.connect(f); f.connect(g); g.connect(E.bus); o.start(t); o.stop(t + d + .05);
  };

  // GLITCH: crush the machine layer for a moment and spit a noise burst
  E.glitch = () => {
    if (!ctx) return;
    setCrush(.9); setTimeout(() => setCrush(0), 650);
    const t = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const s = ctx.createBufferSource(); s.buffer = E.noise; s.playbackRate.value = .3 + Math.random() * 2;
      const g = ctx.createGain(); g.gain.setValueAtTime(0, t + i * .11); g.gain.linearRampToValueAtTime(.18, t + i * .11 + .01); g.gain.linearRampToValueAtTime(0, t + i * .11 + .06);
      const hp = ctx.createBiquadFilter(); hp.type = 'bandpass'; hp.frequency.value = 400 + Math.random() * 4000; hp.Q.value = 3;
      s.connect(hp); hp.connect(g); g.connect(E.bus); s.start(t + i * .11, Math.random()); s.stop(t + i * .11 + .08);
    }
  };

  // ---------------- MONAD: the deep engine purr ----------------
  // The monad is 1. The dial counts out from it: 1 to 10, the tetractys (1 + 2 + 3 + 4).
  // n = how many points are lit. The drone sums the first n harmonics of a deep fundamental (1/k each).
  // The fundamental sits in a cat's purr range (25 to 40 Hz) and also gates a breathy noise, so it purrs.
  // The right side runs 1/phi Hz higher than the left, so the two sides drift in and out of each other.
  // The whole thing breathes once every phi seconds.
  const PHI = (1 + Math.sqrt(5)) / 2;
  let M = null;
  E.monad = (v) => { // v: 0 (off) .. 1
    if (!ctx) return;
    if (!M) M = buildMonad();
    const t = ctx.currentTime, n = v <= 0.001 ? 0 : 1 + Math.min(9, Math.floor(v * 10));
    const f0 = 25 + v * 15;
    M.f0 = f0; M.n = n;
    M.oscL.forEach((o, i) => o.frequency.setTargetAtTime(f0 * (i + 1), t, .08));
    M.oscR.forEach((o, i) => o.frequency.setTargetAtTime(f0 * (i + 1) + 1 / PHI, t, .08));
    M.gains.forEach((g, i) => { const lv = i < n ? .22 / (i + 1) : 0; g.l.gain.setTargetAtTime(lv, t, .12); g.r.gain.setTargetAtTime(lv, t, .12); });
    M.gate.frequency.setTargetAtTime(f0, t, .08);
    M.out.gain.setTargetAtTime(n ? .55 : 0, t, .25);
    return n;
  };
  E.monadState = () => M ? { n: M.n || 0, f0: M.f0 || 0 } : { n: 0, f0: 0 };
  function buildMonad() {
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.gain.value = 0;
    const merger = ctx.createChannelMerger(2);
    const L = ctx.createGain(), R = ctx.createGain();
    L.connect(merger, 0, 0); R.connect(merger, 0, 1); merger.connect(out);
    const oscL = [], oscR = [], gains = [];
    for (let k = 1; k <= 10; k++) {
      const ol = ctx.createOscillator(), or = ctx.createOscillator();
      ol.type = or.type = k === 1 ? 'triangle' : 'sine';
      const gl = ctx.createGain(), gr = ctx.createGain(); gl.gain.value = gr.gain.value = 0;
      ol.connect(gl); gl.connect(L); or.connect(gr); gr.connect(R);
      ol.start(t); or.start(t); oscL.push(ol); oscR.push(or);
      gains.push({ l: gl, r: gr });
    }
    // purr: noise through a low band, gated at the fundamental
    const ns = ctx.createBufferSource(); ns.buffer = E.noise; ns.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 140; bp.Q.value = .9;
    const gateAmt = ctx.createGain(); gateAmt.gain.value = 0;
    const gate = ctx.createOscillator(); gate.type = 'square'; gate.frequency.value = 27;
    const gateDepth = ctx.createGain(); gateDepth.gain.value = .5;
    const ng = ctx.createGain(); ng.gain.value = .5;
    gate.connect(gateDepth); gateDepth.connect(ng.gain);
    ns.connect(bp); bp.connect(ng); ng.connect(gateAmt); gateAmt.connect(L); gateAmt.connect(R);
    gateAmt.gain.value = .35;
    ns.start(t); gate.start(t);
    // breath: once every phi seconds
    const breath = ctx.createOscillator(); breath.frequency.value = 1 / PHI;
    const bDepth = ctx.createGain(); bDepth.gain.value = .22;
    breath.connect(bDepth); bDepth.connect(out.gain); breath.start(t);
    out.connect(E.bus);
    return { out, oscL, oscR, gains, gate };
  }
})();
