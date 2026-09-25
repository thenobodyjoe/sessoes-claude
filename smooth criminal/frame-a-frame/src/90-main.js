// ============================================================
// Frame orchestration, clock, input and the test hooks.
// Piece time t shows clip frame t * FPS: the room first, then the dancers far to near, then the
// composite (impasto relief, the light pools pulsing with the drums, canvas grain).
// ============================================================
const bufBG = new StrokeBuf(), bufSH = new StrokeBuf(), bufFG = new StrokeBuf();
const STATS = { frames: 0, lastMs: 0, strokes: 0, verts: 0, people: 0 };
const NOPOOL = [-1e5, -1e5, 1, 1];
let clothBuilt = false;

function baseComposite(o) {
  return Object.assign({
    amb: [1, 1, 1], wCol: [0, 0, 0], cCol: [0, 0, 0], ground: [0.03, 0.03, 0.05],
    wPool: NOPOOL, wPool2: NOPOOL, cPool: NOPOOL, cPool2: NOPOOL,
    grain: 0, relief: 2.2, floorY: -1, time: 0, refl: 0, waterY: -1,
    pop: 0, grid: 1, popSeed: 0, gal: 0, frame: [0, 0, 1, 1],
    galAmb: [0.5, 0.45, 0.42], galWarm: [0, 0, 0], galPool: NOPOOL,
    flash: [0, 0, 0, 0], fade: 0, vig: 0.9
  }, o);
}
// a pool from the light map to the composite: [cx, cy (from the bottom), rx, ry] in device px
function poolPx(p, k) {
  const r = p[2] * VH * VIEW.s * k;
  return [sx(p[0]), CH - sy(p[1]), r * 1.25, r];
}

function renderFrame(tp) {
  const t0ms = performance.now();
  glResize();
  viewFit();
  if (!clothBuilt) { buildCloth(); clothBuilt = true; }
  const t = modT(tp);
  const ff = clamp(t * FPS, 0, NF - 1);
  G.t = t; G.b = (t - BEAT0) / BEAT;
  const pools = poolsAt(ff);
  const kick = hitPulse('kick', t, 0.16), snare = Math.max(hitPulse('snare', t, 0.1), hitPulse('clap', t, 0.1));
  const crash = hitPulse('crash', t, 0.5);

  // ---- the room
  G.buf = bufBG; bufBG.reset(); G.boil = Math.floor(t * 6); G.jit = 0.6; G.rev = null;
  const tShot = paintRoom(ff, t);

  // ---- the dancers, far (small) to near (big)
  G.buf = bufFG; bufFG.reset(); G.mode = 'paint'; G.layer = 'fg';
  G.boil = Math.floor(t * 12); G.jit = REDUCED ? 0.4 : 0.8; G.rev = null;
  const F = roomAt(ff);
  const light = { pools, pulse: kick, room: (x, y) => roomSample(F, x, y) };
  const people = peopleAt(ff).sort((a, b) => clipScale(a.P) - clipScale(b.P));
  const fPrev = Math.floor(ff) - 2;
  for (const p of people) {
    let prevP = null;
    if (fPrev >= 0 && SHOT_OF[fPrev] === SHOT_OF[Math.floor(ff)]) {
      const q = FRAME_PEOPLE[fPrev].find(r => r.id === p.id);
      if (q) prevP = q.P;
    }
    paintDancer(p, light, prevP);
  }

  // ---- GPU passes. After a cut the room paints itself in with a quick sweep (the clock runs 2.5x).
  glDrawStrokes(bufBG, T_BG, { tIn: tShot * 2.5, tOut: 0 });
  glDrawStrokes(bufSH, T_SH, { mask: true });
  glDrawStrokes(bufFG, T_FG, { tIn: 1e4, tOut: -1e4 });

  const [wp, cp] = pools;
  const U = baseComposite({ time: t, grain: (Math.floor(t * 12) % 61) * 1.37, relief: 2.3, vig: 1.0 });
  Object.assign(U, {
    amb: [0.9, 0.88, 0.92],
    wCol: scalec([0.55, 0.36, 0.14], clamp(wp[3] * 1.4, 0, 1) * (0.7 + 0.5 * kick)),
    cCol: scalec([0.12, 0.26, 0.5], clamp(cp[3] * 1.4, 0, 1) * (0.8 + 0.3 * snare)),
    wPool: poolPx(wp, 1.0), wPool2: poolPx(wp, 0.5), cPool: poolPx(cp, 1.0), cPool2: NOPOOL
  });
  if (crash > 0.05) U.flash = [1, 0.9, 0.72, 0.1 * crash];
  U.fade = Math.max(1 - smoothstep(0, 0.8, t), smoothstep(DUR - 0.8, DUR - 0.02, t));
  glComposite(U);

  STATS.frames++;
  STATS.lastMs = performance.now() - t0ms;
  STATS.strokes = bufBG.count + bufFG.count;
  STATS.verts = bufBG.nv + bufFG.nv;
  STATS.people = people.length;
}

// ============================================================
// Clock, input, hooks
// ============================================================
const QS = new URLSearchParams(location.search);
const FIXED_T = QS.has('t') ? parseFloat(QS.get('t')) : null;
let mode = QS.has('autoplay') ? 'play' : 'ready';
let startMs = mode === 'play' ? performance.now() : null;
let errors = 0, paused = false, pausedAt = 0;

function start() {
  if (mode !== 'ready') { if (AUDIO.ctx && AUDIO.ctx.state === 'suspended') AUDIO.ctx.resume(); return; }
  mode = 'play';
  startMs = performance.now();
  const hint = document.getElementById('hint');
  if (hint) hint.remove();
  try { audioStart(0); } catch (e) { console.warn('audio unavailable', e); AUDIO.running = false; }
}
cv.addEventListener('pointerdown', start);
cv.addEventListener('dblclick', () => {
  const d = document;
  if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
  else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
});
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') audioMute(!AUDIO.muted);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); }
});

let audioWasRunning = false;
function nowPieceTime(now) {
  const tPerf = (now - startMs) / 1000;
  const running = AUDIO.running && AUDIO.ctx && AUDIO.ctx.state === 'running';
  if (running && !audioWasRunning && Math.abs(audioPieceTime() - tPerf) > 0.08) audioAnchor(tPerf);
  audioWasRunning = running;
  if (!running) return tPerf;
  const ta = audioPieceTime();
  startMs = now - ta * 1000;
  return ta;
}
function tick(now) {
  if (paused) return;
  try {
    if (mode === 'ready') renderFrame(1.2);
    else { audioPump(); renderFrame(nowPieceTime(now)); }
  } catch (e) { if (errors++ < 3) console.error(e); }
  requestAnimationFrame(tick);
}
const sheetCanvas = () => {
  let c = document.getElementById('__sheet');
  if (!c) { c = document.createElement('canvas'); c.id = '__sheet'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#111;z-index:9'; document.body.appendChild(c); }
  return c;
};
window.__rick = {
  render: t => { renderFrame(t); return STATS; },
  frame: f => { renderFrame((f + 0.001) / FPS); return STATS; },
  stats: () => STATS,
  pause: () => { if (!paused) { paused = true; pausedAt = performance.now(); } },
  resume: () => { if (paused) { paused = false; if (startMs !== null) startMs += performance.now() - pausedAt; requestAnimationFrame(tick); } },
  audioWav: (sr, peakDb) => audioRenderWav(sr, peakDb),
  audio: async (b0, b1, only) => { const r = await audioMeasure(b0, b1, only); window.__mix = r.buf; delete r.buf; return r; },
  // debug contact sheet of clip frames
  sheet: (frames, cols, scale) => {
    cols = cols || 4; scale = scale || 0.25;
    const w = Math.round(CW * scale), h = Math.round(CH * scale), rows = Math.ceil(frames.length / cols);
    const c = sheetCanvas();
    c.width = w * cols; c.height = h * rows;
    const x = c.getContext('2d');
    x.font = `${Math.round(h * 0.08)}px sans-serif`;
    frames.forEach((f, i) => {
      renderFrame((f + 0.001) / FPS);
      x.drawImage(cv, (i % cols) * w, Math.floor(i / cols) * h, w, h);
      x.fillStyle = '#ff0'; x.fillText(`f${f}`, (i % cols) * w + 6, Math.floor(i / cols) * h + h * 0.1);
    });
    return frames.length;
  },
  unsheet: () => { const c = document.getElementById('__sheet'); if (c) c.remove(); }
};
if (FIXED_T !== null && isFinite(FIXED_T)) { mode = 'fixed'; renderFrame(FIXED_T); }
else requestAnimationFrame(tick);
