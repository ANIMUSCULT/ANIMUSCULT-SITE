// OUIJA CAT MUSIC MACHINE — POSSESS: the skin runs through a GPU shader every frame (WebGL2).
// What it does to the picture:
//   - CRT glass: a slight curve and a slow scan roll
//   - heat haze that rises with the mids
//   - colour split from the centre that kicks with the bass and the beat
//   - red bloom: the LEDs and eyes glow and spill
//   - datamosh: blocks of the picture slip sideways on the beat and on GLITCH
//   - the medium's eye: a lens that follows the cursor or finger, glowing red
//   - feedback: last frame is fed back in, zoomed and turned, so SUMMON pulls everything into a red vortex
(() => {
  const VS = `#version 300 es
  in vec2 a; out vec2 uv; void main(){ uv = a * .5 + .5; gl_Position = vec4(a, 0., 1.); }`;
  const FS = `#version 300 es
  precision highp float;
  uniform sampler2D src, prev;
  uniform vec2 res, eye;
  uniform float t, low, mid, high, beat, summon, glitch, eyeOn, calm;
  in vec2 uv; out vec4 o;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){
    vec2 c = uv - .5;
    vec2 p = .5 + c * (1. + .05 * dot(c, c));                       // CRT curve
    vec2 d = p - eye; d.x *= res.x / res.y;
    float lens = eyeOn * smoothstep(.2, 0., length(d));
    p -= (p - eye) * lens * .16;                                     // the eye's lens
    float hz = n(vec2(p.x * 8., p.y * 6. - t * 1.4));
    p += vec2(hz - .5, n(vec2(p.y * 7., t * .7)) - .5) * (.0015 + mid * .007 + summon * .02) * calm; // heat haze
    vec2 blk = floor(p * vec2(26., 15.)); float q = floor(t * 10.);
    float hit = step(1. - (beat * .10 + glitch * .5) * calm, h(blk + q));
    p.x += hit * (h(blk * 1.7 + q) - .5) * .07;                     // datamosh
    float ca = (.0012 + low * .009 + beat * .006 + glitch * .03) * calm;
    vec2 dir = normalize(c + 1e-4) * ca;
    vec3 col = vec3(texture(src, p + dir).r, texture(src, p).g, texture(src, p - dir).b);
    vec3 b = vec3(0.);
    for (int i = 0; i < 8; i++) { float an = float(i) * .785; vec2 off = vec2(cos(an), sin(an)) * (.005 + .006 * low);
      b += max(texture(src, p + off).rgb - .5, 0.); }
    col += b * vec3(1., .22, .16) * (.28 + low * .8 + beat * .4);   // red bloom
    float ang = (summon * .035 + beat * .003) * calm;
    vec2 fc = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * c * (1. - .01 - summon * .035);
    vec3 pr = texture(prev, fc + .5).rgb;
    float fb = (.10 + .16 * beat + .62 * summon) * calm;
    col = max(col, pr * vec3(1., .3, .25) * fb * 1.7);              // feedback vortex
    col += vec3(1., .08, .04) * lens * .22 * (.5 + low);             // eye glow
    float roll = fract(uv.y - t * .09);
    col *= 1. - .05 * smoothstep(0., .015, roll) * smoothstep(.05, .015, roll);
    if (p.x < 0. || p.x > 1. || p.y < 0. || p.y > 1.) col = vec3(0.);
    o = vec4(col, 1.);
  }`;
  const BLIT = `#version 300 es
  precision mediump float; uniform sampler2D s; in vec2 uv; out vec4 o; void main(){ o = texture(s, uv); }`;

  const P = { on: false, ok: false };
  window.OC_POSSESS = P;
  let gl, cv, prog, blit, quad, srcTex, fb = [], tex = [], ping = 0, W = 1280, H = 717, U = {};
  const eye = { x: .5, y: .5, tx: .5, ty: .5, on: 0, last: 0 };

  P.init = (stage, before) => {
    cv = document.createElement('canvas'); cv.id = 'possess'; cv.width = W; cv.height = H;
    Object.assign(cv.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', display: 'none', pointerEvents: 'none' });
    stage.insertBefore(cv, before);
    gl = cv.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) return false;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const mk = (fs) => { const p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p)); return p; };
    try { prog = mk(FS); blit = mk(BLIT); } catch (e) { console.warn('POSSESS shader', e); return false; }
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const mkTex = () => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; };
    srcTex = mkTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    for (let i = 0; i < 2; i++) {
      tex[i] = mkTex(); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      fb[i] = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb[i]); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex[i], 0);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    for (const n of ['src', 'prev', 'res', 'eye', 't', 'low', 'mid', 'high', 'beat', 'summon', 'glitch', 'eyeOn', 'calm']) U[n] = gl.getUniformLocation(prog, n);
    // the eye follows the pointer over the machine
    addEventListener('pointermove', (e) => {
      const b = cv.getBoundingClientRect(); if (!b.width) return;
      eye.tx = (e.clientX - b.left) / b.width; eye.ty = 1 - (e.clientY - b.top) / b.height; eye.last = performance.now();
    }, { passive: true });
    P.ok = true; return true;
  };

  P.set = (on, hideEls) => {
    P.on = on && P.ok; cv.style.display = P.on ? 'block' : 'none';
    hideEls.forEach((el) => { el.style.visibility = P.on ? 'hidden' : 'visible'; });
  };

  // called every frame by the machine with the current picture and readings
  P.frame = (source, r) => {
    if (!P.on) return;
    const now = performance.now();
    // the eye wanders on its own when nobody is moving the pointer
    if (now - eye.last > 2500) { const t = now / 1000; eye.tx = .5 + .18 * Math.sin(t * .37); eye.ty = .5 + .12 * Math.sin(t * .23 + 1); }
    eye.x += (eye.tx - eye.x) * .08; eye.y += (eye.ty - eye.y) * .08;
    eye.on += ((now - eye.last < 2500 ? 1 : .55) - eye.on) * .05;
    const ready = source && (source.tagName === 'VIDEO' ? source.readyState >= 2 : source.complete && source.naturalWidth);
    gl.bindTexture(gl.TEXTURE_2D, srcTex);
    if (ready) { gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source); } catch (e) { /* not ready */ } }
    const draw = (p) => { gl.useProgram(p); const loc = gl.getAttribLocation(p, 'a'); gl.bindBuffer(gl.ARRAY_BUFFER, quad); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); };
    // effect pass into the next feedback buffer
    const nxt = 1 - ping;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb[nxt]); gl.viewport(0, 0, W, H);
    gl.useProgram(prog);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, srcTex); gl.uniform1i(U.src, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex[ping]); gl.uniform1i(U.prev, 1);
    gl.uniform2f(U.res, W, H); gl.uniform2f(U.eye, eye.x, eye.y);
    gl.uniform1f(U.t, now / 1000); gl.uniform1f(U.low, r.low); gl.uniform1f(U.mid, r.mid); gl.uniform1f(U.high, r.high);
    gl.uniform1f(U.beat, r.beat); gl.uniform1f(U.summon, r.summon); gl.uniform1f(U.glitch, r.glitch); gl.uniform1f(U.eyeOn, eye.on); gl.uniform1f(U.calm, r.calm);
    draw(prog);
    // show it
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
    gl.useProgram(blit); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex[nxt]); gl.uniform1i(gl.getUniformLocation(blit, 's'), 0);
    draw(blit);
    ping = nxt;
  };
})();
