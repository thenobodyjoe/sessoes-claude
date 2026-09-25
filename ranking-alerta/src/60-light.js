// ============================================================
// The Ranking's half (38.1 - 65.36 s): the light comes on. Navy, yellow and white; calmer, more
// confident motion than the broadcast: masked reveals, clean slides, one move at a time.
// ============================================================
function glow(ctx, x, y, r, color, a) {
  if (a <= 0) return;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}
// the camera tilts up into the next scene: A slides down and out, B comes down from above
function whip(ctx, t, t0, t1, drawA, drawB) {
  const u = E.inOutCubic(seg(t, t0, t1));
  const LA = layer('whipA'), LB = layer('whipB');
  drawA(LA, t); drawB(LB, t);
  ctx.drawImage(LA.canvas, 0, u * H);
  ctx.drawImage(LB.canvas, 0, (u - 1) * H);
}

// ============================================================ 6. the turn (38.1 - 42.12)
// "É pra isso que o Ranking dos Políticos existe."
function sceneVirada(ctx, t) {
  const mx = 540, my = 470, R = 150;
  const sky = E.outExpo(seg(t, 38.31, 39.3));
  const lamp = lampOn(t, 39.18);
  const lp = lamp * pr(t, 39.18, 39.7, E.outCubic);
  // the beam opens and sweeps the crowd once (left, right, settle), then stays wide
  const u = seg(t, 39.18, 40.6);
  const hw = lerp(90, 700, E.inOutCubic(seg(t, 39.3, 40.5)));
  const bx = 540 + 400 * Math.sin(u * Math.PI * 1.5 - Math.PI / 2) * (1 - E.inCubic(u));
  const tw = lerp(40, 120, E.outCubic(seg(t, 39.18, 39.6)));
  const coneP = c => { c.beginPath(); c.moveTo(mx - tw, my + 60); c.lineTo(mx + tw, my + 60); c.lineTo(bx + hw, H); c.lineTo(bx - hw, H); c.closePath(); };
  const crowd6 = Object.assign({}, CROWD, { seed: 7, sprites: FAST });
  const drift = 1 + 0.03 * E.inOutCubic(seg(t, 38.1, 42.1));
  const fx = (k, ri, x, y, rr) => ({ a: 0.18 + 0.82 * sky, dy: bob(t, rr) });
  bgDark(ctx, 1500, 0.4 * (0.3 + 0.7 * sky));
  ctx.save();
  cam(ctx, drift, 0, 0, 540, 1500);
  ctx.save();
  if (lp > 0) { ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(mx - tw, my + 60); ctx.lineTo(bx - hw, H); ctx.lineTo(bx + hw, H); ctx.lineTo(mx + tw, my + 60); ctx.closePath(); ctx.clip('evenodd'); }
  crowd(ctx, t, () => 'human', Object.assign({}, crowd6, { fx }));
  ctx.restore();
  if (lp > 0) {
    // inside the light: who they really are
    ctx.save();
    coneP(ctx); ctx.clip();
    ctx.globalAlpha = lp;
    bgDark(ctx, 1500, 0.55);
    const lg = ctx.createLinearGradient(0, my, 0, H);
    lg.addColorStop(0, 'rgba(255,226,120,0.5)'); lg.addColorStop(1, 'rgba(255,226,120,0.12)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
    crowd(ctx, t, (i, ri, x, y, rr) => (isLamb(rr) ? 'lamb' : 'wolf'), Object.assign({}, crowd6, { fx }));
    ctx.restore();
  }
  ctx.restore();
  // the brand's sky comes down over the dark
  ctx.save();
  ctx.translate(0, -1180 * (1 - sky));
  const skyG = ctx.createLinearGradient(0, 0, 0, 1180);
  skyG.addColorStop(0, C.ink); skyG.addColorStop(0.62, C.navy); skyG.addColorStop(1, 'rgba(11,20,64,0)');
  ctx.fillStyle = skyG; ctx.fillRect(0, 0, W, 1180);
  ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.rect(0, 0, W, 860); ctx.clip(); dotGrid(ctx, t, 0.08);
  ctx.restore();
  if (lp > 0) {
    ctx.save(); coneP(ctx); ctx.clip();
    ctx.globalAlpha = lp;
    const lg2 = ctx.createLinearGradient(0, my, 0, 1180);
    lg2.addColorStop(0, 'rgba(255,226,120,0.5)'); lg2.addColorStop(1, 'rgba(255,226,120,0)');
    ctx.fillStyle = lg2; ctx.fillRect(0, my, W, 1180 - my);
    ctx.restore();
  }
  // the mark rises into place, then becomes a lamp on "Ranking"
  const mp = seg(t, 38.5, 39.15);
  if (mp > 0) {
    glow(ctx, mx, my, 420, '#FFE278', 0.55 * lp + 0.2 * kick(t, 39.18, 4) * lamp);
    const e = E.outExpo(mp);
    drawMark(ctx, mx, my + 60 * (1 - e), (R / LOGO_MARK.r) * lerp(0.82, 1, e), '#fff', E.outCubic(Math.min(1, mp * 2)));
  }
  hlA(ctx, t, [{ t: 'É PRA ISSO QUE O RANKING', at: 38.36 }, { t: 'DOS POLÍTICOS EXISTE:', at: 39.66 }], 230, 64, { color: '#fff', weight: 800, stagger: 0.014 });
  hlA(ctx, t, [{ t: 'SEPARAR LOBOS', c: C.ink, box: C.yellow, at: 40.1 }], 760, 96, { weight: 900, stagger: 0.016 });
  hlA(ctx, t, [{ t: 'DE CORDEIROS.', at: 40.32 }], 880, 96, { color: '#fff', stagger: 0.016 });
}

// ============================================================ 7. a score from 0 to 10 (41.75 - 52.95)
// "Cruzamos presença, votação, gasto público e processo na Justiça — e entregamos uma nota: de zero a dez.
//  Sem discurso. Só histórico."
// [label, the word, corner x, corner y]
const CRIT7 = [['PRESENÇA', 42.44, 200, 560], ['VOTAÇÃO', 43.31, 880, 540], ['GASTO PÚBLICO', 44.24, 230, 1640], ['PROCESSOS', 45.63, 860, 1660]];
const fmtNote = v => v.toFixed(1).replace('.', ',');
function noteCard(ctx, x, y, who, note, col, vals, rot, s) {
  const crit = ['Presença', 'Votações', 'Gasto público', 'Processos'];
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); if (s && s !== 1) ctx.scale(s, s);
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
  ctx.fillStyle = C.paper; rrect(ctx, -430, -250, 860, 500, 36); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(-300, -90, 100, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(-300, -90, 100, 0, TAU); ctx.clip();
  (who === 'lamb' ? lamb : wolf)(ctx, -300, -70, { s: 0.62, lw: 3, variant: who === 'lamb' ? 3 : 0, color: col });
  ctx.restore();
  ctx.fillStyle = C.text; rrect(ctx, -170, -160, 260, 26, 13); ctx.fill();
  ctx.fillStyle = C.line; rrect(ctx, -170, -116, 150, 20, 10); ctx.fill();
  ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.font = FONT(900, 150);
  ctx.fillText(note, 390, -40);
  ctx.font = FONT(700, 28); ctx.fillStyle = '#8A93B8'; ctx.fillText('NOTA  0 – 10', 390, 0);
  ctx.textAlign = 'left';
  crit.forEach((c, i) => {
    const yy = 70 + i * 44;
    ctx.font = FONT(600, 26); ctx.fillStyle = C.text; ctx.fillText(c, -370, yy + 9);
    rrect(ctx, -110, yy - 8, 480, 16, 8); ctx.fillStyle = '#E4E9F6'; ctx.fill();
    if (vals[i] > 0.005) { rrect(ctx, -110, yy - 8, 480 * vals[i], 16, 8); ctx.fillStyle = vals[i] > 0.55 ? C.green : vals[i] > 0.35 ? C.yellow : C.red; ctx.fill(); }
  });
  ctx.restore();
}
function sceneNota(ctx, t) {
  bgNavy(ctx, 1000, 0.3);
  dotGrid(ctx, t, 0.07);
  const ex = E.inExpo(seg(t, 52.6, 52.98));          // everything clears for the stopwatch
  const fly = E.inOutCubic(seg(t, 47.27, 48.0));     // the criteria settle into the corners
  kickerType(ctx, t, 'CRUZAMOS', 600, C.yellow, 34, 41.85, 42.3, 1 - seg(t, 47.05, 47.35));
  // a thin spine that the criteria hang from while they are being listed
  const spine = pr(t, 42.3, 46.0, E.inOutCubic) * (1 - seg(t, 47.1, 47.4));
  if (spine > 0) { ctx.fillStyle = rgba(C.yellow, 0.35); ctx.fillRect(538, 690, 4, 600 * spine); }
  // the two cards
  const lin = E.outExpo(seg(t, 47.3, 48.2)), win = E.outExpo(seg(t, 47.52, 48.42));
  const bar = i => E.outCubic(seg(t, 47.95 + i * 0.15, 48.75 + i * 0.15));
  const cnt = E.outCubic(seg(t, 48.99, 50.1));
  const settle = 1 + 0.025 * kick(t, 50.1, 7);
  if (win > 0) noteCard(ctx, lerp(1640, 540, win) + ex * 1500, 1330, 'wolf', fmtNote(2.1 * cnt), C.red, [0.28, 0.22, 0.15, 0.1].map((v, i) => v * bar(i)), lerp(0.16, 0.03, win), settle);
  if (lin > 0) noteCard(ctx, lerp(-560, 540, lin) - ex * 1500, 830, 'lamb', fmtNote(8.7 * cnt), C.green, [0.92, 0.84, 0.8, 0.95].map((v, i) => v * bar(i)), lerp(-0.16, -0.025, lin), settle);
  // the criteria, one per word
  CRIT7.forEach(([txt, t0, fx, fy], i) => {
    const p = seg(t, t0 - 0.04, t0 + 0.5);
    if (p <= 0 || ex >= 1) return;
    const e = E.outExpo(p);
    const x = lerp(540, fx, fly), y = lerp(780 + i * 160, fy, fly) + (1 - e) * 40, size = lerp(54, 28, fly);
    ctx.save();
    ctx.globalAlpha = E.outCubic(Math.min(1, p * 2)) * (1 - ex);
    tag(ctx, txt, x, y, i % 2 ? C.blue : C.yellow, i % 2 ? '#fff' : C.text, size);
    ctx.restore();
  });
  hlA(ctx, t, [{ t: 'SEM DISCURSO.', at: 50.42 }, { t: 'SÓ HISTÓRICO.', c: C.yellow, at: 51.69 }], 330, 120, { color: '#fff', out: 52.62, stagger: 0.018 });
  drawLockup(ctx, 350, 1750, 0.32, 0.9 * pr(t, 42.1, 42.9, E.outCubic), true);
}

// ============================================================ 8. two minutes, four years (52.95 - 59.17)
// "Consulte antes de votar. Dois minutos que decidem os próximos quatro anos."
const YEARS_T = [57.68, 57.9, 58.1, 58.31];
const WATCH = { x: 540, y: 640, R: 210 };
function sceneTempo(ctx, t) {
  const k0 = seg(t, 52.95, 53.6);
  bgNavy(ctx, lerp(1000, 900, k0), lerp(0.3, 0.32, k0));
  dotGrid(ctx, t, 0.07);
  const out = E.inCubic(seg(t, 58.85, 59.17));      // everything but the watch leaves; the ring floods white
  kickerType(ctx, t, 'CONSULTE ANTES DE VOTAR', 300, C.yellow, 32, 53.12, 54.5, 1 - out);
  const { x: cx, R } = WATCH;
  const drop = seg(t, 52.98, 53.75);
  if (drop > 0) {
    const cy = WATCH.y + (1 - E.outExpo(drop)) * 160;
    const press = kick(t, 55.3, 12) * seg(t, 55.2, 55.3);
    ctx.save();
    ctx.globalAlpha = E.outCubic(Math.min(1, drop * 2));
    ctx.strokeStyle = C.navy2; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
    ctx.fillStyle = C.navy2;
    rrect(ctx, cx - 20, cy - R - 60 + 12 * press, 40, 36, 8); ctx.fill(); rrect(ctx, cx - 40, cy - R - 72 + 12 * press, 80, 18, 9); ctx.fill();
    // waiting: a second hand ticking round, until the watch is started on "Dois"
    const hand = 1 - seg(t, 55.3, 55.45);
    if (hand > 0) {
      const steps = Math.floor((t - 53.4) / 0.5), sub = seg((t - 53.4) % 0.5, 0, 0.08);
      const ang = -Math.PI / 2 + (steps + E.outBack(sub, 2)) * (TAU / 60) * 5;
      ctx.save(); ctx.globalAlpha *= hand * 0.85;
      ctx.strokeStyle = C.mute; ctx.lineWidth = 6; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(ang) * (R - 50), cy + Math.sin(ang) * (R - 50)); ctx.stroke();
      ctx.fillStyle = C.mute; ctx.beginPath(); ctx.arc(cx, cy, 12, 0, TAU); ctx.fill();
      ctx.restore();
    }
    const fill = E.inOutCubic(seg(t, 55.36, 56.19));
    if (fill > 0) {
      const a1 = -Math.PI / 2 + TAU * fill * 0.999;
      ctx.shadowColor = C.yellow; ctx.shadowBlur = 30; ctx.strokeStyle = C.yellow; ctx.lineCap = 'round'; ctx.lineWidth = 26;
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, a1); ctx.stroke();
      ctx.shadowBlur = 0;
      if (fill < 1) { ctx.fillStyle = '#FFF4C8'; ctx.beginPath(); ctx.arc(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, 9, 0, TAU); ctx.fill(); }
    }
    const np = seg(t, 55.36, 55.9);
    if (np > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, R - 16, 0, TAU); ctx.clip();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fff'; ctx.font = FONT(900, 190); ctx.fillText('2', cx, cy + 50 + (1 - E.outExpo(np)) * 190);
      const mp = seg(t, 55.5, 56.0);
      ctx.globalAlpha *= E.outCubic(mp); ctx.font = FONT(700, 34); ctx.fillStyle = C.mute; ctx.fillText('MINUTOS', cx, cy + 110 + (1 - E.outExpo(mp)) * 30);
      ctx.restore();
    }
    if (out > 0) { ctx.globalAlpha = out; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, cy, lerp(R - 13, R + 13, out), 0, TAU); ctx.fill(); }
    ctx.restore();
  }
  // the arrow draws itself down on "que decidem"
  const ap = pr(t, 56.19, 56.6, E.outCubic) * (1 - out);
  if (ap > 0) {
    ctx.save(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const y1 = 910 + 100 * ap;
    ctx.beginPath(); ctx.moveTo(540, 910); ctx.lineTo(540, y1);
    const hp = seg(ap, 0.6, 1);
    if (hp > 0) { ctx.moveTo(540 - 35 * hp, y1 - 35 * hp); ctx.lineTo(540, y1); ctx.lineTo(540 + 35 * hp, y1 - 35 * hp); }
    ctx.stroke(); ctx.restore();
  }
  // four years, one per syllable of "quatro anos"; a lamb looks after each
  ['2027', '2028', '2029', '2030'].forEach((yv, i) => {
    const p = seg(t, YEARS_T[i], YEARS_T[i] + 0.55);
    if (p <= 0) return;
    const x = 70 + i * 240, y = 1060, w = 220, h = 300, e = E.outExpo(p);
    ctx.save();
    ctx.globalAlpha = E.outCubic(Math.min(1, p * 2.5)) * (1 - out);
    ctx.translate(0, (1 - e) * 70 + out * 60);
    ctx.fillStyle = C.paper; rrect(ctx, x, y, w, h, 24); ctx.fill();
    ctx.fillStyle = C.yellow; rrect(ctx, x, y, w, 60, 24); ctx.fill(); ctx.fillRect(x, y + 30, w, 30);
    ctx.fillStyle = C.text; ctx.font = FONT(800, 34); ctx.textAlign = 'center'; ctx.fillText(yv, x + w / 2, y + 44);
    const lp = E.outExpo(seg(t, YEARS_T[i] + 0.12, YEARS_T[i] + 0.6));
    ctx.globalAlpha *= lp;
    lamb(ctx, x + w / 2, y + 205 + (1 - lp) * 24, { s: 0.52, lw: 3, body: false, color: C.green });
    ctx.restore();
  });
  hlA(ctx, t, [{ t: 'DOIS MINUTOS', at: 55.36 }, { t: 'DECIDEM QUATRO ANOS.', c: C.yellow, at: 56.19 }], 1520, 96, { color: '#fff', out: 58.85, stagger: 0.016 });
  drawLockup(ctx, 350, 1750, 0.32, 0.9 * (1 - out), true);
}

// ============================================================ 9. share the alert (59.17 - 65.36)
// "Compartilha esse alerta. Pode ser o vídeo mais importante antes do dia quatro."
// The stopwatch's disc becomes the Ranking's mark: the capital and the bars are cut into it, it slides
// into the lockup and the wordmark writes itself in beside it.
const LK = 0.78, LKX = (W - (LOGO_BBOX[2] - LOGO_BBOX[0]) * LK) / 2, LKY = 520;
const lk2s = (x, y) => [LKX + (x - LOGO_BBOX[0]) * LK, LKY + (y - LOGO_BBOX[1]) * LK];
const MARK_END = lk2s(LOGO_MARK.cx, LOGO_MARK.cy);
const MARK_HERO = { x: WATCH.x, y: WATCH.y, s: (WATCH.R + 13) / LOGO_MARK.r };
const CUT = (() => {
  const M = LOGO_MARK, cx = M.cx, cy = M.cy;
  const [ax0, ay0, ax1, ay1, ar] = M.abacus, [ex0, ey0, ex1, ey1] = M.echinus;
  return {
    abacus: S_.rrect(ax0 - cx, ay0 - cy, ax1 - ax0, ay1 - ay0, 0, [0, 0, ar, ar]),
    echinus: S_.rrect(ex0 - cx, ey0 - cy, ex1 - ex0, ey1 - ey0, 0),
    bars: M.bars.map(([x0, top]) => S_.rrect(x0 - cx, top - cy, M.barW, 260 - (top - cy), 0, [M.barR, 0, 0, 0])),
    dots: M.bars.map(([x0, top]) => S_.circle(x0 - cx + M.barW / 2, top - cy + M.barW / 2, M.barW / 2)),
  };
})();
// [move from, move to, cut in from, cut in to]
const CUT_T = { abacus: [59.3, 59.66, 59.56, 59.72], echinus: [59.42, 59.78, 59.68, 59.84], bars: [[59.56, 59.92, 59.84, 60.0], [59.66, 60.02, 59.94, 60.1], [59.76, 60.12, 60.04, 60.2]] };
const CUT_COL = { abacus: C.yellow, echinus: C.sky, bars: [C.green, C.yellow, C.blue] };
const _A9 = new Float32Array(NP * 2), _B9 = new Float32Array(NP * 2), _P9 = new Float32Array(NP * 2);
function markT(t) {
  const u = E.inOutExpo(seg(t, 60.05, 60.7));
  return { x: lerp(MARK_HERO.x, MARK_END[0], u), y: lerp(MARK_HERO.y, MARK_END[1], u) - Math.sin(u * Math.PI) * 30, s: lerp(MARK_HERO.s, LK, u) };
}
function cutState(name, i, t) {
  const T = name === 'bars' ? CUT_T.bars[i] : CUT_T[name];
  const p = seg(t, T[0], T[1]);
  if (p <= 0) return null;
  let P;
  if (name === 'bars') {
    morphPts(CUT.dots[i], CUT.bars[i], E.inOutCubic(seg(p, 0.25, 1)), _P9);
    const dy = (1 - E.outExpo(p)) * 300;
    for (let k = 0; k < NP; k++) _P9[k * 2 + 1] += dy;
  } else {
    morphPts(CUT[name], CUT[name], 0, _P9);
    const dx = (name === 'abacus' ? -1 : 1) * (1 - E.outExpo(p)) * 520;
    for (let k = 0; k < NP; k++) _P9[k * 2] += dx;
  }
  P = _P9;
  return { P, land: seg(t, T[2], T[3]), col: name === 'bars' ? CUT_COL.bars[i] : CUT_COL[name] };
}
// the disc keeps a faint liquid wobble from the hand-off until the cut-outs are in
function discPts(t, out) {
  const R = LOGO_MARK.r, env = (1 - seg(t, 59.17, 60.3)) * 0.8;
  for (let k = 0; k < NP; k++) {
    const th = -Math.PI / 2 + (k / NP) * TAU;
    const r = R * (1 + env * (0.035 * Math.sin(2 * th + t * 9) + 0.022 * Math.sin(3 * th - t * 11)));
    out[k * 2] = Math.cos(th) * r; out[k * 2 + 1] = Math.sin(th) * r;
  }
  return out;
}
const WORD9 = [['R', 'a', 'n', 'k', 'i', 'n2', 'g'], ['d', 'o', 's', 'p', 'o2', 'l', 'ii', 't', 'i2', 'c', 'o3', 's2']];
const CUTS9 = [['abacus', 0], ['echinus', 0], ['bars', 0], ['bars', 1], ['bars', 2]];
function drawLogoBuild(ctx, t) {
  const L = layer('logo');
  L.clearRect(0, 0, W, H);
  const T = markT(t), atl = ASSETS.atlas;
  const glyph = (name, a, dx, dy) => {
    const g = ASSETS.glyph[name];
    if (!g || a <= 0) return;
    const [x, y] = lk2s(g.x, g.y);
    L.save(); L.globalAlpha = a;
    L.drawImage(atl, g.sx, g.sy, g.w, g.h, x + (dx || 0), y + (dy || 0), g.w * LK, g.h * LK);
    L.restore();
  };
  // "15" slides out from behind the disc, "Anos" writes on
  const q15 = seg(t, 60.85, 61.35);
  if (q15 > 0) {
    const g = ASSETS.glyph['15'], [gx, gy] = lk2s(g.x + g.w / 2, g.y + g.h / 2), e = E.outExpo(q15);
    glyph('15', E.outCubic(Math.min(1, q15 * 2)), (MARK_END[0] - gx) * (1 - e) * 0.5, (MARK_END[1] - gy) * (1 - e) * 0.5);
  }
  ['A', 'n3', 'o4', 's3'].forEach((n, j) => { const q = seg(t, 61.05 + j * 0.05, 61.4 + j * 0.05); glyph(n, E.outCubic(q), -14 * (1 - E.outExpo(q)), 0); });
  // the wordmark: letters rise out of a mask, one after another
  WORD9.forEach((line, li) => line.forEach((n, j) => {
    const b0 = li === 0 ? 60.3 + j * 0.045 : 60.5 + j * 0.03, q = seg(t, b0, b0 + 0.5);
    if (q <= 0) return;
    glyph(n, E.outCubic(Math.min(1, q * 2)), 0, 30 * (1 - E.outExpo(q)));
  }));
  // the disc with its knock-outs
  xformPts(discPts(t, _A9), T.x, T.y, T.s, 0, _B9);
  fillPts(L, _B9, '#fff');
  L.globalCompositeOperation = 'destination-out';
  for (const [n, i] of CUTS9) {
    const st = cutState(n, i, t);
    if (!st || st.land <= 0) continue;
    L.globalAlpha = st.land;
    fillPts(L, xformPts(st.P, T.x, T.y, T.s, 0, _B9), '#000');
  }
  L.globalAlpha = 1; L.globalCompositeOperation = 'source-over';
  // one light sweep across the finished lockup
  const sw = seg(t, 61.4, 62.0);
  if (sw > 0 && sw < 1) {
    L.globalCompositeOperation = 'source-atop';
    const x = lerp(-300, W + 300, E.inOutCubic(sw));
    const g = L.createLinearGradient(x - 160, 0, x + 160, 0);
    g.addColorStop(0, 'rgba(255,210,63,0)'); g.addColorStop(0.5, 'rgba(255,225,120,0.9)'); g.addColorStop(1, 'rgba(255,210,63,0)');
    L.fillStyle = g;
    L.save(); L.translate(x, 780); L.transform(1, 0, -0.35, 1, 0, 0); L.translate(-x, -780);
    L.fillRect(x - 170, 480, 340, 600);
    L.restore();
    L.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(L.canvas, 0, 0);
  // the pieces on their way in: solid, in the brand colours, until they cut in
  for (const [n, i] of CUTS9) {
    const st = cutState(n, i, t);
    if (!st || st.land >= 1) continue;
    ctx.globalAlpha = 1 - st.land;
    fillPts(ctx, xformPts(st.P, T.x, T.y, T.s, 0, _B9), st.col);
  }
  ctx.globalAlpha = 1;
}
function shareButton(ctx, t) {
  const p = seg(t, 59.62, 60.25);
  if (p <= 0) return;
  const press = seg(t, 60.5, 60.58) * (1 - seg(t, 60.62, 60.85));
  const s = lerp(0.9, 1, E.outExpo(p)) * (1 - 0.04 * press);
  const sy = 1120;
  ctx.save();
  ctx.globalAlpha *= E.outCubic(Math.min(1, p * 2));
  ctx.translate(540, sy); ctx.scale(s, s); ctx.translate(-540, -sy);
  ctx.shadowColor = rgba(C.yellow, 0.5); ctx.shadowBlur = 30 + 40 * kick(t, 60.55, 3);
  ctx.fillStyle = C.yellow; rrect(ctx, 140, sy - 70, 800, 140, 70); ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = C.text; ctx.font = FONT(900, 50); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('COMPARTILHE O ALERTA', 580, sy + 3);
  // the share glyph: its two branches reach out when pressed
  const gx = 215, gy = sy, rch = 1 + 0.35 * kick(t, 60.55, 4);
  ctx.strokeStyle = C.text; ctx.fillStyle = C.text; ctx.lineWidth = 7;
  const n1 = [gx + 18 * rch, gy - 20 * rch], n2 = [gx + 18 * rch, gy + 20 * rch];
  ctx.beginPath(); ctx.moveTo(gx - 18, gy); ctx.lineTo(n1[0], n1[1]); ctx.moveTo(gx - 18, gy); ctx.lineTo(n2[0], n2[1]); ctx.stroke();
  for (const [px, py] of [[gx - 18, gy], n1, n2]) { ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fill(); }
  ctx.restore();
  // the tap: a ring spreads from the finger
  const rp = seg(t, 60.55, 61.5);
  if (rp > 0 && rp < 1) {
    ctx.save(); ctx.strokeStyle = C.yellow; ctx.globalAlpha = 0.8 * (1 - rp); ctx.lineWidth = 5 * (1 - rp) + 1;
    ctx.beginPath(); rrect(ctx, 140 - 90 * E.outExpo(rp), sy - 70 - 90 * E.outExpo(rp), 800 + 180 * E.outExpo(rp), 140 + 180 * E.outExpo(rp), 70 + 90 * E.outExpo(rp)); ctx.stroke();
    ctx.restore();
  }
}
function finger(ctx, t) {
  const a = pr(t, 60.0, 60.25) * (1 - seg(t, 61.0, 61.4));
  if (a <= 0) return;
  const [x, y] = pathAt([[60.0, 1060, 1760], [60.5, 760, 1150], [60.7, 770, 1160], [61.4, 1100, 1820]], t);
  const press = seg(t, 60.45, 60.55) * (1 - seg(t, 60.6, 60.8));
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); const s = 1.55 * (1 - 0.12 * press); ctx.scale(s, s); ctx.rotate(-0.08);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 46); ctx.lineTo(11, 36); ctx.lineTo(19, 55); ctx.lineTo(27, 51); ctx.lineTo(19, 33); ctx.lineTo(34, 33);
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = '#fff'; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = C.text; ctx.stroke();
  ctx.restore();
}
function sceneFim(ctx, t) {
  bgNavy(ctx, lerp(900, 820, seg(t, 59.17, 60.5)), lerp(0.32, 0.35, seg(t, 59.17, 60.5)));
  dotGrid(ctx, t, lerp(0.07, 0.06, seg(t, 59.17, 60.5)));
  glow(ctx, 540, 700, 700, '#3A64FF', 0.1 * kick(t, 59.17, 3));
  // the date: in on the cut, and it lights up again on "dia quatro"
  const tp = seg(t, 59.45, 60.0), four = kick(t, 64.72, 2.2) * seg(t, 64.7, 64.76);
  if (tp > 0) {
    ctx.save();
    ctx.globalAlpha = E.outCubic(tp);
    ctx.translate(0, (1 - E.outExpo(tp)) * -24);
    if (four > 0.01) glow(ctx, 540, 330, 360, C.yellow, 0.28 * four);
    tag(ctx, 'ELEIÇÕES 2026  •  4 DE OUTUBRO', 540, 330, rgba(C.yellow, 0.14 + 0.5 * four), four > 0.5 ? C.text : C.yellow, 30);
    ctx.restore();
  }
  if (t < 62.1) drawLogoBuild(ctx, t);
  else drawLockup(ctx, LKX, LKY, LK, 1, false);
  shareButton(ctx, t);
  kLine(ctx, t, { text: 'ranking.org.br', x: 540, y: 1330, size: 60, weight: 800, tIn: 61.3, style: 'rise', mask: true, stagger: 0.02, dur: 0.7, color: '#fff' });
  kLine(ctx, t, { text: 'Consulte antes de votar.', x: 540, y: 1400, size: 38, weight: 500, tIn: 61.55, style: 'rise', mask: true, stagger: 0.012, dur: 0.7, color: C.mute });
  // the flock comes in from both sides and settles, safe
  for (let i = 0; i < 7; i++) {
    const fromL = i < 4, t0 = 61.85 + (fromL ? 3 - i : i - 4) * 0.12, p = seg(t, t0, t0 + 1.1);
    if (p <= 0) continue;
    const e = E.outExpo(p), x = 110 + i * 143 + (fromL ? -1 : 1) * (1 - e) * 520;
    const hop = Math.abs(Math.sin((t - t0) * 9)) * 14 * (1 - E.outCubic(p));
    lamb(ctx, x, 1610 + (i % 2) * 18 - hop, { s: 0.42, lw: 2.6, body: false, color: C.green, a: 0.85 * E.outCubic(Math.min(1, p * 2)) });
  }
  finger(ctx, t);
}
