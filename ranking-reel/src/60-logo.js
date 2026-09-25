// ============================================================
// Scene 7 (beats 23.3-32): the logo, built from metamorphic shapes.
// The letters of FIM and the keys of the urna come loose, turn into shapes that never stop changing
// (circle, rhombus, square, triangle, star...) and orbit. They are swallowed one by one by a white disc
// that wobbles like liquid as each one lands, then settles into a perfect circle. The column capital
// slides in from the sides; three dots rise from below and stretch into the ranking bars; each one
// turns into a cut-out as it lands. The mark slides left, the wordmark is born letter by letter
// from shapes, "15 Anos" comes out from behind the disc, and the call to action lands on the downbeat.
// ============================================================
const LS = 0.78;                                              // final lockup scale (logo px -> screen px)
const LX = (W - (LOGO_BBOX[2] - LOGO_BBOX[0]) * LS) / 2;      // lockup left edge on screen
const LY = 668;                                               // lockup top edge on screen
const L2S = (x, y) => [LX + (x - LOGO_BBOX[0]) * LS, LY + (y - LOGO_BBOX[1]) * LS];
const MARK_F = L2S(LOGO_MARK.cx, LOGO_MARK.cy);
const HERO = { x: 540, y: 905, s: 1.52 };

function markT(b) {
  const u = E.inOutExpo(seg(b, 26.25, 26.95));
  const x = lerp(HERO.x, MARK_F[0], u), y = lerp(HERO.y, MARK_F[1], u) - Math.sin(u * Math.PI) * 40;
  return { x, y, s: lerp(HERO.s, LS, u), u };
}

// ---------- the cut-outs, in mark-local units (logo px about the disc centre)
const CUT = (() => {
  const M = LOGO_MARK, cx = M.cx, cy = M.cy;
  const [ax0, ay0, ax1, ay1, ar] = M.abacus, [ex0, ey0, ex1, ey1] = M.echinus;
  const out = {
    abacus: S_.rrect(ax0 - cx, ay0 - cy, ax1 - ax0, ay1 - ay0, 0, [0, 0, ar, ar]),
    echinus: S_.rrect(ex0 - cx, ey0 - cy, ex1 - ex0, ey1 - ey0, 0),
    bars: M.bars.map(([x0, top]) => S_.rrect(x0 - cx, top - cy, M.barW, 260 - (top - cy), 0, [M.barR, 0, 0, 0])),
  };
  out.abacusC = [(ax0 + ax1) / 2 - cx, (ay0 + ay1) / 2 - cy];
  out.echinusC = [(ex0 + ex1) / 2 - cx, (ey0 + ey1) / 2 - cy];
  out.pillA = S_.rect(out.abacusC[0], out.abacusC[1], 70, 30, 15);
  out.pillE = S_.rect(out.echinusC[0], out.echinusC[1], 70, 30, 15);
  out.dots = M.bars.map(([x0, top]) => S_.circle(x0 - cx + M.barW / 2, top - cy + M.barW / 2, M.barW / 2));
  return out;
})();
// [move window start, end, land start, land end, colour]
const CUT_T = {
  abacus: [24.85, 25.25, 25.18, 25.34, C.yellow],
  echinus: [25.1, 25.5, 25.43, 25.6, C.sky],
  bars: [[25.35, 25.75, 25.68, 25.85, C.green], [25.6, 26.0, 25.93, 26.1, C.yellow], [25.85, 26.25, 26.18, 26.35, C.blue]],
};

// ---------- the swarm
const SWARM_COLS = [C.yellow, C.green, C.blue, C.white, C.sky];
let SWARM = null;
function buildSwarm(ctx) {
  const items = [];
  const r = mulberry(2026);
  // the letters of FIM (from the urna screen)
  ctx.save();
  for (const l of fimLayout(ctx)) {
    const [x, y] = urnaToScreen(23.3, l.x, l.y);
    items.push({ kind: 'letter', ch: l.ch, sx: x, sy: y, ax: l.w * 0.42 / 0.85, ay: 66 / 0.85, col0: '#1E2522' });
  }
  ctx.restore();
  // keys and buttons
  for (let k = 0; k < 10; k++) {
    const [kx, ky] = urnaKey(k);
    const [x, y] = urnaToScreen(23.3, kx + URNA.keyW / 2, ky + URNA.keyH / 2);
    items.push({ kind: 'key', sx: x, sy: y, ax: URNA.keyW / 2 / 0.85, ay: URNA.keyH / 2 / 0.85, col0: '#1C1D22' });
  }
  URNA.btns.forEach(([t, bx, bw, col]) => {
    const [x, y] = urnaToScreen(23.3, bx + bw / 2, URNA.btnY + URNA.btnH / 2);
    items.push({ kind: 'key', sx: x, sy: y, ax: bw / 2 / 0.85, ay: URNA.btnH / 2 / 0.85, col0: col });
  });
  // a few more that fly in from outside the frame
  for (let k = 0; k < 8; k++) {
    const a = r() * TAU;
    items.push({ kind: 'extra', sx: 540 + Math.cos(a) * 1300, sy: 905 + Math.sin(a) * 1300, ax: 20, ay: 20, col0: SWARM_COLS[k % 5] });
  }
  const N = items.length;
  items.forEach((it, i) => {
    it.col = SWARM_COLS[i % SWARM_COLS.length];
    it.R = 175 + r() * 300;
    it.th = (i / N) * TAU + r() * 0.4;
    it.w = (1.6 + r() * 1.2) * (r() < 0.5 ? 1 : 1.25);
    it.size = 20 + r() * 30;
    it.ph = r() * 8;
    it.phs = 1.6 + r() * 1.4;
    it.g0 = 23.3 + i * 0.012;
    it.a = 24.5 + (i / N) * 0.55;            // when it is absorbed into the disc
  });
  SWARM = items;
}
function orbitPos(it, b) {
  const tt = (b - 23.3) * BEAT;
  const spin = it.th + it.w * tt + 1.4 * E.inCubic(seg(b, 24.0, 25.2)) * it.w;
  const R = it.R * (1 - 0.35 * pr(b, 24.0, 24.9, E.outCubic)) * (1 + 0.12 * kick(b, 24, 5));
  return [HERO.x + Math.cos(spin) * R, HERO.y + Math.sin(spin) * R * 0.92, spin];
}

const _A = new Float32Array(NP * 2), _B = new Float32Array(NP * 2), _P = new Float32Array(NP * 2);

function drawSwarm(ctx, b) {
  if (!SWARM) buildSwarm(ctx);
  const disc = discRadius(b) * HERO.s;
  for (const it of SWARM) {
    const g = E.inOutCubic(seg(b, it.g0, it.g0 + 0.6));
    const ab = seg(b, it.a, it.a + 0.3);
    if (ab >= 1) continue;
    const ph = it.ph + (b - 23.3) * it.phs;
    // motion trails: ghosts at earlier times
    for (let ghost = 3; ghost >= 0; ghost--) {
      const bb = b - ghost * 0.035;
      if (ghost && (bb < 23.95 || ab > 0.2)) continue;
      const gg = E.inOutCubic(seg(bb, it.g0, it.g0 + 0.6));
      let [ox, oy, spin] = orbitPos(it, bb);
      let x = lerp(it.sx, ox, gg), y = lerp(it.sy, oy, gg) - Math.sin(gg * Math.PI) * 140;
      let size = it.size * (1 + 0.25 * kick(bb, 24, 6));
      if (ab > 0) {
        const k = E.inCubic(ab);
        const dx = x - HERO.x, dy = y - HERO.y, d = Math.hypot(dx, dy) || 1;
        x = lerp(x, HERO.x + dx / d * disc * 0.75, k); y = lerp(y, HERO.y + dy / d * disc * 0.75, k);
        size *= 1 - k;
      }
      // start shape (the key / letter box) -> the ever-changing shape
      xformPts(UNIT.square, it.sx, it.sy, it.ax, 0, _A, it.ay);
      xformPts(cyclePts(ph), x, y, size, spin * 0.6, _B);
      const P = gg < 1 ? morphPts(_A, _B, gg, _P) : _B;
      ctx.globalAlpha = ghost ? 0.14 * (4 - ghost) / 3 : 1;
      fillPts(ctx, P, gg < 1 ? mix(it.col0, it.col, E.outCubic(seg(bb, it.g0, it.g0 + 0.3))) : it.col);
      // a FIM letter lights up as it leaves the screen, then dissolves into its shape
      if (!ghost && it.kind === 'letter' && b < it.g0 + 0.45) {
        const la = 1 - seg(b, it.g0 + 0.1, it.g0 + 0.4);
        ctx.save();
        ctx.globalAlpha = la;
        ctx.font = FONT(900, 190); ctx.textAlign = 'center';
        ctx.fillStyle = mix('#1E2522', '#FFFFFF', seg(b, 23.3, 23.42));
        const tx = lerp(it.sx, x, gg), ty = lerp(it.sy, y, gg);
        ctx.fillText(it.ch, tx, ty + 66);
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// disc radius in logo px: grows as the swarm feeds it
function discRadius(b) {
  return LOGO_MARK.r * E.outBack(seg(b, 24.3, 25.05), 1.5);
}
// liquid wobble: low harmonics that ring after each absorption and die away by beat 25.9
function discPts(b, out) {
  const R = discRadius(b);
  const env = seg(b, 24.3, 24.6) * (1 - seg(b, 25.3, 25.95));
  const a2 = 0.07 * env * Math.sin(b * 13.1), a3 = 0.05 * env * Math.sin(b * 17.3 + 1), a5 = 0.03 * env * Math.sin(b * 23.9 + 2);
  for (let k = 0; k < NP; k++) {
    const th = -Math.PI / 2 + (k / NP) * TAU;
    const r = R * (1 + a2 * Math.sin(2 * th + b * 3) + a3 * Math.sin(3 * th - b * 4) + a5 * Math.sin(5 * th + b * 6));
    out[k * 2] = Math.cos(th) * r; out[k * 2 + 1] = Math.sin(th) * r;
  }
  return out;
}

// where a cut-out is (mark-local polygon), and how landed it is
function cutState(name, i, b) {
  const T = name === 'bars' ? CUT_T.bars[i] : CUT_T[name];
  const p = seg(b, T[0], T[1]);
  if (p <= 0) return null;
  const land = seg(b, T[2], T[3]);
  let P;
  if (name === 'bars') {
    const e = E.outBack(p, 1.25);
    morphPts(CUT.dots[i], CUT.bars[i], E.inOutCubic(seg(p, 0.25, 1)), _P);
    const dy = (1 - e) * 330;
    for (let k = 0; k < NP; k++) _P[k * 2 + 1] += dy;
    P = _P;
  } else {
    const e = E.outExpo(p);
    const src = name === 'abacus' ? CUT.pillA : CUT.pillE, dst = CUT[name];
    morphPts(src, dst, E.inOutCubic(seg(p, 0.3, 1)), _P);
    const dx = (name === 'abacus' ? -1 : 1) * (1 - e) * 560;
    for (let k = 0; k < NP; k++) _P[k * 2] += dx;
    P = _P;
  }
  return { P, land, col: T[4] };
}

// logo layer: disc + cut-outs + wordmark + 15 Anos, drawn together so one light sweep can cross it all
function drawLogo(ctx, b) {
  const L = layer('logo');
  L.setTransform(1, 0, 0, 1, 0, 0);
  L.clearRect(0, 0, W, H);
  const T = markT(b);
  const A = ASSETS.atlas;
  const glyph = (name, a, dx, dy, sc) => {
    const g = ASSETS.glyph[name];
    if (!g || a <= 0) return;
    const [x, y] = L2S(g.x, g.y);
    const w = g.w * LS, h = g.h * LS;
    L.save();
    L.globalAlpha = a;
    L.translate(x + w / 2 + (dx || 0), y + h / 2 + (dy || 0));
    if (sc && sc !== 1) L.scale(sc, sc);
    L.drawImage(A, g.sx, g.sy, g.w, g.h, -w / 2, -h / 2, w, h);
    L.restore();
  };
  // "15" comes out from behind the disc; "Anos" writes itself on
  const q15 = seg(b, 27.3, 27.85);
  if (q15 > 0) {
    const g = ASSETS.glyph['15'];
    const [gx, gy] = L2S(g.x + g.w / 2, g.y + g.h / 2);
    const e = E.outBack(q15, 1.6);
    glyph('15', Math.min(1, q15 * 3), (MARK_F[0] - gx) * (1 - e) * 0.7, (MARK_F[1] - gy) * (1 - e) * 0.7, lerp(0.5, 1, e));
  }
  ['A', 'n3', 'o4', 's3'].forEach((n, j) => {
    const q = seg(b, 27.55 + j * 0.06, 27.85 + j * 0.06);
    glyph(n, q, -18 * (1 - E.outExpo(q)), 0, 1);
  });
  // the disc, with its knock-outs
  if (b >= 24.3) {
    const D = discPts(b, _A);
    xformPts(D, T.x, T.y, T.s, 0, _B);
    fillPts(L, _B, '#fff');
    L.globalCompositeOperation = 'destination-out';
    const cuts = [['abacus', 0], ['echinus', 0], ['bars', 0], ['bars', 1], ['bars', 2]];
    for (const [n, i] of cuts) {
      const st = cutState(n, i, b);
      if (!st || st.land <= 0) continue;
      L.globalAlpha = st.land;
      fillPts(L, xformPts(st.P, T.x, T.y, T.s, 0, _B), '#000');
    }
    L.globalAlpha = 1;
    L.globalCompositeOperation = 'source-over';
  }
  // the wordmark: every letter is born as a little morphing shape
  const WORD = [['R', 'a', 'n', 'k', 'i', 'n2', 'g'], ['d', 'o', 's', 'p', 'o2', 'l', 'ii', 't', 'i2', 'c', 'o3', 's2']];
  const born = [];
  WORD.forEach((line, li) => line.forEach((n, j) => {
    const b0 = li === 0 ? 26.6 + j * 0.07 : 26.95 + j * 0.045;
    const p = seg(b, b0, b0 + 0.55);
    if (p <= 0) return;
    const gp = seg(p, 0.3, 1);
    glyph(n, Math.min(1, gp * 2), 0, 26 * (1 - E.outExpo(gp)), lerp(0.7, 1, E.outBack(gp, 2)));
    if (p < 0.7) born.push([n, p, li * 10 + j]);
  }));
  // light sweep across the whole lockup
  const sw = seg(b, 27.95, 28.65);
  if (sw > 0 && sw < 1) {
    L.globalCompositeOperation = 'source-atop';
    const x = lerp(-300, W + 300, E.inOutCubic(sw));
    const g = L.createLinearGradient(x - 160, 0, x + 160, 0);
    g.addColorStop(0, 'rgba(255,210,63,0)'); g.addColorStop(0.5, 'rgba(255,225,120,0.95)'); g.addColorStop(1, 'rgba(255,210,63,0)');
    L.fillStyle = g;
    L.save(); L.translate(x, 900); L.transform(1, 0, -0.35, 1, 0, 0); L.translate(-x, -900);
    L.fillRect(x - 170, 500, 340, 800);
    L.restore();
    L.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(L.canvas, 0, 0);
  // the shapes the letters are born from (on top)
  for (const [n, p, seed] of born) {
    const g = ASSETS.glyph[n];
    const [x, y] = L2S(g.x + g.w / 2, g.y + g.h / 2);
    const s = 26 * E.outBack(seg(p, 0, 0.35), 2) * (1 - seg(p, 0.3, 0.7));
    if (s <= 0.2) continue;
    fillPts(ctx, xformPts(cyclePts(seed * 0.7 + p * 3), x, y - 10, s, p * 4), SWARM_COLS[seed % 5]);
  }
  // cut-outs on their way in, still solid and coloured
  const cuts = [['abacus', 0], ['echinus', 0], ['bars', 0], ['bars', 1], ['bars', 2]];
  for (const [n, i] of cuts) {
    const st = cutState(n, i, b);
    if (!st || st.land >= 1) continue;
    ctx.globalAlpha = 1 - st.land;
    fillPts(ctx, xformPts(st.P, T.x, T.y, T.s, 0, _B), st.col);
  }
  ctx.globalAlpha = 1;
}

// drifting background shapes for the end card
function ambient(ctx, b) {
  const a = seg(b, 24.2, 25.5);
  if (a <= 0) return;
  const r = mulberry(77);
  for (let i = 0; i < 16; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 18 + r() * 30, sz = 10 + r() * 22, ph = r() * 8, col = SWARM_COLS[i % 5];
    const y = ((y0 - (b - 24) * sp) % (H + 100) + H + 100) % (H + 100) - 50;
    ctx.globalAlpha = 0.13 * a;
    fillPts(ctx, xformPts(cyclePts(ph + b * 0.6), x0 + Math.sin(b * 0.7 + i) * 30, y, sz, b * 0.3 + i), col);
  }
  ctx.globalAlpha = 1;
}

function sceneLogo(ctx, b, part) {
  if (part !== 'fg') {
    bgNavy(ctx, b, C.ink, C.navy, 900);
    glow(ctx, HERO.x, HERO.y, 700, '#3A64FF', 0.22 * seg(b, 24.2, 25) + 0.12 * kick(b, 28, 3));
    ambient(ctx, b);
    // shockwaves on the two big hits
    for (const [b0, x, y, col] of [[24, HERO.x, HERO.y, C.white], [28, MARK_F[0], MARK_F[1], C.yellow]]) {
      const q = seg(b, b0, b0 + 1.4);
      if (q <= 0 || q >= 1) continue;
      ctx.strokeStyle = rgba(col, 0.5 * (1 - q)); ctx.lineWidth = 10 * (1 - q) + 1;
      ctx.beginPath(); ctx.arc(x, y, 80 + E.outExpo(q) * 900, 0, TAU); ctx.stroke();
    }
    if (part === 'bg') return;
  }
  if (b < 25.4) drawSwarm(ctx, b);
  drawLogo(ctx, b);
  burst(ctx, b, 24.0, HERO.x, HERO.y, 22, 11, 700);
  burst(ctx, b, 28.0, MARK_F[0], MARK_F[1], 26, 12, 820);

  // end card
  const tag = pr(b, 28.0, 28.6);
  if (tag > 0) {
    ctx.save();
    ctx.globalAlpha = tag;
    label(ctx, 'ELEIÇÕES 2026', 540, 470 - 24 * (1 - tag), 34, C.yellow, 'center', 10, 700);
    ctx.fillStyle = rgba(C.yellow, 0.7);
    const lw = 120 * pr(b, 28.1, 28.8);
    ctx.fillRect(540 - 205 - lw, 458, lw, 3); ctx.fillRect(540 + 205, 458, lw, 3);
    ctx.restore();
  }
  kLine(ctx, b, { text: 'Consulte antes de votar.', x: 540, y: 1215, size: 60, weight: 700, maxW: 940, tIn: 28.05, style: 'rise', mask: true, stagger: 0.02, dur: 0.8 });
  // the button (the tap's confetti goes behind it)
  burst(ctx, b, 29.65, 700, 1370, 12, 21, 300);
  const bq = seg(b, 28.3, 28.95);
  if (bq > 0) {
    const press = bump1(b, 29.65);
    const s = E.outBack(bq, 2) * (1 - 0.05 * press) * (1 + 0.025 * kick(b, 30, 4) + 0.025 * kick(b, 31, 4));
    ctx.save();
    ctx.translate(540, 1345); ctx.scale(s, s);
    ctx.font = FONT(800, 64);
    const tw = ctx.measureText('ranking.org.br').width, w = tw + 150, h = 124;
    ctx.shadowColor = rgba(C.yellow, 0.55); ctx.shadowBlur = 50 + 30 * kick(b, 29.65, 3);
    rrect(ctx, -w / 2, -h / 2, w, h, h / 2); ctx.fillStyle = C.yellow; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = C.text;
    ctx.fillText('ranking.org.br', -w / 2 + 60, 22);
    // arrow
    const ax = w / 2 - 62 + 8 * Math.sin(Math.max(0, b - 29) * 5.5) * seg(b, 29, 29.3);
    ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = C.text;
    ctx.beginPath(); ctx.moveTo(ax - 20, 0); ctx.lineTo(ax + 12, 0); ctx.moveTo(ax - 2, -16); ctx.lineTo(ax + 14, 0); ctx.lineTo(ax - 2, 16); ctx.stroke();
    ctx.restore();
  }
  kLine(ctx, b, { text: 'Leva só 2 minutos.', x: 540, y: 1490, size: 40, weight: 500, maxW: 900, tIn: 28.7, style: 'rise', mask: true, stagger: 0.02, dur: 0.8, color: C.mute });
  // tap
  const [px, py] = pathAt([[28.9, 1180, 1800], [29.55, 700, 1370], [29.9, 712, 1382], [30.8, 1180, 1900]], b);
  ripple(ctx, 700, 1370, b, 29.65, C.yellow, 160);
  pointer(ctx, px, py, bump1(b, 29.65), pr(b, 28.9, 29.1) * (1 - seg(b, 30.3, 30.8)));
}
