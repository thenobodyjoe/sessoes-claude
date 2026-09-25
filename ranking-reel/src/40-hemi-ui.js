// ============================================================
// Scene 3 (beats 8-11): the plenary. 513 seats pop in left to right, then take the colour of
// their score, a wave out from the centre. Then they are sucked into the avatars of the ranking.
// Scene 4 (beats 11-17): the ranking itself, as a browser card: search, filters, rows that score,
// criteria that add and subtract points, and a re-sort that crowns a new first place.
// ============================================================
const HEMI = { cx: 540, cy: 1420, r0: 175, r1: 465, rows: 12, dot: 9.5 };
const SEATS = (() => {
  const R = [], sum = [];
  let tot = 0;
  for (let i = 0; i < HEMI.rows; i++) { const r = lerp(HEMI.r0, HEMI.r1, i / (HEMI.rows - 1)); R.push(r); tot += r; }
  const n = R.map(r => Math.max(2, Math.round(513 * r / tot)));
  let diff = 513 - n.reduce((a, c) => a + c, 0);
  for (let i = HEMI.rows - 1; diff !== 0; i = (i + HEMI.rows - 1) % HEMI.rows) { n[i] += Math.sign(diff); diff -= Math.sign(diff); }
  const rnd = mulberry(513), out = [];
  for (let i = 0; i < HEMI.rows; i++) {
    for (let j = 0; j < n[i]; j++) {
      const th = Math.PI - (j / (n[i] - 1)) * Math.PI;
      const sc = (rnd() + rnd() + rnd()) / 1.5 - 1;
      out.push({ row: i, th, x: HEMI.cx + Math.cos(th) * R[i], y: HEMI.cy - Math.sin(th) * R[i], score: sc });
    }
  }
  out.forEach((s, k) => { s.u = 1 - s.th / Math.PI; s.target = Math.min(4, Math.floor(s.u * 5)); s.k = k; });
  // one seat per avatar survives the trip and becomes it: the one nearest the middle of its slice
  for (let a = 0; a < 5; a++) {
    let best = null;
    for (const s of out) if (s.target === a && s.row === 6 && (!best || Math.abs(s.u - (a + 0.5) / 5) < Math.abs(best.u - (a + 0.5) / 5))) best = s;
    best.keeper = true;
  }
  return out;
})();
const seatColor = s => (s.score > 0.2 ? C.green : s.score < -0.25 ? C.red : C.yellow);

// part 'bg': background, floor, seats at rest, count, legend; 'fg': the headline and the seats in flight
function sceneHemi(ctx, b, part) {
  const withBg = part !== 'fg', withFg = part !== 'bg';
  if (withBg) {
    bgNavy(ctx, b, C.ink, C.navy, 1250);
    dotGrid(ctx, b, 0.07);
  }
  const zoom = lerp(1.5, 1, pr(b, 8.0, 8.9, E.outExpo));
  const fade = 1 - seg(b, 10.3, 10.75);
  ctx.save();
  ctx.translate(HEMI.cx, HEMI.cy); ctx.scale(zoom, zoom); ctx.translate(-HEMI.cx, -HEMI.cy);
  // the plenary floor (continuing the flipped bowl)
  if (withBg && fade > 0) {
    ctx.globalAlpha = fade;
    fillPts(ctx, flagShapes().plen, '#16235F');
    ctx.strokeStyle = 'rgba(143,168,255,0.25)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(40, HEMI.cy + 1); ctx.lineTo(1040, HEMI.cy + 1); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  const beatPulse = b > 9.4 && b < 10.4 ? kick(b, Math.floor(b * 2) / 2, 9) : 0;
  for (const s of SEATS) {
    const a = 8.05 + s.u * 0.85 + s.row * 0.012;
    const q = seg(b, a, a + 0.4);
    if (q <= 0) continue;
    const cq = seg(b, 9.05 + s.row * 0.05 + s.u * 0.12, 9.3 + s.row * 0.05 + s.u * 0.12);
    const col = cq <= 0 ? C.white : cq >= 1 ? seatColor(s) : mix(C.white, seatColor(s), cq);
    // the trip into the ranking
    const f0 = 10.3 + (1 - s.row / HEMI.rows) * 0.18 + s.u * 0.12, f = seg(b, f0, f0 + 0.62);
    let x = s.x, y = s.y, r = HEMI.dot * E.outBack(q, 3) * (1 + 0.35 * beatPulse * (s.score > 0.2 ? 1 : 0.3));
    if (f > 0) {
      if (!withFg) continue;
      // the plenary zoom is 1 by now, so this is screen space
      const tgt = uiAvatar(s.target, b);
      const e = E.inOutCubic(f);
      // curve out and down, like water down a drain
      x = lerp(s.x, tgt[0], e) + Math.sin(e * Math.PI) * (s.u - 0.5) * 260;
      y = lerp(s.y, tgt[1], e) - Math.sin(e * Math.PI) * 160;
      r = s.keeper ? lerp(HEMI.dot, 40, E.inCubic(f)) : HEMI.dot * (1 - E.inCubic(f));
      if (s.keeper) { ctx.fillStyle = mix(seatColor(s), ROWS[s.target].av, E.inCubic(f)); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); continue; }
    } else if (!withBg) continue;
    if (r <= 0.2) continue;
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (withFg) {
    kLine(ctx, b, { text: 'QUEM TRABALHA', x: 540, y: 430, size: 118, weight: 800, maxW: 960, tIn: 8.15, style: 'rise', mask: true, tOut: 10.35, outDur: 0.45 });
    kLine(ctx, b, { text: 'POR VOCÊ?', x: 540, y: 572, size: 118, weight: 800, maxW: 960, tIn: 8.4, style: 'rise', mask: true, tOut: 10.45, outDur: 0.45,
      colors: { 4: C.yellow, 5: C.yellow, 6: C.yellow, 7: C.yellow, 8: C.yellow } });
  }
  if (!withBg) return;

  // the count in the middle of the plenary
  const cq = seg(b, 8.4, 9.3);
  if (cq > 0) {
    ctx.save();
    ctx.globalAlpha = pr(b, 8.4, 8.7) * fade;
    ctx.font = FONT(900, 120); ctx.textAlign = 'center'; ctx.fillStyle = C.white;
    ctx.fillText(String(Math.round(513 * E.outCubic(cq))), HEMI.cx, HEMI.cy - 18);
    ctx.textAlign = 'left';
    label(ctx, 'DEPUTADOS FEDERAIS', HEMI.cx, HEMI.cy + 52, 28, C.mute, 'center', 6, 700);
    ctx.restore();
  }
  // legend
  const lg = pr(b, 9.3, 9.8, E.outBack);
  if (lg > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, lg) * fade;
    legendChip(ctx, 540 - 170, 1580, '+ pontos', C.green, lg);
    legendChip(ctx, 540 + 170, 1580, '− pontos', C.red, pr(b, 9.45, 9.95, E.outBack));
    ctx.restore();
  }
}
function legendChip(ctx, cx, cy, text, col, s) {
  if (s <= 0) return;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ctx.font = FONT(700, 32);
  const w = ctx.measureText(text).width + 90;
  rrect(ctx, -w / 2, -34, w, 68, 34);
  ctx.fillStyle = rgba(col, 0.14); ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = col; ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(-w / 2 + 36, 0, 11, 0, TAU); ctx.fill();
  ctx.fillStyle = C.white; ctx.fillText(text, -w / 2 + 60, 11);
  ctx.restore();
}

// ---------- scene 4: the ranking card
const UI = { x: 80, y: 700, w: 920, h: 1000, r: 44, rowY: 1010, rowH: 120, rowGap: 14 };
const ROWS = [
  { uf: 'SP', nw: 300, s0: 812, s1: 754, av: '#5B7CFF' },
  { uf: 'MG', nw: 250, s0: 776, s1: 817, av: '#16C66E' },
  { uf: 'BA', nw: 330, s0: 743, s1: 839, av: '#FFB020' },
  { uf: 'RS', nw: 270, s0: 701, s1: 689, av: '#FF6B7A' },
  { uf: 'PE', nw: 290, s0: 668, s1: 818, av: '#9B6BFF' },
];
(() => {
  const order = ROWS.map((r, i) => i).sort((a, c) => ROWS[c].s1 - ROWS[a].s1);
  order.forEach((i, k) => { ROWS[i].newRank = k; });
})();
const slotY = k => UI.rowY + k * (UI.rowH + UI.rowGap);

// where the panel is (it slides up into place)
function uiPanelT(b) {
  const q = pr(b, 10.85, 11.55, E.outExpo);
  return { dy: (1 - q) * 1000, rot: (1 - q) * 0.07, s: lerp(0.94, 1, q), q };
}
function uiAvatar(i, b) {
  const P = uiPanelT(b);
  const x = 255, y = slotY(i) + 60 + P.dy;
  return [540 + (x - 540) * P.s, 1200 + (y - 1200) * P.s];
}

function sceneUI(ctx, b, withBg) {
  const P = uiPanelT(b);
  const morph = seg(b, 16.7, 17.3);          // the card becomes the stopwatch
  if (withBg) {
    bgNavy(ctx, b, C.ink, C.navy, 1300);
    dotGrid(ctx, b, 0.07);
    // headlines
    kLine(ctx, b, { text: 'CONSULTE', x: 540, y: 400, size: 124, weight: 800, maxW: 960, tIn: 11.1, style: 'rise', mask: true, tOut: 13.7, outDur: 0.45 });
    kLine(ctx, b, { text: 'O RANKING', x: 540, y: 545, size: 124, weight: 800, maxW: 960, tIn: 11.3, style: 'rise', mask: true, tOut: 13.8, outDur: 0.45,
      hl: { from: 2, to: 9, color: C.yellow, text: C.text, b: 11.85 } });
    kLine(ctx, b, { text: 'ESCOLHA COM', x: 540, y: 400, size: 124, weight: 800, maxW: 960, tIn: 14.05, style: 'rise', mask: true, tOut: 16.6, outDur: 0.45 });
    kLine(ctx, b, { text: 'CRITÉRIO.', x: 540, y: 545, size: 124, weight: 800, maxW: 960, tIn: 14.25, style: 'rise', mask: true, tOut: 16.7, outDur: 0.45,
      hl: { from: 0, to: 9, color: C.yellow, text: C.text, b: 14.75 } });
  }
  if (morph > 0) { uiMorph(ctx, b, morph); if (!withBg) return; }
  if (b > 17.3) return;
  const fadeOut = 1 - seg(b, 16.5, 16.72);
  ctx.save();
  ctx.translate(540, 1200 + P.dy); ctx.rotate(P.rot); ctx.scale(P.s, P.s); ctx.translate(-540, -1200);
  if (morph <= 0) {
    // the card
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 80; ctx.shadowOffsetY = 40;
    rrect(ctx, UI.x, UI.y, UI.w, UI.h, UI.r); ctx.fillStyle = C.paper; ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = fadeOut;
  if (fadeOut > 0) uiContent(ctx, b);
  ctx.restore();
  ctx.globalAlpha = 1;
  // criteria stickers float over the card
  if (b > 14) criteria(ctx, b);
  // pointer
  const keys = [[11.0, 1180, 2080], [11.5, 640, 868], [12.95, 660, 880], [13.3, 200, 958], [13.9, 560, 1300], [14.5, 760, 1480], [15.9, 860, 1120], [16.15, 700, 1070], [16.7, 1200, 1400]];
  const [px, py] = pathAt(keys, b);
  const press = Math.max(bump1(b, 11.55), bump1(b, 13.35), bump1(b, 16.2));
  ripple(ctx, 640, 868, b, 11.55, C.blue, 70);
  ripple(ctx, 200, 958, b, 13.35, C.blue, 70);
  pointer(ctx, px, py, press, pr(b, 11.0, 11.3) * (1 - seg(b, 16.45, 16.7)));
}
const bump1 = (b, b0) => Math.max(0, 1 - Math.abs(b - b0) / 0.12);

function uiContent(ctx, b) {
  // browser bar with the address
  ctx.save();
  rrect(ctx, UI.x, UI.y, UI.w, 82, UI.r); ctx.clip();
  ctx.fillStyle = '#E4E8F4'; ctx.fillRect(UI.x, UI.y, UI.w, 82);
  ctx.restore();
  ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(128 + i * 30, 741, 9, 0, TAU); ctx.fill(); });
  rrect(ctx, 240, 716, 720, 50, 25); ctx.fillStyle = '#fff'; ctx.fill();
  // lock
  ctx.strokeStyle = C.text; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(276, 736, 7, Math.PI, 0); ctx.stroke();
  ctx.fillStyle = C.text; rrect(ctx, 266, 736, 20, 16, 3); ctx.fill();
  ctx.font = FONT(600, 27); ctx.fillStyle = C.text; ctx.fillText('ranking.org.br', 300, 750);

  // search
  const sq = pr(b, 11.25, 11.7, E.outBack);
  if (sq > 0) {
    ctx.save();
    ctx.translate(540, 855); ctx.scale(lerp(0.9, 1, sq), lerp(0.9, 1, sq)); ctx.translate(-540, -855);
    ctx.globalAlpha *= Math.min(1, sq);
    const focus = seg(b, 11.55, 11.7);
    rrect(ctx, 120, 810, 840, 90, 45); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.lineWidth = 3; ctx.strokeStyle = mix(C.line, C.blue, focus); ctx.stroke();
    ctx.strokeStyle = C.text; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(172, 850, 14, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(182, 860); ctx.lineTo(194, 872); ctx.stroke();
    const q = 'Deputados federais';
    const nChars = Math.floor(clamp((b - 11.65) / 0.075, 0, q.length));
    ctx.font = FONT(500, 32);
    if (nChars === 0) { ctx.fillStyle = '#9AA3C4'; ctx.fillText('Busque um político', 215, 866); }
    else { ctx.fillStyle = C.text; ctx.fillText(q.slice(0, nChars), 215, 866); }
    if (focus > 0 && Math.floor(b * 4) % 2 === 0) {
      const cw = nChars ? ctx.measureText(q.slice(0, nChars)).width : 0;
      ctx.fillStyle = C.blue; ctx.fillRect(218 + cw, 834, 3, 42);
    }
    ctx.restore();
  }
  // filter chips
  const chips = [['Deputados', true], ['Senadores', false], ['Todos os estados ▾', false]];
  let cx = 120;
  ctx.font = FONT(600, 26);
  chips.forEach(([t, on], i) => {
    const w = ctx.measureText(t).width + 52;
    const q = pr(b, 11.5 + i * 0.1, 11.95 + i * 0.1, E.outBack);
    if (q > 0) {
      ctx.save();
      ctx.translate(cx + w / 2, 955); ctx.scale(q, q);
      const act = on ? (b < 13.35 ? 0.35 : 1) : 0;
      rrect(ctx, -w / 2, -30, w, 60, 30);
      ctx.fillStyle = mix('#FFFFFF', C.text, act); ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = on ? C.text : C.line; ctx.stroke();
      ctx.fillStyle = act > 0.5 ? '#fff' : C.text;
      ctx.fillText(t, -w / 2 + 26, 9);
      ctx.restore();
    }
    cx += w + 14;
  });
  // rows
  const sort = E.inOutCubic(seg(b, 15.25, 16.0));
  // draw the ones moving up last (they pass in front)
  const drawOrder = ROWS.map((r, i) => i).sort((a, c) => (ROWS[a].newRank - a) - (ROWS[c].newRank - c)).reverse();
  for (const i of drawOrder) uiRow(ctx, b, i, sort);
}

function uiRow(ctx, b, i, sort) {
  const R = ROWS[i];
  const inq = pr(b, 11.05 + i * 0.12, 11.75 + i * 0.12, E.outExpo);
  if (inq <= 0) return;
  const up = R.newRank < i;
  const y = lerp(slotY(i), slotY(R.newRank), sort) + (1 - inq) * 90;
  const bulge = Math.sin(sort * Math.PI);
  const x = (up ? -1 : 1) * bulge * 26;
  const s = 1 + (up ? 0.035 : -0.01) * bulge;
  const win = R.newRank === 0 ? pr(b, 16.0, 16.4) : 0;
  ctx.save();
  ctx.globalAlpha *= inq;
  ctx.translate(540 + x, y + 60); ctx.scale(s, s); ctx.translate(-540, -(y + 60));
  ctx.save();
  ctx.shadowColor = `rgba(16,26,70,${0.12 + 0.25 * bulge * (up ? 1 : 0)})`; ctx.shadowBlur = 24 + 30 * bulge; ctx.shadowOffsetY = 8 + 12 * bulge;
  rrect(ctx, 110, y, 860, UI.rowH, 26); ctx.fillStyle = '#fff'; ctx.fill();
  ctx.restore();
  if (win > 0) {
    ctx.save(); rrect(ctx, 110, y, 860, UI.rowH, 26); ctx.clip();
    ctx.fillStyle = rgba(C.yellow, 0.22 * win); ctx.fillRect(110, y, 860, UI.rowH);
    ctx.fillStyle = C.yellow; ctx.fillRect(110, y, 10 * win, UI.rowH);
    ctx.restore();
    ctx.lineWidth = 3; ctx.strokeStyle = rgba('#E0A800', win); rrect(ctx, 110, y, 860, UI.rowH, 26); ctx.stroke();
  }
  // rank (flips to the new number halfway through the sort)
  const rank = sort < 0.5 ? i : R.newRank;
  const flip = Math.abs(Math.cos(sort * Math.PI));
  ctx.save();
  ctx.translate(165, y + 60); ctx.scale(1, Math.max(0.05, flip));
  ctx.font = FONT(800, 42); ctx.textAlign = 'center';
  ctx.fillStyle = win > 0.5 ? '#C98F00' : C.text;
  ctx.fillText(`${rank + 1}º`, 0, 15);
  ctx.restore();
  // avatar
  const av = seg(b, 10.95 + i * 0.03, 11.15 + i * 0.03);
  ctx.fillStyle = R.av; ctx.beginPath(); ctx.arc(255, y + 60, 40, 0, TAU); ctx.fill();
  if (av > 0) {
    ctx.save(); ctx.beginPath(); ctx.arc(255, y + 60, 40, 0, TAU); ctx.clip();
    ctx.globalAlpha *= av;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.arc(255, y + 50, 14, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.ellipse(255, y + 92, 28, 22, 0, 0, TAU); ctx.fill();
    ctx.restore();
  }
  // name (redacted bar), state and party
  const nq = pr(b, 11.3 + i * 0.1, 11.8 + i * 0.1);
  rrect(ctx, 315, y + 28, R.nw * nq, 22, 11); ctx.fillStyle = C.text; ctx.fill();
  rrect(ctx, 315, y + 62, 62, 32, 16); ctx.fillStyle = '#EEF1FA'; ctx.fill();
  ctx.font = FONT(700, 20); ctx.fillStyle = C.text; ctx.textAlign = 'center'; ctx.fillText(R.uf, 346, y + 85); ctx.textAlign = 'left';
  rrect(ctx, 390, y + 70, 110 * nq, 16, 8); ctx.fillStyle = C.line; ctx.fill();
  // score: counts up, then moves with the criteria
  const cnt = E.outCubic(seg(b, 12.2 + i * 0.08, 13.2 + i * 0.08));
  const dq = E.inOutCubic(seg(b, 14.45 + i * 0.14, 15.05 + i * 0.14));
  const score = Math.round(lerp(0, R.s0, cnt) + (R.s1 - R.s0) * dq);
  ctx.font = FONT(800, 46); ctx.textAlign = 'right'; ctx.fillStyle = C.text;
  ctx.fillText(String(score), 930, y + 70);
  ctx.font = FONT(600, 20); ctx.fillStyle = '#8A93B8'; ctx.fillText('pontos', 930, y + 98);
  ctx.textAlign = 'left';
  // score bar
  rrect(ctx, 520, y + 84, 250, 10, 5); ctx.fillStyle = '#E8ECF7'; ctx.fill();
  rrect(ctx, 520, y + 84, 250 * score / 900, 10, 5); ctx.fillStyle = dq > 0 && R.s1 < R.s0 ? C.red : C.green; ctx.fill();
  // the delta floats up off the score
  const dd = seg(b, 14.45 + i * 0.14, 15.4 + i * 0.14);
  if (dd > 0 && dd < 1) {
    const d = R.s1 - R.s0;
    ctx.save();
    ctx.globalAlpha *= Math.sin(dd * Math.PI);
    ctx.font = FONT(800, 38); ctx.textAlign = 'right';
    ctx.fillStyle = d > 0 ? C.green : C.red;
    ctx.fillText(`${d > 0 ? '+' : '−'}${Math.abs(d)}`, 840, y + 40 - dd * 60);
    ctx.restore();
  }
  // crown for the new first place
  if (win > 0) {
    const q = E.outBack(win, 2.5);
    ctx.save();
    ctx.translate(315 + R.nw + 36, y + 39); ctx.scale(q, q); ctx.rotate((1 - win) * 1.5);
    fillPts(ctx, xformPts(UNIT.star, 0, 0, 20, 0), C.yellow);
    ctx.restore();
  }
  ctx.restore();
}

// "stickers" for the criteria that move the score
const CRIT = [
  { t: 'Presença', s: '+', x: 250, y: 682, r: -0.08, b: 14.25, c: C.green },
  { t: 'Votações', s: '+', x: 815, y: 696, r: 0.07, b: 14.5, c: C.green },
  { t: 'Gastos', s: '−', x: 245, y: 1705, r: 0.06, b: 14.75, c: C.red },
  { t: 'Processos', s: '−', x: 815, y: 1690, r: -0.06, b: 15.0, c: C.red },
];
function criteria(ctx, b) {
  for (const k of CRIT) {
    const q = pr(b, k.b, k.b + 0.55, E.outBack);
    const out = E.inBack(seg(b, 16.45, 16.75));
    const s = q * (1 - out);
    if (s <= 0.001) continue;
    ctx.save();
    ctx.translate(k.x, k.y + Math.sin(b * 2.2 + k.x) * 6);
    ctx.rotate(k.r + (1 - Math.min(1, q)) * 0.5);
    ctx.scale(s, s);
    ctx.font = FONT(700, 36);
    const w = ctx.measureText(k.t).width + 110;
    ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 12;
    rrect(ctx, -w / 2, -40, w, 80, 40); ctx.fillStyle = k.c; ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-w / 2 + 42, 0, 24, 0, TAU); ctx.fill();
    ctx.fillStyle = k.c; ctx.fillRect(-w / 2 + 30, -4, 24, 8);
    if (k.s === '+') ctx.fillRect(-w / 2 + 38, -12, 8, 24);
    ctx.fillStyle = '#fff'; ctx.fillText(k.t, -w / 2 + 80, 13);
    ctx.restore();
  }
}

// the card collapses into the stopwatch ring
function uiMorph(ctx, b, m) {
  if (!uiMorph.A) {
    uiMorph.A = S_.rrect(UI.x, UI.y, UI.w, UI.h, UI.r);
    uiMorph.B = S_.circle(CLOCK.cx, CLOCK.cy, CLOCK.R + CLOCK.th / 2);
    uiMorph.T = new Float32Array(NP * 2);
  }
  const e = E.inOutExpo(m);
  morphPts(uiMorph.A, uiMorph.B, e, uiMorph.T);
  const L = layer();
  L.clearRect(0, 0, W, H);
  fillPts(L, uiMorph.T, mix(C.paper, CLOCK.track, seg(m, 0.3, 1)));
  const hole = E.inOutCubic(seg(b, 17.0, 17.35));
  if (hole > 0) {
    L.globalCompositeOperation = 'destination-out';
    L.beginPath(); L.arc(CLOCK.cx, CLOCK.cy, (CLOCK.R - CLOCK.th / 2) * hole, 0, TAU); L.fill();
    L.globalCompositeOperation = 'source-over';
  }
  ctx.drawImage(L.canvas, 0, 0);
}
