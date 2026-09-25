// ============================================================
// The dark half (0 - 38.1 s): an emergency broadcast. Every scene moves into its key visual
// (40-kv.js) on the words of the voice-over, holds it, and leaves on the next pause.
// ============================================================

// ---------- shared motion helpers
function cam(ctx, s, dx, dy, px, py) { ctx.translate(px + dx, py + dy); ctx.scale(s, s); ctx.translate(-px, -py); }
// decaying shake from [[t0, px], ...]
function shake(t, hits, rate) {
  let x = 0, y = 0;
  for (const [t0, a] of hits) {
    const k = a * kick(t, t0, rate || 9);
    if (k > 0.05) { x += noise1(t * 38 + t0 * 5) * k; y += noise1(t * 41 + t0 * 3 + 70) * k; }
  }
  return [x, y];
}
// a lamp switched on at t0, with the stutter of a real one (0..1)
function lampOn(t, t0) {
  if (t < t0) return 0;
  const u = t - t0;
  return u < 0.05 ? 1 : u < 0.09 ? 0.15 : u < 0.13 ? 0.9 : u < 0.17 ? 0.35 : 1;
}
// idle sway of each politician in the crowd
const bob = (t, rr) => Math.sin(t * 2.1 + rr * 40) * 2.2;

// animated headline(): same layout as the key visual; every line comes in on its own time.
// lines: string | { t, c, box, s, at, ats (per-letter times), style, out }
// o: { color, weight, lh, at, gap, style ('rise'|'slam'|'pop'), dur, stagger, echo, out, outStyle, maxW, a }
function hlA(ctx, t, lines, y, size, o) {
  o = o || {};
  const lh = size * (o.lh || 0.98), w8 = o.weight || 900;
  lines.forEach((ln, i) => {
    if (typeof ln === 'string') ln = { t: ln };
    const text = ln.t, col = ln.c || o.color || D.bone;
    const fs = fitSize(ctx, text, w8, ln.s || size, 0, o.maxW || 960);
    const yy = y + i * lh;
    const tIn = ln.ats ? ln.ats[0] : ln.at !== undefined ? ln.at : (o.at || 0) + i * (o.gap === undefined ? 0.15 : o.gap);
    const tOut = ln.out !== undefined ? ln.out : o.out;
    if (t < tIn - 0.1 || (tOut !== undefined && t > tOut + 0.8)) return;
    const style = ln.style || o.style || 'rise';
    ctx.save();
    if (o.a !== undefined) ctx.globalAlpha *= o.a;
    if (ln.box) {
      const L = layoutLine(ctx, text, w8, fs, 0), bw = L.w + fs * 0.4;
      const p = E.outExpo(seg(t, tIn - 0.06, tIn + 0.3)), q = tOut !== undefined ? E.inExpo(seg(t, tOut, tOut + 0.3)) : 0;
      if (p > 0 && q < 1) {
        ctx.save();
        ctx.fillStyle = ln.box; ctx.translate(W / 2, yy - fs * 0.34); ctx.transform(1, 0, -0.12, 1, 0, 0);
        const x0 = -bw / 2 + bw * q;
        ctx.fillRect(x0, -fs * 0.52, -bw / 2 + bw * p - x0, fs);
        ctx.restore();
      }
    }
    const k = { text, x: W / 2, y: yy, size: fs, weight: w8, tIn, ats: ln.ats, style, mask: style === 'rise',
      dur: o.dur || (style === 'slam' ? 0.45 : 0.7), stagger: o.stagger === undefined ? 0.022 : o.stagger,
      tOut, outStyle: o.outStyle, outDur: 0.35, outStagger: 0.008 };
    if (o.echo) kLine(ctx, t, Object.assign({}, k, { x: W / 2 + fs * 0.045, y: yy + fs * 0.045, color: o.echo }));
    kLine(ctx, t, Object.assign(k, { color: col }));
    ctx.restore();
  });
}
// a line typed letter by letter between t0 and t1 (centred), caret while it types
function typeLine(ctx, t, text, x, y, size, weight, color, t0, t1, o) {
  o = o || {};
  const a = o.a === undefined ? 1 : o.a;
  if (t < t0 || a <= 0) return;
  ctx.save();
  ctx.font = FONT(weight, size);
  const L = layoutLine(ctx, text, weight, size, 0);
  const x0 = x - L.w / 2, n = text.length, p = seg(t, t0, t1) * n;
  ctx.fillStyle = color;
  if (o.glow) { ctx.shadowColor = color; ctx.shadowBlur = o.glow; }
  for (let i = 0; i < n && i < p; i++) {
    ctx.globalAlpha = a * Math.min(1, (p - i) * 1.5);
    ctx.fillText(text[i], x0 + L.xs[i], y);
  }
  if (p < n || (t - t1 < 0.5 && Math.sin((t - t1) * 25) > 0)) {
    const ci = Math.min(n, Math.floor(p)), cx = ci >= n ? x0 + L.w + 6 : x0 + L.xs[ci];
    ctx.globalAlpha = a;
    ctx.fillRect(cx, y - size * 0.78, Math.max(3, size * 0.09), size * 0.95);
  }
  ctx.restore();
}
// kicker() whose letters type in, then the rules either side draw outwards
function kickerType(ctx, t, text, y, color, size, t0, t1, a) {
  if (t < t0 || a === 0) return;
  ctx.save();
  ctx.globalAlpha *= a === undefined ? 1 : a;
  ctx.font = FONT(700, size); ctx.textAlign = 'center'; ctx.fillStyle = color;
  const L = layoutLine(ctx, text, 700, size, 6), x0 = W / 2 - L.w / 2, n = text.length, p = seg(t, t0, t1) * n;
  const base = ctx.globalAlpha;
  for (let i = 0; i < n && i < p; i++) {
    ctx.globalAlpha = base * Math.min(1, (p - i) * 1.5);
    ctx.fillText(text[i], x0 + L.xs[i] + L.ws[i] / 2, y);
  }
  const q = E.outExpo(seg(t, t1 - 0.1, t1 + 0.5));
  ctx.globalAlpha = base * 0.7;
  ctx.fillRect(x0 - 30 - 80 * q, y - 11, 80 * q, 3); ctx.fillRect(x0 + L.w + 30, y - 11, 80 * q, 3);
  ctx.restore();
}
// tag() that pops in with an overshoot (scaled about its anchor)
function tagPop(ctx, t, t0, text, x, y, fill, color, size, align, a) {
  const p = seg(t, t0, t0 + 0.55);
  if (p <= 0 || a === 0) return;
  const s = lerp(0.86, 1, E.outExpo(p));
  ctx.save();
  ctx.globalAlpha *= E.outCubic(Math.min(1, p * 2.5)) * (a === undefined ? 1 : a);
  ctx.translate(x, y); ctx.scale(s, s); ctx.translate(-x, -y);
  tag(ctx, text, x, y, fill, color, size, align);
  ctx.restore();
}
// the broadcast switching on: a few frames of stutter
function bootA(t, t0) {
  const u = t - (t0 || 0.1);
  if (u < 0) return 0;
  if (u > 0.45) return 1;
  return hash(Math.floor(u * 30) + 3) > 0.45 ? 1 : 0.15;
}
// the old-TV switch-off: the picture collapses to a line, then to a dot
function tvOff(ctx, t, u, draw) {
  const L = layer('tv');
  draw(L, t);
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const a = seg(u, 0, 0.5), b = seg(u, 0.5, 1);
  const sy = lerp(1, 0.005, E.inCubic(a)), sx = b > 0 ? lerp(1.04, 0, E.inCubic(b)) : 1 + 0.04 * a;
  if (sx > 0.002) {
    ctx.save();
    ctx.translate(540, 960); ctx.scale(sx, sy);
    ctx.drawImage(L.canvas, -540, -960);
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,235,230,${E.inCubic(seg(u, 0.3, 0.55))})`; ctx.fillRect(-540, -960, W, H);
    ctx.restore();
  }
  const d = seg(u, 0.55, 1);
  if (d > 0 && d < 1) {
    const g = ctx.createRadialGradient(540, 960, 0, 540, 960, 90 * (1 - d) + 4);
    g.addColorStop(0, `rgba(255,240,236,${1 - d})`); g.addColorStop(1, 'rgba(255,60,70,0)');
    ctx.fillStyle = g; ctx.fillRect(400, 820, 280, 280);
  }
}

// ============================================================ 1. the call (0 - 9.85)
// "Isso é um chamado ao povo brasileiro: dia 4 de outubro, não vá votar... Não sem antes assistir a este alerta."
function flagDraw(ctx, cx, cy, s, color, lw, glow, p, pb, ps) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ink(ctx, color, lw / s, glow);
  const rh = 4 * Math.hypot(490, 555), ci = TAU * 320;
  ctx.setLineDash([rh * p + 0.01, rh * 2]);
  ctx.beginPath(); ctx.moveTo(0, -555); ctx.lineTo(490, 0); ctx.lineTo(0, 555); ctx.lineTo(-490, 0); ctx.closePath(); ctx.stroke();
  ctx.setLineDash([ci * p + 0.01, ci * 2]);
  ctx.beginPath(); ctx.arc(0, 0, 320, -Math.PI / 2, -Math.PI / 2 + TAU); ctx.stroke();
  ctx.setLineDash([]);
  if (pb > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, 318, 0, TAU); ctx.clip();
    ctx.beginPath(); ctx.rect(-330, -330, 660 * pb, 660); ctx.clip();
    ctx.beginPath(); ctx.arc(-160, 920, 940, 0, TAU); ctx.arc(-160, 920, 998, 0, TAU); ctx.stroke();
    ctx.restore();
  }
  if (ps > 0) {
    const r = mulberry(27);
    ctx.fillStyle = color;
    for (let i = 0; i < 27; i++) {
      const x = (r() * 2 - 1) * 250, y = 20 + r() * 230;
      if (Math.hypot(x, y) > 280) { i--; continue; }
      const rad = 3 + r() * 5, q = seg(ps, (i / 27) * 0.7, (i / 27) * 0.7 + 0.3);
      if (q <= 0) continue;
      ctx.beginPath(); ctx.arc(x, y, rad * E.outCubic(q), 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
function sceneChamado(ctx, t) {
  const on = pr(t, 0.1, 1.2, E.outCubic);
  const [sx, sy] = shake(t, [[4.70, 5], [5.55, 9]], 11);
  bgDark(ctx, 950, 0.6 * on + 0.3 * kick(t, 5.55, 2.5));
  ctx.save();
  cam(ctx, 1 + 0.06 * E.inOutCubic(seg(t, 0, 9.9)), sx, sy, 540, 980);
  smoke(ctx, t, on, 5);
  // wolf eyes open one by one in the dark
  eyesField(ctx, t, 12, 11, 1, [60, 560, 1020, 1400], 0.45, 0.95, k => seg(t, 0.4 + k * 0.21, 0.62 + k * 0.21));
  ctx.save(); ctx.globalAlpha = 0.85;
  flagDraw(ctx, 540, 960, 0.98, D.red, 4, 18, pr(t, 0.25, 2.9, E.inOutCubic), pr(t, 1.7, 3.0, E.inOutCubic), seg(t, 2.3, 3.4));
  // the flag cracks on the slams
  if (t >= 4.70) crack(ctx, 180, 520, 760, 1480, 3, D.void, 12, D.hot);
  if (t >= 5.55) crack(ctx, 900, 640, 330, 1300, 8, D.void, 10, D.hot);
  for (const [t0, x0, y0, x1, y1, sd] of [[4.70, 180, 520, 760, 1480, 3], [5.55, 900, 640, 330, 1300, 8]]) {
    const k = kick(t, t0, 4);
    if (k > 0.02) { ctx.save(); ctx.globalAlpha = k; crack(ctx, x0 + 3, y0 + 2, x1 + 3, y1 + 2, sd, '#FFD0C8', 5); ctx.restore(); }
  }
  ctx.restore();
  const g = ctx.createRadialGradient(540, 1000, 0, 540, 1000, 560);
  g.addColorStop(0, 'rgba(5,2,3,0.85)'); g.addColorStop(1, 'rgba(5,2,3,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 400, W, 1200);
  ctx.restore();

  ctx.save();
  ctx.translate(sx * 0.5, sy * 0.5);
  kickerType(ctx, t, 'UM CHAMADO AO POVO BRASILEIRO', 640, D.bone, 30, 0.15, 2.55);
  tagPop(ctx, t, 3.05, 'DIA 4 DE OUTUBRO', 540, 760, D.red, '#fff', 40);
  // NÃO (4.70) VÁ (5.27) VOTAR. (5.55), slammed word by word, a red echo behind
  const at1 = [4.70, 4.715, 4.73, 0, 5.27, 5.285];
  const at2 = [5.55, 5.565, 5.58, 5.595, 5.61, 5.625];
  hlA(ctx, t, [{ t: 'NÃO VÁ', ats: at1 }, { t: 'VOTAR.', ats: at2 }], 1010, 250, { color: '#FFF4EE', echo: D.red, lh: 0.9, style: 'hit', dur: 0.35 });
  typeLine(ctx, t, 'não sem antes assistir a este alerta.', 540, 1330, 44, 600, D.ash, 6.55, 9.2);
  ctx.restore();
  alertUI(ctx, t, { a: bootA(t, 0.12) });
}

// ============================================================ 2. the stage (9.85 - 13.62)
// "Todo mundo só fala da eleição pra presidente."
const PHONES = [[150, 1700, -0.35], [300, 1760, -0.2], [440, 1720, -0.08], [640, 1740, 0.08], [790, 1705, 0.2], [940, 1760, 0.35]];
const FLASHES = [[2, 11.05], [4, 11.9], [1, 12.6]];
function scenePalco(ctx, t) {
  const L = lampOn(t, 10.07) * (1 - lampOn(t, 13.22));
  const dark = seg(t, 13.22, 13.5);
  bgDark(ctx, 1200, 0.35 * (0.35 + 0.65 * L) + 0.2 * dark);
  ctx.save();
  cam(ctx, 1 + 0.07 * E.inOutCubic(seg(t, 10.0, 13.6)), 0, 0, 540, 900);
  eyesField(ctx, t, 12, 21, 0.5 + 1.2 * dark, [230, 250, 850, 1650], 0.5, 1.0 + 0.25 * dark);
  if (L > 0) {
    ctx.save();
    ctx.globalAlpha = L;
    const cone = ctx.createLinearGradient(0, 0, 0, 1500);
    cone.addColorStop(0, 'rgba(255,236,220,0.30)'); cone.addColorStop(1, 'rgba(255,236,220,0.05)');
    ctx.fillStyle = cone;
    ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(610, 0); ctx.lineTo(860, 1500); ctx.lineTo(220, 1500); ctx.closePath(); ctx.fill();
    const pool = ctx.createRadialGradient(540, 1500, 0, 540, 1500, 380);
    pool.addColorStop(0, 'rgba(255,236,220,0.28)'); pool.addColorStop(1, 'rgba(255,236,220,0)');
    ctx.fillStyle = pool; ctx.fillRect(100, 1300, 880, 400);
    ctx.restore();
  }
  const col = mix(D.smoke, D.bone, L), breath = Math.sin(t * 2.4) * 4;
  human(ctx, 540, 930 + breath, { s: 1.55, lw: 4, variant: 1, color: col, bg: '#1E0A0C', sash: L > 0.5 });
  podium(ctx, 540, 1180, 0.95, col, 4, -40);
  // the crowd raises its phones; flashes go off
  PHONES.forEach(([x, y, r], i) => {
    const p = seg(t, 10.3 + i * 0.1, 10.95 + i * 0.1);
    if (p <= 0) return;
    const yy = y + (1 - E.outExpo(p)) * 380 + Math.sin(t * 1.7 + i * 1.3) * 4;
    phone(ctx, x, yy, 0.95, r, mix(D.smoke, D.bone, 0.35 + 0.65 * L), 3);
    ctx.save(); ctx.translate(x, yy); ctx.rotate(r);
    if (Math.sin(t * 6 + i) > -0.3) { ctx.fillStyle = D.hot; ctx.beginPath(); ctx.arc(-16, -38, 5, 0, TAU); ctx.fill(); }
    ctx.restore();
  });
  for (const [i, t0] of FLASHES) {
    const k = kick(t, t0, 14);
    if (k < 0.02) continue;
    const [x, y, r] = PHONES[i], gx = x + Math.sin(r) * 60, gy = y - 70;
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 200);
    g.addColorStop(0, `rgba(255,255,255,${0.55 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(gx - 200, gy - 200, 400, 400);
  }
  ctx.restore();
  const dim = 1 - 0.55 * dark;
  hlA(ctx, t, [{ t: 'TODOS OS OLHOS', at: 10.1 }, { t: 'NO PRESIDENTE.', c: D.bone, box: D.red, at: 11.75 }], 390, 118, { color: D.bone, a: dim });
  typeLine(ctx, t, 'enquanto isso, no escuro...', 540, 640, 40, 600, D.hot, 12.4, 12.95, { glow: 20 });
  alertUI(ctx, t, { ticker: false });
}

// ============================================================ 3. who decides your life (13.62 - 25.63)
// "Mas é o deputado e o senador que decidem o imposto no seu salário, o remédio que falta no posto de saúde,
//  a lei que garante — ou tira — o seu direito amanhã."
// [enters, the claw strikes] for each card
const CARDS = [[15.96, 16.93], [18.55, 19.52], [21.40, 22.89]];
function clawsReveal(ctx, x, y, s, rot, color, p) {
  if (p <= 0) return;
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath(); ctx.rect(-200 * s, -130 * s, 400 * s, 260 * s * p); ctx.clip();
  ctx.rotate(-rot); ctx.translate(-x, -y);
  claws(ctx, x, y, s, rot, color, 0.95);
  ctx.restore();
}
function cardBody(ctx, t, i, x, y, w, h) {
  const icon = [iconPayslip, iconMedicine, iconLaw][i];
  const [a, b] = [['IMPOSTO NO', 'SEU SALÁRIO'], ['REMÉDIO QUE', 'FALTA NO POSTO'], ['O SEU', 'DIREITO']][i];
  const [, ts] = CARDS[i];
  const hot = kick(t, ts, 5);
  // "a lei que garante": the law glows green, until the claw takes it
  const keep = i === 2 ? pr(t, 21.9, 22.3) * (1 - seg(t, 22.89, 23.0)) : 0;
  ctx.fillStyle = rgba(D.ink, 0.92); rrect(ctx, x, y, w, h, 22); ctx.fill();
  ctx.strokeStyle = keep > 0 ? mix(D.red, D.lamb, keep) : rgba(D.red, 0.8 + 0.2 * hot); ctx.lineWidth = 3 + 3 * hot; ctx.stroke();
  if (keep > 0) { ctx.save(); ctx.globalAlpha = 0.25 * keep; ctx.fillStyle = D.lamb; rrect(ctx, x, y, w, h, 22); ctx.fill(); ctx.restore(); }
  icon(ctx, x + w / 2, y + 140, 0.85, keep > 0 ? mix(D.bone, D.lamb, keep) : D.bone, 4);
  clawsReveal(ctx, x + w / 2 + 6, y + 140, 0.72, 0.35, D.hot, E.outExpo(seg(t, ts, ts + 0.14)));
  ctx.font = FONT(800, 28); ctx.textAlign = 'center'; ctx.fillStyle = D.bone;
  ctx.fillText(a, x + w / 2, y + 300);
  const fl = i === 2 && t > 23.78 && t < 24.3 && Math.sin((t - 23.78) * 60) > 0 ? '#fff' : D.hot;
  ctx.fillStyle = fl; ctx.fillText(b, x + w / 2, y + 340);
  if (hot > 0.02) { ctx.save(); ctx.globalAlpha = 0.35 * hot; ctx.fillStyle = D.hot; rrect(ctx, x, y, w, h, 22); ctx.fill(); ctx.restore(); }
}
function clawCard(ctx, t, i) {
  const [t0, ts] = CARDS[i];
  const p = seg(t, t0, t0 + 0.7);
  if (p <= 0) return;
  const x = 60 + i * 330, y = 1190, w = 300, h = 380;
  const k = kick(t, ts, 7);
  ctx.save();
  ctx.globalAlpha *= Math.min(1, p * 3);
  ctx.translate(noise1(t * 50 + i) * 5 * k, (1 - E.outExpo(p)) * 220 + noise1(t * 47 + i + 9) * 5 * k);
  if (i === 2 && t >= ts) {
    // "ou tira": the card is torn in two along the claw
    const te = E.outCubic(seg(t, ts, ts + 0.6));
    const tearLine = [[x + w * 0.66, y - 10], [x + w * 0.58, y + 70], [x + w * 0.63, y + 130], [x + w * 0.5, y + 200], [x + w * 0.55, y + 260], [x + w * 0.42, y + 330], [x + w * 0.36, y + h + 10]];
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 11 * te, 8 * te * (side > 0 ? 1 : 0.4));
      ctx.translate(x + w / 2, y + h); ctx.rotate(side * 0.03 * te); ctx.translate(-(x + w / 2), -(y + h));
      ctx.beginPath();
      ctx.moveTo(side < 0 ? x - 20 : x + w + 20, y - 20);
      for (const [px, py] of tearLine) ctx.lineTo(px, py);
      ctx.lineTo(side < 0 ? x - 20 : x + w + 20, y + h + 20);
      ctx.closePath(); ctx.clip();
      cardBody(ctx, t, i, x, y, w, h);
      ctx.restore();
    }
    // the ragged edge glows for a moment
    const g = 1 - seg(t, ts, ts + 0.8);
    if (g > 0) {
      ctx.save(); ctx.globalAlpha = g; ink(ctx, D.hot, 3, 14);
      ctx.beginPath(); tearLine.forEach(([px, py], j) => (j ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); ctx.stroke();
      ctx.restore();
    }
  } else cardBody(ctx, t, i, x, y, w, h);
  ctx.restore();
}
function sceneCongresso(ctx, t) {
  const [sx, sy] = shake(t, [[22.89, 9]], 10);
  const flare = kick(t, 16.93, 4) + kick(t, 19.52, 4) + kick(t, 22.89, 3) + seg(t, 25.2, 25.55) * 1.5;
  bgDark(ctx, 760, 0.55 * pr(t, 13.7, 15.2, E.outCubic) + 0.18 * flare);
  // pull back from the eyes: the wolf is as big as the Congress
  const z = lerp(1.5, 1.0, E.inOutCubic(seg(t, 13.72, 16.4))) * (1 + 0.04 * E.inCubic(seg(t, 23.8, 25.63)));
  ctx.save();
  cam(ctx, z, sx, sy, 540, 700);
  smoke(ctx, t, 0.8, 9, 300, 1100);
  const hs = 4.1 * (1 + 0.012 * Math.sin(t * 1.6));
  const headA = 0.22 * pr(t, 14.3, 16.3, E.inOutCubic);
  if (headA > 0) {
    ctx.save(); ctx.globalAlpha = headA * (1 + 0.8 * flare);
    strokeAt(ctx, WOLF.head, 540, 700, hs, 5, D.red, 30);
    strokeAt(ctx, WOLF.detail, 540, 700, hs, 4, D.red, 0);
    ctx.restore();
  }
  // the eyes snap open on "Mas" and flare on every strike
  const open = Math.min(1.15, E.outBack(seg(t, 13.70, 13.86), 2.5));
  if (open > 0) {
    ctx.save();
    ctx.translate(540, 700); ctx.scale(1, Math.max(0.02, open)); ctx.translate(-540, -700);
    fillAt(ctx, WOLF.eyeL, 540, 700, hs, D.hot, 60 + 50 * flare); fillAt(ctx, WOLF.eyeR, 540, 700, hs, D.hot, 60 + 50 * flare);
    ctx.globalAlpha = 0.9;
    fillAt(ctx, WOLF.eyeL, 540, 700, 2.3, '#FFD6D0'); fillAt(ctx, WOLF.eyeR, 540, 700, 2.3, '#FFD6D0');
    ctx.restore();
  }
  // the Congress rises out of the dark, a scanline at its edge
  const cp = pr(t, 13.95, 16.2, E.inOutCubic);
  if (cp > 0) {
    const top = lerp(1125, 1110 - 790 * 0.8, cp);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, top, W, 1200 - top); ctx.clip();
    congressLine(ctx, 540, 1110, 0.8, D.bone, 3.5, 10);
    ctx.restore();
    if (cp < 1) {
      const g = ctx.createLinearGradient(0, top - 30, 0, top + 30);
      g.addColorStop(0, 'rgba(255,220,210,0)'); g.addColorStop(0.5, `rgba(255,220,210,${0.35 * (1 - cp)})`); g.addColorStop(1, 'rgba(255,220,210,0)');
      ctx.fillStyle = g; ctx.fillRect(120, top - 30, 840, 60);
    }
  }
  ctx.restore();
  hlA(ctx, t, [{ t: 'DEPUTADOS E SENADORES', c: '#fff', box: D.red, s: 62, at: 13.85 }], 300, 62, {});
  hlA(ctx, t, [{ t: 'DECIDEM A SUA VIDA.', at: 16.11 }], 430, 104, { color: D.bone, stagger: 0.016 });
  for (let i = 0; i < 3; i++) clawCard(ctx, t, i);
  alertUI(ctx, t);
}

// ============================================================ 4. hundreds of smiles (25.63 - 32.32)
// "São centenas de nomes, centenas de sorrisos, jurando que vão trabalhar pelo povo."
// each row comes in on a syllable of the count, front row first: the crowd keeps going back into the fog
const ROW_T = [25.82, 26.01, 26.59, 27.2, 27.94, 28.35, 28.94];
// one slow camera drift across scenes 4 and 5: the front rows travel further than the back (depth)
function crowdDrift(t, ri) {
  const u = smoothstep(25.63, 38.1, t), d = Math.pow(0.7, ri);
  return [16 * u * d, -34 * u * d];
}
function rowIn(t, ri, x, rr) {
  const t0 = ROW_T[ri] + (x / W) * 0.14;
  const p = seg(t, t0, t0 + 0.6);
  const [dx, dy] = crowdDrift(t, ri);
  return { a: E.outCubic(p), dx, dy: (1 - E.outExpo(p)) * 56 * Math.pow(0.8, ri) + bob(t, rr) + dy };
}
function sceneSorrisos(ctx, t) {
  bgDark(ctx, 1100, 0.5);
  ctx.save();
  cam(ctx, lerp(1.1, 1.0, E.inOutCubic(seg(t, 25.63, 29.8))), 0, 0, 540, 1300);
  crowd(ctx, t, () => 'human', Object.assign({}, CROWD, {
    sprites: FAST,
    shadowWolves: pr(t, 30.0, 31.8, E.inOutCubic),
    fx: (k, ri, x, y, rr) => rowIn(t, ri, x, rr),
  }));
  ctx.restore();
  hlA(ctx, t, [{ t: 'CENTENAS', at: 26.01 }, { t: 'DE SORRISOS.', at: 28.35 }], 380, 150, { color: D.bone, lh: 0.92, out: 32.12 });
  typeLine(ctx, t, 'todos jurando trabalhar pelo povo.', 540, 590, 40, 600, D.ash, 29.73, 31.1, { a: 1 - seg(t, 32.0, 32.3) });
  alertUI(ctx, t);
}

// ============================================================ 5. the masks come off (32.32 - 38.1)
// "Mas quem votou a favor do cidadão? E quem só votou a favor de si mesmo?"
// the scan comes in from the right, strips the masks off as it passes, holds on the key visual
// (masks on the left, the truth on the right), then finishes the job
function scanX(t) {
  if (t < 34.5) return lerp(W + 30, 560, E.inOutCubic(seg(t, 32.45, 33.95)));
  return lerp(560, -40, E.inOutCubic(seg(t, 35.18, 36.6)));
}
function sceneMascaras(ctx, t) {
  const sx = scanX(t);
  const lambUp = pr(t, 34.17, 34.55) * (1 - 0.6 * seg(t, 35.2, 35.8));        // "cidadão": the lambs light up
  const growl = seg(t, 36.62, 36.78) * (1 - 0.65 * seg(t, 37.2, 37.85));        // "de si mesmo": the wolves snarl
  const fx = (k, ri, x, y, rr, kind) => {
    const [ddx, ddy] = crowdDrift(t, ri);
    const f = { dx: ddx, dy: bob(t, rr) + ddy };
    if (kind === 'lamb') { f.glow = 1 + 3.5 * lambUp; f.dy -= 10 * lambUp * Math.pow(0.8, ri); }
    else if (kind === 'wolf') { f.glow = 1 + 2.2 * growl; f.heat = 0.55 * growl; f.dx += noise1(t * 32 + k * 3) * 1.5 * growl; }
    return f;
  };
  bgDark(ctx, lerp(1100, 1200, seg(t, 32.3, 33.9)), lerp(0.5, 0.55, seg(t, 32.3, 33.9)) + 0.15 * growl);
  if (sx > 0) {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sx, H); ctx.clip();
    crowd(ctx, t, () => 'human', Object.assign({}, CROWD, { shadowWolves: 1 - seg(t, 32.4, 33.2), fx, sprites: FAST }));
    ctx.restore();
  }
  if (sx < W) {
    ctx.save(); ctx.beginPath(); ctx.rect(Math.max(0, sx), 0, W - Math.max(0, sx), H); ctx.clip();
    bgDark(ctx, 1200, 0.7 + 0.2 * growl);
    crowd(ctx, t, (i, ri, x, y, rr) => (isLamb(rr) ? 'lamb' : 'wolf'), Object.assign({}, CROWD, { fx, sprites: FAST }));
    ctx.restore();
  }
  // the scan beam
  const ba = seg(t, 32.45, 32.6) * (1 - seg(t, 36.5, 36.75));
  if (ba > 0) {
    ctx.save(); ctx.globalAlpha = ba;
    const beam = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
    beam.addColorStop(0, 'rgba(255,48,64,0)'); beam.addColorStop(0.5, 'rgba(255,48,64,0.32)'); beam.addColorStop(1, 'rgba(255,48,64,0)');
    ctx.fillStyle = beam; ctx.fillRect(sx - 120, 700, 240, H - 700);
    ctx.shadowColor = D.hot; ctx.shadowBlur = 34; ctx.fillStyle = '#FFE3E0'; ctx.fillRect(sx - 2, 700, 4, H - 700);
    ctx.restore();
  }
  const g = ctx.createLinearGradient(0, 180, 0, 860); g.addColorStop(0, 'rgba(5,2,3,0.96)'); g.addColorStop(0.8, 'rgba(5,2,3,0.7)'); g.addColorStop(1, 'rgba(5,2,3,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 180, W, 680);
  hlA(ctx, t, [{ t: 'LOBOS', c: D.hot, at: 32.52 }, { t: 'EM PELE', at: 32.68 }, { t: 'DE CORDEIRO.', at: 32.84 }], 350, 140, { color: '#FFF4EE', lh: 0.93 });
  ctx.save(); ctx.font = FONT(800, 30); ctx.textAlign = 'center';
  const la = seg(sx, 200, 420);
  if (la > 0) { ctx.globalAlpha = la; ctx.fillStyle = D.bone; ctx.fillText('O QUE ELES MOSTRAM', Math.min(sx, W) / 2, 790); }
  const ra = seg(W - sx, 200, 420);
  if (ra > 0) { ctx.globalAlpha = ra; ctx.fillStyle = D.hot; ctx.fillText('QUEM ELES SÃO', Math.max(sx, 0) + (W - Math.max(sx, 0)) / 2, 790); }
  ctx.restore();
  tagPop(ctx, t, 34.17, '● CORDEIRO: A FAVOR DO CIDADÃO', W - 60, 1730, 'rgba(10,40,24,0.94)', D.lamb, 24, 'right');
  tagPop(ctx, t, 36.69, '● LOBO: A FAVOR DE SI MESMO', W - 60, 1800, 'rgba(60,8,12,0.94)', D.hot, 24, 'right');
  alertUI(ctx, t, { ticker: false });
  // the lights go out before the turn
  const out = seg(t, 37.86, 38.06);
  if (out > 0) { ctx.fillStyle = `rgba(5,2,3,${E.inCubic(out)})`; ctx.fillRect(0, 0, W, H); }
}
