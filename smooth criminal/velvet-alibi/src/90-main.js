// ============================================================
// Frame orchestration, clock, input and the test hooks
// ============================================================
const bufBGd = new StrokeBuf(), bufSH = new StrokeBuf(), bufFG = new StrokeBuf();
let setsBuilt = false;
const STATS = { frames: 0, lastMs: 0, strokes: 0, verts: 0 };
const DARKGROUND = [0.03, 0.025, 0.04];
const NOPOOL = [-1e5, -1e5, 1, 1];
const pieceT = T => modT(T);

// flashes on the big hits: [beat, colour, strength, decay per beat]
const FLASHES = [[16, [1.0, 0.85, 0.6], 0.3, 6], [32, [1, 0.95, 0.85], 0.22, 7], [36, [1, 0.95, 0.85], 0.2, 7], [50, [0.8, 0.9, 1], 0.25, 5]];
function flashAt(b) {
  let best = [0, 0, 0, 0];
  for (const [b0, c, k, d] of FLASHES) {
    if (b < b0 || b > b0 + 2) continue;
    const a = k * Math.exp(-(b - b0) * d);
    if (a > best[3]) best = [c[0], c[1], c[2], a];
  }
  return best;
}
function baseComposite(o) {
  return Object.assign({
    amb: [1, 1, 1], wCol: [0, 0, 0], cCol: [0, 0, 0], ground: DARKGROUND,
    wPool: NOPOOL, wPool2: NOPOOL, cPool: NOPOOL, cPool2: NOPOOL,
    grain: 0, relief: 2.1, floorY: -1, time: 0, refl: 0, waterY: -1,
    pop: 0, grid: 1, popSeed: 0, gal: 0, frame: [0, 0, 1, 1],
    galAmb: [0.5, 0.45, 0.42], galWarm: [0, 0, 0], galPool: NOPOOL,
    flash: [0, 0, 0, 0], fade: 0, vig: 0.9
  }, o);
}

function renderFrame(tp) {
  const t0ms = performance.now();
  glResize();
  if (!setsBuilt) { buildSets(); setsBuilt = true; }
  const t = pieceT(tp), b = t / BEAT;
  G.t = t; G.b = b;
  const cast = castAt(t);
  const lead = cast[0].J;
  const cam = cameraAt(t);
  const Ls = lightsFor(b);
  G.cam = cam; G.tint = LOOK.tint; G.rimW = LOOK.rimW; G.rimC = LOOK.rimC; G.pop = false; G.wI = Ls.wI; G.cI = Ls.cI;
  const camProj = p => project(cam, p);

  // ---- moving atmosphere on top of the static room
  G.mode = 'paint'; G.layer = 'bg'; G.mid = 0;
  G.buf = bufBGd; bufBGd.reset(); G.proj = camProj; G.boil = Math.floor(t * 6); G.jit = 0.5; G.rev = null;
  drawSmoke(t, b, cam, lead);

  // ---- floor shadows from the follow-spot
  G.buf = bufSH; bufSH.reset(); G.mode = 'mask'; G.layer = 'sh'; G.rev = null; G.boil = Math.floor(t * 12);
  if (spotOn(b) > 0.05) {
    for (const c of cast) {
      G.maskCol = [1, 0, 0]; G.proj = p => projectShadow(cam, Ls.w, p, 0);
      drawSilSuit(c.J);
    }
  }

  // ---- the people, far to near
  G.buf = bufFG; bufFG.reset(); G.mode = 'paint'; G.layer = 'fg'; G.proj = camProj;
  G.boil = Math.floor(t * 12); G.jit = REDUCED ? 0.35 : 0.7; G.rev = null;
  const order = cast.slice().sort((p, q) => p.J.pelvis.z - q.J.pelvis.z);
  for (const c of order) {
    const J = c.J;
    G.wDir = vnorm(V(Ls.w.x - J.chest.x, Math.max(60, Ls.w.y - J.chest.y), Ls.w.z - J.chest.z));
    G.cDir = vnorm(V(Ls.c.x - J.chest.x, Math.max(30, Ls.c.y - J.chest.y), Ls.c.z - J.chest.z));
    drawSuit(J, c.style);
  }
  G.mid = 0;

  // ---- GPU passes
  const vp = camVP(cam), boilBG = Math.floor(t * (REDUCED ? 2 : 6));
  glDrawStrokes(SET.club, T_BG, { world: true, vp, boil: boilBG, jit: 0.6, tIn: 1e4, tOut: -1e4 });
  glDrawStrokes(bufBGd, T_BG, { noClear: true, tIn: t, tOut: t });
  glDrawStrokes(bufSH, T_SH, { mask: true, tIn: t, tOut: t });
  glDrawStrokes(bufFG, T_FG, { tIn: t, tOut: t });

  // ---- composite: a dim warm room, a cool wash from the windows, one hard warm pool where he stands
  const U = baseComposite({ time: t, grain: (Math.floor(t * 12) % 61) * 1.37, flash: flashAt(b), relief: 2.3, vig: 0.95 });
  const on = spotOn(b);
  const [lx, lz] = leadXZ(b - 0.25);
  const spotR = 1 - 0.22 * smoothstep(49.6, 50.6, b);           // the iris closes a little for the lean
  const pulse = 0.5 + 0.5 * hitPulse('kick', t, 0.18);
  Object.assign(U, {
    amb: [0.36, 0.26, 0.25],
    wCol: scalec([1.55, 1.16, 0.78], on), cCol: [0.30 + 0.05 * pulse, 0.56 + 0.05 * pulse, 1.0],
    wPool: poolAt(cam, V(lx, 0, lz + 6), 165 * spotR, 52 * spotR),
    wPool2: poolAt(cam, V(lx, 105, WALL_Z + 6), 120 * spotR, 190 * spotR),
    cPool: poolAt(cam, V(-60, 200, WALL_Z), 560, 230),
    cPool2: poolAt(cam, V(120, 0, -40), 340, 62),
    refl: 0.42,
    floorY: CH - project(cam, V(lx, 0, lz + 2)).y
  });
  // fade up from black, and down to black at the very end
  U.fade = Math.max(1 - smoothstep(0, 1.1, t), smoothstep(DUR - 0.9, DUR - 0.05, t));
  // a breath of exposure on the backbeat
  const sn = Math.max(hitPulse('snare', t, 0.09), hitPulse('clap', t, 0.09));
  if (0.03 * sn > U.flash[3]) U.flash = [1, 0.94, 0.86, 0.03 * sn];
  glComposite(U);
  STATS.frames++;
  STATS.lastMs = performance.now() - t0ms;
  STATS.strokes = bufBGd.count + bufSH.count + bufFG.count + SET.club.count;
  STATS.verts = bufBGd.nv + bufSH.nv + bufFG.nv + SET.club.nv;
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

// Picture time follows the audio clock while the music is playing; otherwise the page clock.
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
    if (mode === 'ready') renderFrame(0);
    else { audioPump(); renderFrame(nowPieceTime(now)); }
  } catch (e) { if (errors++ < 3) console.error(e); }
  requestAnimationFrame(tick);
}
window.__rick = {
  render: t => { renderFrame(t); return STATS; },
  stats: () => STATS,
  pause: () => { if (!paused) { paused = true; pausedAt = performance.now(); } },
  resume: () => { if (paused) { paused = false; if (startMs !== null) startMs += performance.now() - pausedAt; requestAnimationFrame(tick); } },
  score: () => SCORE.length,
  audioWav: (sr, peakDb) => audioRenderWav(sr, peakDb),
  audio: async (b0, b1, only) => { const r = await audioMeasure(b0, b1, only); window.__mix = r.buf; delete r.buf; return r; },
  // debug contact sheet: render piece times into a grid over the page
  sheet: (times, cols, scale) => {
    cols = cols || 4; scale = scale || 0.25;
    const w = Math.round(CW * scale), h = Math.round(CH * scale), rows = Math.ceil(times.length / cols);
    let c = document.getElementById('__sheet');
    if (!c) { c = document.createElement('canvas'); c.id = '__sheet'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#111;z-index:9'; document.body.appendChild(c); }
    c.width = w * cols; c.height = h * rows;
    const x = c.getContext('2d');
    x.font = `${Math.round(h * 0.07)}px sans-serif`;
    times.forEach((t, i) => {
      renderFrame(t);
      x.drawImage(cv, (i % cols) * w, Math.floor(i / cols) * h, w, h);
      x.fillStyle = '#ff0'; x.fillText(`t=${t.toFixed(2)}  b=${(t / BEAT).toFixed(1)}`, (i % cols) * w + 6, Math.floor(i / cols) * h + h * 0.09);
    });
    return times.length;
  },
  unsheet: () => { const c = document.getElementById('__sheet'); if (c) c.remove(); },
  zoom: (t, fx0, fy0, fx1, fy1) => {
    renderFrame(t);
    let c = document.getElementById('__sheet');
    if (!c) { c = document.createElement('canvas'); c.id = '__sheet'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#111;z-index:9'; document.body.appendChild(c); }
    const sx = fx0 * CW, sy = fy0 * CH, sw = (fx1 - fx0) * CW, sh = (fy1 - fy0) * CH;
    c.width = Math.round(sw); c.height = Math.round(sh);
    c.getContext('2d').drawImage(cv, sx, sy, sw, sh, 0, 0, c.width, c.height);
    return [c.width, c.height];
  }
};
if (FIXED_T !== null && isFinite(FIXED_T)) { mode = 'fixed'; renderFrame(FIXED_T); }
else requestAnimationFrame(tick);
