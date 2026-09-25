// ============================================================
// Backgrounds, the emergency-broadcast frame, smoke, beams, and the Ranking's logo.
// ============================================================
const LAYERS = {};
function layer(name) {
  let L = LAYERS[name || 'main'];
  if (!L) { const c = document.createElement('canvas'); c.width = W; c.height = H; L = LAYERS[name || 'main'] = c.getContext('2d'); }
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalAlpha = 1; L.globalCompositeOperation = 'source-over'; L.shadowBlur = 0;
  return L;
}

// ---------- the dark world
function bgDark(ctx, glowY, glowA) {
  ctx.fillStyle = D.void;
  ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W / 2, glowY === undefined ? 900 : glowY, 0, W / 2, glowY === undefined ? 900 : glowY, 1250);
  g.addColorStop(0, rgba(D.wine, glowA === undefined ? 0.55 : glowA));
  g.addColorStop(0.55, rgba(D.blood, 0.22));
  g.addColorStop(1, rgba(D.void, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}
// drifting smoke: soft blobs, seeded
function smoke(ctx, t, a, seed, y0, y1) {
  const r = mulberry(seed || 5);
  ctx.save();
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = lerp(y0 || 0, y1 || H, r()), rad = 220 + r() * 380;
    const dx = Math.sin(t * 0.13 + i) * 60, dy = -t * (8 + r() * 12);
    const g = ctx.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad);
    g.addColorStop(0, `rgba(120,30,36,${0.10 * (a === undefined ? 1 : a)})`);
    g.addColorStop(1, 'rgba(120,30,36,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2);
  }
  ctx.restore();
}
// scattered pairs of wolf eyes in the dark (avoid a rectangle, e.g. the text block)
function eyesField(ctx, t, n, seed, a, avoid, sMin, sMax) {
  const r = mulberry(seed);
  let placed = 0, guard = 0;
  while (placed < n && guard++ < 400) {
    const x = 60 + r() * (W - 120), y = 140 + r() * (H - 280), s = lerp(sMin || 0.18, sMax || 0.42, r()), ph = r() * 20;
    if (avoid && x > avoid[0] && x < avoid[2] && y > avoid[1] && y < avoid[3]) continue;
    const blink = Math.abs(Math.sin(t * 0.7 + ph)) > 0.985 ? 0.1 : 1;
    const flick = 0.55 + 0.45 * Math.sin(t * 1.3 + ph * 3);
    eyesInDark(ctx, x, y, s, (a === undefined ? 1 : a) * flick * (0.4 + 0.6 * s / (sMax || 0.42)), blink);
    placed++;
  }
}
// diagonal hazard stripes in a band
function hazard(ctx, x, y, w, h, t, a) {
  ctx.save();
  ctx.globalAlpha *= a === undefined ? 1 : a;
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.fillStyle = D.red; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = D.void;
  const step = 44, off = (t * 60) % (step * 2);
  for (let k = -h - step * 2; k < w + h; k += step * 2) {
    ctx.beginPath();
    ctx.moveTo(x + k + off, y + h); ctx.lineTo(x + k + off + h, y); ctx.lineTo(x + k + off + h + step, y); ctx.lineTo(x + k + off + step, y + h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}
// the emergency broadcast frame: pill + date on top, a ticker at the bottom
function alertUI(ctx, t, o) {
  o = o || {};
  const a = o.a === undefined ? 1 : o.a;
  ctx.save();
  ctx.globalAlpha *= a;
  // thin red frame
  ctx.strokeStyle = rgba(D.red, 0.55); ctx.lineWidth = 3;
  ctx.strokeRect(34, 34, W - 68, H - 68);
  // corner ticks
  ctx.strokeStyle = D.hot; ctx.lineWidth = 6;
  for (const [cx, cy, sx, sy] of [[34, 34, 1, 1], [W - 34, 34, -1, 1], [34, H - 34, 1, -1], [W - 34, H - 34, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * 60); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * 60, cy); ctx.stroke();
  }
  // "ALERTA" pill with a blinking dot
  const blink = Math.sin(t * 6) > -0.2 ? 1 : 0.25;
  ctx.fillStyle = D.red; rrect(ctx, 78, 110, 250, 64, 32); ctx.fill();
  ctx.fillStyle = `rgba(255,255,255,${blink})`; ctx.beginPath(); ctx.arc(112, 142, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = FONT(800, 32); ctx.textBaseline = 'middle';
  ctx.fillText('ALERTA', 136, 144);
  ctx.textAlign = 'right'; ctx.fillStyle = D.bone; ctx.font = FONT(700, 30);
  ctx.fillText('ELEIÇÕES 2026', W - 80, 130);
  ctx.fillStyle = D.ash; ctx.font = FONT(600, 24);
  ctx.fillText('AO POVO BRASILEIRO', W - 80, 164);
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
  // bottom ticker
  if (o.ticker !== false) {
    const y = H - 150;
    ctx.fillStyle = rgba(D.red, 0.92); ctx.fillRect(34, y, W - 68, 62);
    ctx.fillStyle = D.void; ctx.fillRect(34, y, 190, 62);
    ctx.fillStyle = D.hot; ctx.font = FONT(800, 26); ctx.fillText('URGENTE', 64, y + 41);
    ctx.save(); ctx.beginPath(); ctx.rect(224, y, W - 258, 62); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.font = FONT(700, 27);
    const msg = 'DIA 4 DE OUTUBRO  •  LOBOS EM PELE DE CORDEIRO  •  CONSULTE ANTES DE VOTAR  •  ';
    const mw = ctx.measureText(msg).width, off = (t * 120) % mw;
    for (let x = 240 - off; x < W; x += mw) ctx.fillText(msg, x, y + 41);
    ctx.restore();
  }
  ctx.restore();
}
// big condensed headline lines, centred; returns bottom y
function headline(ctx, lines, y, size, o) {
  o = o || {};
  const lh = size * (o.lh || 0.98);
  lines.forEach((ln, i) => {
    const text = typeof ln === 'string' ? ln : ln.t;
    const col = typeof ln === 'string' ? (o.color || D.bone) : ln.c;
    const sz = typeof ln === 'string' ? size : (ln.s || size);
    const fs = fitSize(ctx, text, o.weight || 900, sz, o.track || 0, o.maxW || 960);
    ctx.save();
    ctx.font = FONT(o.weight || 900, fs);
    ctx.textAlign = 'center';
    if (typeof ln !== 'string' && ln.box) {
      const w = ctx.measureText(text).width + fs * 0.4;
      ctx.fillStyle = ln.box;
      ctx.save(); ctx.translate(W / 2, y + i * lh - fs * 0.34); ctx.transform(1, 0, -0.12, 1, 0, 0);
      ctx.fillRect(-w / 2, -fs * 0.52, w, fs * 1.0);
      ctx.restore();
    }
    if (o.echo) { ctx.fillStyle = o.echo; ctx.fillText(text, W / 2 + fs * 0.045, y + i * lh + fs * 0.045); }
    if (o.glow) { ctx.shadowColor = col; ctx.shadowBlur = o.glow; }
    ctx.fillStyle = col;
    ctx.fillText(text, W / 2, y + i * lh);
    ctx.restore();
  });
  return y + (lines.length - 1) * lh;
}

// ---------- the Ranking's world
function bgNavy(ctx, glowY, glowA) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.ink); g.addColorStop(1, C.navy);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = ctx.createRadialGradient(W / 2, glowY || 900, 0, W / 2, glowY || 900, 1000);
  r.addColorStop(0, `rgba(60,100,255,${glowA === undefined ? 0.3 : glowA})`); r.addColorStop(1, 'rgba(60,100,255,0)');
  ctx.fillStyle = r; ctx.fillRect(0, 0, W, H);
}
function dotGrid(ctx, t, alpha, step) {
  step = step || 54;
  const off = (t * 9) % step;
  ctx.fillStyle = `rgba(160,180,255,${alpha})`;
  for (let y = -step; y < H + step; y += step) for (let x = step / 2; x < W; x += step) ctx.fillRect(x - 1.5, y - off - 1.5, 3, 3);
}
// the round mark, in vector, knocked out on its own layer (cx, cy = disc centre, s = logo px -> screen px)
function drawMark(ctx, cx, cy, s, color, a) {
  const M = LOGO_MARK, L = layer('mark');
  L.clearRect(0, 0, W, H);
  L.translate(cx, cy); L.scale(s, s); L.translate(-M.cx, -M.cy);
  L.fillStyle = color || '#fff';
  L.beginPath(); L.arc(M.cx, M.cy, M.r, 0, TAU); L.fill();
  L.globalCompositeOperation = 'destination-out';
  const [ax0, ay0, ax1, ay1, ar] = M.abacus, [ex0, ey0, ex1, ey1] = M.echinus;
  L.beginPath();
  L.moveTo(ax0, ay0); L.lineTo(ax1, ay0); L.lineTo(ax1, ay1 - ar); L.quadraticCurveTo(ax1, ay1, ax1 - ar, ay1);
  L.lineTo(ax0 + ar, ay1); L.quadraticCurveTo(ax0, ay1, ax0, ay1 - ar); L.closePath(); L.fill();
  L.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
  for (const [x0, top] of M.bars) {
    L.beginPath();
    L.moveTo(x0, top + M.barR); L.quadraticCurveTo(x0, top, x0 + M.barR, top);
    L.lineTo(x0 + M.barW, top); L.lineTo(x0 + M.barW, M.cy + M.r + 10); L.lineTo(x0, M.cy + M.r + 10); L.closePath(); L.fill();
  }
  ctx.save(); ctx.globalAlpha *= a === undefined ? 1 : a;
  ctx.drawImage(L.canvas, 0, 0);
  ctx.restore();
}
// full lockup (mark + "Ranking dos políticos" + "15 Anos"), top-left at (x0, y0), scale s
function drawLockup(ctx, x0, y0, s, a, noAnos) {
  const B = LOGO_BBOX, M = LOGO_MARK;
  const L2S = (x, y) => [x0 + (x - B[0]) * s, y0 + (y - B[1]) * s];
  ctx.save();
  ctx.globalAlpha *= a === undefined ? 1 : a;
  for (const g of LOGO_GLYPHS) {
    if (noAnos && (g.name === '15' || ['A', 'n3', 'o4', 's3'].includes(g.name))) continue;
    const [x, y] = L2S(g.x, g.y);
    ctx.drawImage(ASSETS.atlas, g.sx, g.sy, g.w, g.h, x, y, g.w * s, g.h * s);
  }
  ctx.restore();
  const [mx, my] = L2S(M.cx, M.cy);
  drawMark(ctx, mx, my, s, '#fff', a);
  return { w: (B[2] - B[0]) * s, h: (B[3] - B[1]) * s, markX: mx, markY: my, markR: M.r * s };
}
