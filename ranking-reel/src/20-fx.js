// ============================================================
// Shared pieces: backgrounds, the pointer, tap ripples, confetti of morphing shapes.
// ============================================================
function bgNavy(ctx, b, top, bot, glowY) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top || C.ink);
  g.addColorStop(1, bot || C.navy);
  ctx.fillStyle = g;
  ctx.fillRect(-W, -H, W * 3, H * 3);
  if (glowY !== undefined) {
    const r = ctx.createRadialGradient(W / 2, glowY, 0, W / 2, glowY, 900);
    r.addColorStop(0, 'rgba(60,100,255,0.28)');
    r.addColorStop(1, 'rgba(60,100,255,0)');
    ctx.fillStyle = r;
    ctx.fillRect(-W, -H, W * 3, H * 3);
  }
}
// a faint dot grid drifting upward: the "data" texture under the UI scenes
function dotGrid(ctx, b, alpha, step) {
  step = step || 54;
  const off = (b * 9) % step;
  ctx.fillStyle = `rgba(160,180,255,${alpha})`;
  for (let y = -step; y < H + step; y += step) {
    for (let x = step / 2; x < W; x += step) {
      ctx.fillRect(x - 1.5, y - off - 1.5, 3, 3);
    }
  }
}

// the pointer (arrow cursor) with a press squash
function pointer(ctx, x, y, press, alpha) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  const s = 1.55 * (1 - 0.14 * press);
  ctx.scale(s, s);
  ctx.rotate(-0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(11, 36); ctx.lineTo(19, 55); ctx.lineTo(27, 51); ctx.lineTo(19, 33); ctx.lineTo(34, 33);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = C.text; ctx.stroke();
  ctx.restore();
}
function ripple(ctx, x, y, b, b0, color, maxR) {
  const p = seg(b, b0, b0 + 1.1);
  if (p <= 0 || p >= 1) return;
  ctx.save();
  ctx.strokeStyle = color || '#fff';
  for (let k = 0; k < 2; k++) {
    const q = seg(p, k * 0.18, 1);
    if (q <= 0) continue;
    ctx.globalAlpha = (1 - q) * 0.9;
    ctx.lineWidth = 6 * (1 - q) + 1;
    ctx.beginPath(); ctx.arc(x, y, (maxR || 90) * E.outExpo(q), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}

// a burst of little morphing shapes flying out from (x, y) at beat b0
const BURST_COLS = [C.yellow, C.green, C.blue, C.white, C.sky];
function burst(ctx, b, b0, x, y, n, seed, spread, cols, sizeK) {
  const T = b - b0;
  if (T < 0 || T > 4) return;
  const r = mulberry(seed);
  cols = cols || BURST_COLS;
  for (let i = 0; i < n; i++) {
    const ang = r() * TAU, sp = (0.4 + r() * 0.6) * (spread || 520);
    const life = 1.4 + r() * 1.6;
    const q = T / life;
    if (q >= 1) { r(); r(); r(); continue; }
    const d = sp * (1 - Math.exp(-T * 3.2)) / 1.0;
    const px = x + Math.cos(ang) * d, py = y + Math.sin(ang) * d + T * T * 40;
    const sz = (6 + r() * 16) * (sizeK || 1) * (1 - E.inCubic(q));
    const col = cols[Math.floor(r() * cols.length)];
    const ph = r() * 8 + T * 2.2;
    ctx.globalAlpha = 1 - E.inCubic(q);
    fillPts(ctx, xformPts(cyclePts(ph), px, py, sz, T * (r() - 0.5) * 6), col);
  }
  ctx.globalAlpha = 1;
}

// soft glow disc (additive-looking) used for spotlights and hits
function glow(ctx, x, y, r, color, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

// camera shake from a list of impacts [[beat, px], ...]
function shakeAt(b, list) {
  let x = 0, y = 0;
  for (const [b0, amp] of list) {
    const k = kick(b, b0, 7) * amp;
    if (k < 0.05) continue;
    x += noise1(b * 38 + b0 * 3) * k;
    y += noise1(b * 41 + b0 * 7 + 50) * k;
  }
  return [x, y];
}
