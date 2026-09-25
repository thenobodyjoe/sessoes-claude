// ============================================================
// Frame orchestration, the clock, input and test hooks.
// ============================================================
const cv = document.getElementById('reel');
cv.width = W; cv.height = H;
const SCN = document.createElement('canvas');
SCN.width = W; SCN.height = H;
const sctx = SCN.getContext('2d');
const LAYERS = {};
function layer(name) {
  name = name || 'main';
  let L = LAYERS[name];
  if (!L) { const c = document.createElement('canvas'); c.width = W; c.height = H; L = LAYERS[name] = c.getContext('2d'); }
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
  return L;
}

// which scenes are on screen at beat b, and in what order (a later scene draws its own background
// first; the earlier one finishes its exit on top of it)
function drawScene(ctx, b) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (b < SC.flag) sceneHook(ctx, b);
  else if (b < SC.hemi) sceneFlag(ctx, b);
  else if (b < 10.8) sceneHemi(ctx, b, 'all');
  else if (b < 11.35) { sceneUI(ctx, b, true); sceneHemi(ctx, b, 'fg'); }
  else if (b < 17.0) sceneUI(ctx, b, true);
  else if (b < 17.35) { sceneClock(ctx, b, true); sceneUI(ctx, b, false); }
  else if (b < 19.97) { sceneClock(ctx, b, true); wipeBars(ctx, b); }
  else if (b < 23.3) { sceneUrna(ctx, b, true); wipeBars(ctx, b); }
  else if (b < 24.0) { sceneLogo(ctx, b, 'bg'); sceneUrna(ctx, b, false); sceneLogo(ctx, b, 'fg'); }
  else sceneLogo(ctx, b, 'all');
}

const STATS = { ms: 0 };
// Render piece time t (seconds). samples > 1 accumulates sub-frames across the shutter (shutter * dt
// seconds centred on t) for real motion blur.
function renderFrame(t, samples, dt, shutter) {
  const t0 = performance.now();
  samples = Math.max(1, samples | 0);
  if (samples === 1) {
    drawScene(sctx, storyBeat(t / BEAT));
    glUpload(SCN);
    glPost(false, postAt(t));
  } else {
    const span = (shutter === undefined ? 0.5 : shutter) * (dt || 1 / 60);
    for (let i = 0; i < samples; i++) {
      const ts = clamp(t + ((i + 0.5) / samples - 0.5) * span, 0, DUR - 1e-4);
      drawScene(sctx, storyBeat(ts / BEAT));
      glUpload(SCN);
      glAccumulate(i === 0, 1 / samples);
    }
    glPost(true, postAt(t));
  }
  STATS.ms = performance.now() - t0;
  return STATS;
}

// the poster before anyone clicks: the end card, dimmed, with a play button
function renderPoster(sec) {
  drawScene(sctx, 31);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.fillStyle = 'rgba(4,7,22,0.62)'; sctx.fillRect(0, 0, W, H);
  const s = 1 + 0.04 * Math.sin(sec * 3);
  sctx.save();
  sctx.translate(540, 960); sctx.scale(s, s);
  sctx.fillStyle = C.yellow; sctx.beginPath(); sctx.arc(0, 0, 110, 0, TAU); sctx.fill();
  sctx.fillStyle = C.text; sctx.beginPath(); sctx.moveTo(-32, -50); sctx.lineTo(58, 0); sctx.lineTo(-32, 50); sctx.closePath(); sctx.fill();
  sctx.restore();
  label(sctx, 'Toque para assistir (com som)', 540, 1150, 40, C.white, 'center', 0, 600);
  glUpload(SCN);
  glPost(false, { time: sec, ca: 0.002, glitch: 0, flash: [0, 0, 0, 0], seed: 0, grain: 0.04, vig: 0.5, bloom: 0.4 });
}

// ---------- clock and input
const QS = new URLSearchParams(location.search);
const FIXED_T = QS.has('t') ? parseFloat(QS.get('t')) : null;
let mode = QS.has('autoplay') ? 'play' : 'poster';
let paused = false, startMs = performance.now(), errors = 0;

async function start() {
  if (mode === 'play' && PLAY.src) return;
  mode = 'play';
  cv.style.cursor = 'default';
  try { await audioStart(); } catch (e) { console.warn('audio unavailable', e); }
  startMs = performance.now();
}
cv.addEventListener('pointerdown', start);
cv.addEventListener('dblclick', () => {
  const d = document;
  if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
  else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
});
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') audioMute(!PLAY.muted);
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); }
});
function tick(now) {
  if (paused) return;
  try {
    if (!ASSETS.ready) { /* wait */ }
    else if (mode === 'poster') renderPoster((now - startMs) / 1000);
    else {
      const ta = audioTime();
      const t = ta !== null ? ta : (((now - startMs) / 1000) % DUR);
      renderFrame(t, 1);
    }
  } catch (e) { if (errors++ < 3) console.error(e); }
  requestAnimationFrame(tick);
}

// ---------- hooks (no visible UI)
window.__reel = {
  ready: () => ASSETS.ready,
  dur: () => DUR,
  render: (t, samples, dt, shutter) => renderFrame(t, samples, dt, shutter),
  pause: () => { paused = true; },
  resume: () => { if (paused) { paused = false; requestAnimationFrame(tick); } },
  audioWav: (sr, peakDb) => audioWav(sr, peakDb),
  audio: () => audioMeasure(),
  // contact sheet of piece times (seconds), drawn over the page
  sheet: (times, cols, scale) => {
    cols = cols || 4; scale = scale || 0.25;
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    let c = document.getElementById('__sheet');
    if (!c) { c = document.createElement('canvas'); c.id = '__sheet'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#111;z-index:9'; document.body.appendChild(c); }
    c.width = w * cols; c.height = h * rows;
    const x = c.getContext('2d');
    x.font = `${Math.round(w * 0.07)}px sans-serif`;
    times.forEach((t, i) => {
      renderFrame(t, 1);
      x.drawImage(cv, (i % cols) * w, Math.floor(i / cols) * h, w, h);
      x.fillStyle = '#ff0'; x.fillText(`t=${t.toFixed(2)} sb=${storyBeat(t / BEAT).toFixed(2)}`, (i % cols) * w + 6, Math.floor(i / cols) * h + w * 0.09);
    });
    return c.toDataURL('image/png');
  },
};

glInit(cv);
loadAssets().then(() => {
  if (FIXED_T !== null && isFinite(FIXED_T)) { mode = 'fixed'; renderFrame(FIXED_T, 1); }
  else requestAnimationFrame(tick);
}).catch(e => console.error(e));
