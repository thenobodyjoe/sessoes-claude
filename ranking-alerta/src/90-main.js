// ============================================================
// Frame orchestration, the player, and the hooks for the tools.
//   index.html            poster; click (or Space) plays from the top with sound
//   index.html?t=12.5     a single frame, for checking
//   index.html?kv=3       key visual 3 (tools/keyvisuals.py)
// Keys while playing: Space/Enter restart, M mute, F or double-click fullscreen.
// ============================================================
const cv = document.getElementById('reel');
cv.width = W; cv.height = H;
const SCN = document.createElement('canvas');
SCN.width = W; SCN.height = H;
const sctx = SCN.getContext('2d');

// the scene on screen at t (the transitions draw both sides)
function drawScene(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0; ctx.setLineDash([]);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  if (t < SC.palco) { const u = seg(t, 9.6, SC.palco); if (u > 0) tvOff(ctx, t, u, sceneChamado); else sceneChamado(ctx, t); }
  else if (t < SC.congresso) scenePalco(ctx, t);
  else if (t < SC.sorrisos) sceneCongresso(ctx, t);
  else if (t < SC.mascaras) sceneSorrisos(ctx, t);
  else if (t < SC.virada) sceneMascaras(ctx, t);
  else if (t < SC.nota) sceneVirada(ctx, t);
  else if (t < 42.12) whip(ctx, t, SC.nota, 42.12, sceneVirada, sceneNota);
  else if (t < SC.tempo) sceneNota(ctx, t);
  else if (t < SC.fim) sceneTempo(ctx, t);
  else sceneFim(ctx, t);
}

const STATS = { ms: 0 };
// Render piece time t (seconds). samples > 1 accumulates sub-frames across the shutter (shutter * dt
// seconds centred on t) for real motion blur.
function renderFrame(t, samples, dt, shutter) {
  const t0 = performance.now();
  samples = Math.max(1, samples | 0);
  // the fast moves (the tilt into the sky, the TV switching off) get a longer, denser shutter
  if (samples > 1 && t > SC.nota - 0.05 && t < 42.17) samples *= 6;
  else if (samples > 1 && t > 9.58 && t < SC.palco) samples *= 3;
  if (samples === 1) {
    drawScene(sctx, t);
    glUpload(SCN);
    glPost(false, postAt(t));
  } else {
    const span = (shutter === undefined ? 0.5 : shutter) * (dt || 1 / 30);
    for (let i = 0; i < samples; i++) {
      const ts = clamp(t + ((i + 0.5) / samples - 0.5) * span, 0, DUR - 1e-4);
      drawScene(sctx, ts);
      glUpload(SCN);
      glAccumulate(i === 0, 1 / samples);
    }
    glPost(true, postAt(t));
  }
  STATS.ms = performance.now() - t0;
  return STATS;
}

// the poster: the end card, dimmed, with a play button (or a quiet "loading" while the sound renders)
function renderPoster(sec) {
  drawScene(sctx, 64.0);
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.fillStyle = 'rgba(4,7,22,0.66)'; sctx.fillRect(0, 0, W, H);
  const ready = !!PLAY.buf;
  sctx.save();
  sctx.translate(540, 960);
  if (ready) {
    const s = 1 + 0.03 * Math.sin(sec * 2.5);
    sctx.scale(s, s);
    sctx.fillStyle = C.yellow; sctx.beginPath(); sctx.arc(0, 0, 110, 0, TAU); sctx.fill();
    sctx.fillStyle = C.text; sctx.beginPath(); sctx.moveTo(-32, -50); sctx.lineTo(58, 0); sctx.lineTo(-32, 50); sctx.closePath(); sctx.fill();
  } else {
    sctx.strokeStyle = rgba(C.yellow, 0.9); sctx.lineWidth = 10; sctx.lineCap = 'round';
    sctx.beginPath(); sctx.arc(0, 0, 70, sec * 5, sec * 5 + 4.2); sctx.stroke();
  }
  sctx.restore();
  label(sctx, ready ? 'Clique para assistir (com som)' : 'Preparando o som…', 540, 1150, 40, C.white, 'center', 0, 600);
  glUpload(SCN);
  glPost(false, { time: sec, ca: 0.002, glitch: 0, flash: [0, 0, 0, 0], seed: 0, grain: 0.03, vig: 0.5, bloom: 0.4 });
}

// ---------- clock and input
const QS = new URLSearchParams(location.search);
const FIXED_T = QS.has('t') ? parseFloat(QS.get('t')) : null;
const KV_I = QS.has('kv') ? Math.max(0, (parseInt(QS.get('kv'), 10) || 1) - 1) : null;
let mode = QS.has('autoplay') ? 'free' : 'poster';
let paused = false, startMs = performance.now(), errors = 0;

async function start() {
  if (!PLAY.buf || mode === 'fixed' || mode === 'kv' || mode === 'free') return;
  mode = 'play';
  document.body.classList.add('playing');
  try { await audioStart(0); } catch (e) { console.warn('audio unavailable', e); }
  startMs = performance.now();
}
cv.addEventListener('pointerdown', start);
const fullscreen = () => {
  const d = document;
  if (d.fullscreenElement) d.exitFullscreen && d.exitFullscreen();
  else if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(() => {});
};
cv.addEventListener('dblclick', fullscreen);
window.addEventListener('keydown', e => {
  if (e.key === 'm' || e.key === 'M') audioMute(!PLAY.muted);
  else if (e.key === 'f' || e.key === 'F') fullscreen();
  else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); start(); }
});
function tick(now) {
  if (paused) return;
  try {
    if (!ASSETS.ready) { /* wait */ }
    else if (mode === 'poster') renderPoster((now - startMs) / 1000);
    else if (mode === 'done') { /* hold the last frame */ }
    else {
      const ta = audioTime();
      let t = ta !== null ? ta : (now - startMs) / 1000;
      if (mode === 'free') t %= DUR;
      FAST = true;
      renderFrame(Math.min(t, DUR - 1e-3), 1);
      FAST = false;
      if (mode === 'play' && t >= DUR) { audioStop(); document.body.classList.remove('playing'); mode = 'done'; }
    }
  } catch (e) { if (errors++ < 3) console.error(e); }
  requestAnimationFrame(tick);
}

// ---------- key visuals (the approved stills)
function renderKV(i, t) {
  const k = KV[i];
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.shadowBlur = 0;
  sctx.textAlign = 'left'; sctx.textBaseline = 'alphabetic';
  k.draw(sctx, t || 2.0);
  glUpload(SCN);
  glPost(false, postStill(k.dark, t || 2.0));
}

// ---------- hooks (no visible UI)
window.__kv = {
  ready: () => ASSETS.ready,
  count: () => KV.length,
  meta: () => KV.map(k => ({ id: k.id, time: k.time, say: k.say })),
  render: (i, t) => { renderKV(i, t); return cv.toDataURL('image/png'); },
};
window.__reel = {
  ready: () => ASSETS.ready,
  dur: () => DUR,
  render: (t, samples, dt, shutter) => renderFrame(t, samples, dt, shutter),
  pause: () => { paused = true; },
  resume: () => { if (paused) { paused = false; requestAnimationFrame(tick); } },
  audioWav: (sr, parts) => audioWav(sr, parts),
  // contact sheet of piece times (seconds)
  sheet: (times, cols, scale, samples) => {
    cols = cols || 4; scale = scale || 0.2;
    const w = Math.round(W * scale), h = Math.round(H * scale), rows = Math.ceil(times.length / cols);
    let c = document.getElementById('__sheet');
    if (!c) { c = document.createElement('canvas'); c.id = '__sheet'; c.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#111;z-index:9'; document.body.appendChild(c); }
    c.width = w * cols; c.height = h * rows;
    const x = c.getContext('2d');
    x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    x.font = `bold ${Math.max(11, Math.round(w * 0.075))}px sans-serif`;
    times.forEach((t, i) => {
      renderFrame(t, samples || 1, 1 / 30);
      const px = (i % cols) * w, py = Math.floor(i / cols) * h;
      x.drawImage(cv, px, py, w, h);
      x.fillStyle = 'rgba(0,0,0,0.6)'; x.fillRect(px, py, w * 0.42, w * 0.1);
      x.fillStyle = '#ff0'; x.fillText(t.toFixed(2), px + 4, py + w * 0.08);
    });
    return c.toDataURL('image/png');
  },
};

glInit(cv);
loadAssets().then(() => {
  if (KV_I !== null) { mode = 'kv'; renderKV(Math.min(KV_I, KV.length - 1), 2.0); return; }
  if (FIXED_T !== null && isFinite(FIXED_T)) { mode = 'fixed'; renderFrame(FIXED_T, 1); return; }
  if (mode === 'poster') audioPrepare().catch(e => console.warn('audio unavailable', e));
  requestAnimationFrame(tick);
}).catch(e => console.error(e));
