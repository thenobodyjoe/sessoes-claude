// ============================================================
// Line art. Everything is drawn as strokes of one weight (scaled so the line never gets thin or fat
// with the drawing), with round caps: the house style of the piece. Heads live in a ~200 px box
// centred on the origin; bodies hang below.
//
// The metaphor: every politician is a smiling human face... that is a mask. Behind it there is a
// wolf (red, glowing eyes, a grin with fangs) or, for the few, a lamb (green, gentle).
// ============================================================
const P = s => new Path2D(s);

// ---------- the wolf
const WOLF = {
  head: P('M -60 -112 L -28 -64 Q 0 -74 28 -64 L 60 -112 L 76 -44 L 98 -10 L 82 0 L 96 30 L 70 42 L 58 72 L 30 96 L 0 110 L -30 96 L -58 72 L -70 42 L -96 30 L -82 0 L -98 -10 L -76 -44 Z'),
  detail: P('M -57 -94 L -64 -54 L -38 -66 M 57 -94 L 64 -54 L 38 -66 M -14 -46 L 0 -26 L 14 -46 ' +
            'M -62 -20 L -18 -2 M 62 -20 L 18 -2 M -20 12 L -14 60 M 20 12 L 14 60 ' +
            'M -74 24 L -52 34 M 74 24 L 52 34 M -60 58 L -40 62 M 60 58 L 40 62 ' +
            'M 0 76 L 0 86 M -28 86 Q 0 102 28 86'),
  fangs: P('M -15 90 L -11 104 L -6 93 M 15 90 L 11 104 L 6 93'),
  nose: P('M -15 60 L 15 60 L 0 76 Z'),
  eyeL: P('M -56 -2 Q -36 -14 -14 6 Q -36 14 -56 -2 Z'),
  eyeR: P('M 56 -2 Q 36 -14 14 6 Q 36 14 56 -2 Z'),
};
// ---------- the lamb
const LAMB = (() => {
  // wool: scallops along the top of an ellipse
  let wool = '';
  const n = 9, cx = 0, cy = -30, rx = 74, ry = 62;
  for (let i = 0; i <= n; i++) {
    const a = Math.PI + (i / n) * Math.PI;
    const x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry;
    if (i === 0) { wool += `M ${x.toFixed(1)} ${y.toFixed(1)} `; continue; }
    const am = Math.PI + ((i - 0.5) / n) * Math.PI;
    const qx = cx + Math.cos(am) * (rx + 22), qy = cy + Math.sin(am) * (ry + 22);
    wool += `Q ${qx.toFixed(1)} ${qy.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)} `;
  }
  let tuft = 'M -34 -14 ';
  for (let i = 1; i <= 4; i++) tuft += `Q ${(-34 + (i - 0.5) * 17).toFixed(1)} -30 ${(-34 + i * 17).toFixed(1)} -14 `;
  return {
    wool: P(wool),
    tuft: P(tuft),
    face: P('M -46 -14 Q -54 60 0 94 Q 54 60 46 -14'),
    ears: P('M -50 -4 Q -98 -18 -118 8 Q -92 24 -48 12 M 50 -4 Q 98 -18 118 8 Q 92 24 48 12'),
    mouth: P('M 0 66 L 0 74 M -13 78 Q -6 86 0 76 Q 6 86 13 78'),
    nose: P('M -12 56 Q 0 64 12 56 Q 0 70 -12 56 Z'),
  };
})();
// ---------- the smiling politician (the mask)
const HUMAN = {
  head: P('M 0 -94 C 32 -94 56 -64 56 -26 C 56 16 30 46 0 46 C -30 46 -56 16 -56 -26 C -56 -64 -32 -94 0 -94 Z'),
  ears: P('M -55 -34 Q -70 -30 -66 -12 Q -62 0 -54 -4 M 55 -34 Q 70 -30 66 -12 Q 62 0 54 -4'),
  eyes: P('M -35 -30 Q -24 -41 -13 -30 M 13 -30 Q 24 -41 35 -30'),
  brows: P('M -38 -48 Q -25 -56 -12 -50 M 12 -50 Q 25 -56 38 -48'),
  nose: P('M -2 -24 L -8 -4 Q -2 0 6 -2'),
  smile: P('M -32 6 Q 0 42 32 6 Q 0 16 -32 6 Z'),
  teeth: P('M -24 11 Q 0 19 24 11'),
  cheeks: P('M -44 -4 Q -40 4 -34 6 M 44 -4 Q 40 4 34 6'),
  hair: [
    P('M -57 -38 C -62 -92 -20 -108 8 -104 C 44 -100 62 -78 57 -38 C 48 -66 20 -74 -8 -72 C -30 -70 -48 -60 -57 -38 Z M -8 -72 Q 4 -90 -2 -104'),
    P('M -57 -40 C -60 -90 -30 -106 4 -106 C 40 -106 62 -84 57 -40 M -40 -84 Q 0 -96 40 -84 M -30 -97 Q 4 -104 34 -96'),
    P('M -56 -36 Q -60 -60 -48 -72 M 56 -36 Q 60 -60 48 -72 M -20 -92 Q 0 -96 20 -92'),
    P('M -58 -30 C -66 -96 -20 -110 0 -108 C 20 -110 66 -96 58 -30 L 64 40 Q 52 56 36 50 M -58 -30 L -64 40 Q -52 56 -36 50 M 0 -108 Q -30 -86 -56 -50 M 0 -108 Q 30 -86 56 -50'),
    P('M -57 -38 C -62 -92 -20 -106 0 -104 C 20 -106 62 -92 57 -38 C 40 -70 -40 -70 -57 -38 Z M 22 -110 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0'),
  ],
  glasses: P('M -44 -38 h 24 q 6 0 6 6 v 8 q 0 6 -6 6 h -24 q -6 0 -6 -6 v -8 q 0 -6 6 -6 Z M 20 -38 h 24 q 6 0 6 6 v 8 q 0 6 -6 6 h -24 q -6 0 -6 -6 v -8 q 0 -6 6 -6 Z M -14 -30 L 14 -30'),
  neck: P('M -18 42 L -20 62 M 18 42 L 20 62'),
  suit: P('M -114 150 Q -106 78 -22 64 M 114 150 Q 106 78 22 64 M -22 64 L -42 98 L -8 136 M 22 64 L 42 98 L 8 136 M -20 62 L 0 78 L 20 62'),
  tie: P('M -7 78 L 7 78 L 4 88 L -4 88 Z M -4 88 L -9 128 L 0 140 L 9 128 L 4 88'),
  blouse: P('M -114 150 Q -106 78 -22 64 M 114 150 Q 106 78 22 64 M -22 64 Q 0 96 22 64 M -16 72 Q 0 90 16 72'),
};

function ink(ctx, color, w, glow) {
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.shadowColor = glow ? color : 'transparent'; ctx.shadowBlur = glow || 0;
}
// stroke a Path2D in a local frame at (x, y), scale s, keeping the line weight lw in screen px
function strokeAt(ctx, path, x, y, s, lw, color, glow, rot) {
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  ink(ctx, color, lw / s, glow ? glow / 1 : 0);
  ctx.stroke(path);
  ctx.restore();
}
function fillAt(ctx, path, x, y, s, color, glow, rot) {
  ctx.save();
  ctx.translate(x, y); if (rot) ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = color; ctx.shadowColor = glow ? color : 'transparent'; ctx.shadowBlur = glow || 0;
  ctx.fill(path);
  ctx.restore();
}

// ---------- characters. o: { s (scale), lw (line px), a (alpha), body (bool), variant (int), bg (fill behind) }
function suitBody(ctx, x, y, s, lw, color, v, bg) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  if (bg) { ctx.fillStyle = bg; ctx.beginPath(); ctx.moveTo(-118, 152); ctx.quadraticCurveTo(-106, 74, -20, 60); ctx.lineTo(20, 60); ctx.quadraticCurveTo(106, 74, 118, 152); ctx.closePath(); ctx.fill(); }
  ink(ctx, color, lw / s);
  ctx.stroke(HUMAN.neck);
  if (v % 5 === 3 || v % 5 === 4) ctx.stroke(HUMAN.blouse);
  else { ctx.stroke(HUMAN.suit); ctx.stroke(HUMAN.tie); }
  ctx.restore();
}
function human(ctx, x, y, o) {
  const s = o.s || 1, lw = o.lw || 3, col = o.color || D.bone, v = o.variant || 0;
  ctx.save();
  ctx.globalAlpha *= o.a === undefined ? 1 : o.a;
  if (o.body !== false) suitBody(ctx, x, y, s, lw, col, v, o.bg);
  if (o.sash) {
    // the presidential sash across the chest: green band, yellow edges
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    ctx.beginPath(); ctx.moveTo(-92, 88); ctx.lineTo(-62, 70); ctx.lineTo(76, 146); ctx.lineTo(40, 150); ctx.closePath();
    ctx.fillStyle = '#1E9A55'; ctx.fill();
    ctx.lineWidth = 5; ctx.strokeStyle = '#FFD740'; ctx.stroke();
    ctx.restore();
  }
  if (o.bg) fillAt(ctx, HUMAN.head, x, y, s, o.bg);
  const parts = [HUMAN.head, HUMAN.ears, HUMAN.eyes, HUMAN.brows, HUMAN.nose, HUMAN.smile, HUMAN.teeth, HUMAN.cheeks, HUMAN.hair[v % 5]];
  if (v % 3 === 1) parts.push(HUMAN.glasses);
  for (const p of parts) strokeAt(ctx, p, x, y, s, lw, col, o.glow);
  ctx.restore();
}
// wolf head scaled to sit on the same shoulders as a human (chin ~ y+40)
function wolf(ctx, x, y, o) {
  const s = o.s || 1, lw = o.lw || 3, col = o.color || D.red, v = o.variant || 0;
  ctx.save();
  ctx.globalAlpha *= o.a === undefined ? 1 : o.a;
  if (o.body !== false) suitBody(ctx, x, y, s, lw, col, v, o.bg);
  const hs = s * 0.66, hy = y - 32 * s;
  if (o.bg) fillAt(ctx, WOLF.head, x, hy, hs, o.bg);
  strokeAt(ctx, WOLF.head, x, hy, hs, lw, col, o.glow);
  strokeAt(ctx, WOLF.detail, x, hy, hs, lw * 0.8, col, o.glow);
  strokeAt(ctx, WOLF.fangs, x, hy, hs, lw * 0.8, D.bone, 0);
  fillAt(ctx, WOLF.nose, x, hy, hs, col);
  // eyes: a hot core with a glow
  const eg = o.eyeGlow === undefined ? 18 : o.eyeGlow;
  fillAt(ctx, WOLF.eyeL, x, hy, hs, D.hot, eg); fillAt(ctx, WOLF.eyeR, x, hy, hs, D.hot, eg);
  ctx.save(); ctx.globalAlpha *= 0.9;
  fillAt(ctx, WOLF.eyeL, x, hy, hs * 0.55, '#FFD6D0'); fillAt(ctx, WOLF.eyeR, x, hy, hs * 0.55, '#FFD6D0');
  ctx.restore();
  ctx.restore();
}
function lamb(ctx, x, y, o) {
  const s = o.s || 1, lw = o.lw || 3, col = o.color || D.lamb, v = o.variant || 0;
  ctx.save();
  ctx.globalAlpha *= o.a === undefined ? 1 : o.a;
  if (o.body !== false) suitBody(ctx, x, y, s, lw, col, v, o.bg);
  const hs = s * 0.66, hy = y - 30 * s;
  if (o.bg) { fillAt(ctx, LAMB.wool, x, hy, hs, o.bg); ctx.save(); ctx.translate(x, hy); ctx.scale(hs, hs); ctx.fillStyle = o.bg; ctx.beginPath(); ctx.ellipse(0, 30, 48, 64, 0, 0, TAU); ctx.fill(); ctx.restore(); }
  for (const p of [LAMB.wool, LAMB.tuft, LAMB.face, LAMB.ears, LAMB.mouth]) strokeAt(ctx, p, x, hy, hs, lw, col, o.glow);
  fillAt(ctx, LAMB.nose, x, hy, hs, col);
  // soft eyes with a catchlight
  ctx.save(); ctx.translate(x, hy); ctx.scale(hs, hs);
  ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = (o.glow || 0);
  ctx.beginPath(); ctx.ellipse(-24, 22, 6, 8, 0, 0, TAU); ctx.ellipse(24, 22, 6, 8, 0, 0, TAU); ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = '#EFFFF6';
  ctx.beginPath(); ctx.arc(-22, 19, 2.2, 0, TAU); ctx.arc(26, 19, 2.2, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}

// a pair of slanted wolf eyes glowing in the dark
function eyesInDark(ctx, x, y, s, a, blink) {
  if (a <= 0) return;
  const open = blink === undefined ? 1 : blink;
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.translate(x, y); ctx.scale(s, s * open);
  ctx.fillStyle = D.hot; ctx.shadowColor = D.hot; ctx.shadowBlur = 22;
  ctx.fill(WOLF.eyeL); ctx.fill(WOLF.eyeR);
  ctx.shadowBlur = 0; ctx.fillStyle = '#FFD6D0';
  ctx.scale(0.5, 0.5); ctx.fill(WOLF.eyeL); ctx.fill(WOLF.eyeR);
  ctx.restore();
}

// three claw slashes (tapered, filled), angle in radians
function claws(ctx, x, y, s, rot, color, a) {
  ctx.save();
  ctx.globalAlpha *= a === undefined ? 1 : a;
  ctx.translate(x, y); ctx.rotate(rot || 0); ctx.scale(s, s);
  ctx.fillStyle = color || D.hot; ctx.shadowColor = color || D.hot; ctx.shadowBlur = 16;
  for (let k = -1; k <= 1; k++) {
    const ox = k * 34, len = 190 - Math.abs(k) * 30;
    ctx.beginPath();
    ctx.moveTo(ox - 2, -len / 2);
    ctx.quadraticCurveTo(ox + 22, 0, ox + 4, len / 2);
    ctx.quadraticCurveTo(ox + 12, 0, ox - 2, -len / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------- places and things (all line art)
// Congresso Nacional, front view; baseY = ground line, s = scale (1 = 940 px wide)
function congressLine(ctx, cx, baseY, s, color, lw, glow) {
  ctx.save();
  ctx.translate(cx, baseY); ctx.scale(s, s);
  ink(ctx, color, lw / s, glow);
  ctx.beginPath();
  // ground + base block + slab
  ctx.moveTo(-520, 0); ctx.lineTo(520, 0);
  ctx.rect(-420, -80, 840, 80);
  ctx.rect(-470, -102, 940, 22);
  for (let x = -400; x <= 400; x += 40) { ctx.moveTo(x, -76); ctx.lineTo(x, -6); }
  // ramp
  ctx.moveTo(-500, 0); ctx.lineTo(-350, -102); ctx.moveTo(-462, 0); ctx.lineTo(-318, -96);
  // towers
  ctx.rect(-53, -770, 46, 668); ctx.rect(7, -770, 46, 668);
  for (let y = -750; y < -110; y += 26) { ctx.moveTo(-47, y); ctx.lineTo(-13, y); ctx.moveTo(13, y); ctx.lineTo(47, y); }
  ctx.rect(-7, -470, 14, 34);
  // senate dome and chamber bowl
  ctx.moveTo(-375, -102); ctx.ellipse(-240, -102, 135, 88, 0, Math.PI, 0);
  ctx.moveTo(60, -202); ctx.ellipse(250, -202, 190, 100, 0, 0, Math.PI); ctx.lineTo(60, -202);
  ctx.moveTo(230, -102); ctx.lineTo(236, -102);
  ctx.stroke();
  ctx.restore();
}
// the flag's geometry as line art (centre cx, cy; s = 1 -> rhombus 980 px wide)
function flagLine(ctx, cx, cy, s, color, lw, glow, starA) {
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(s, s);
  ink(ctx, color, lw / s, glow);
  ctx.beginPath();
  ctx.moveTo(0, -555); ctx.lineTo(490, 0); ctx.lineTo(0, 555); ctx.lineTo(-490, 0); ctx.closePath();
  ctx.moveTo(320, 0); ctx.arc(0, 0, 320, 0, TAU);
  ctx.stroke();
  // the band
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, 318, 0, TAU); ctx.clip();
  ctx.beginPath(); ctx.arc(-160, 920, 940, 0, TAU); ctx.arc(-160, 920, 998, 0, TAU); ctx.stroke();
  ctx.restore();
  // stars
  if (starA !== 0) {
    const r = mulberry(27);
    ctx.fillStyle = color; ctx.globalAlpha *= starA === undefined ? 1 : starA;
    for (let i = 0; i < 27; i++) {
      const x = (r() * 2 - 1) * 250, y = 20 + r() * 230;
      if (Math.hypot(x, y) > 280) { i--; continue; }
      ctx.beginPath(); ctx.arc(x, y, 3 + r() * 5, 0, TAU); ctx.fill();
    }
  }
  ctx.restore();
}
// jagged crack through a drawing
function crack(ctx, x0, y0, x1, y1, seed, color, lw, edge) {
  if (edge) { crack(ctx, x0, y0, x1, y1, seed, color, lw); crack(ctx, x0 + 3, y0 + 2, x1 + 3, y1 + 2, seed, edge, 2); return; }
  const r = mulberry(seed);
  ctx.save();
  ink(ctx, color, lw, edge ? 12 : 0);
  ctx.beginPath(); ctx.moveTo(x0, y0);
  const n = 9;
  for (let i = 1; i <= n; i++) {
    const u = i / n, x = lerp(x0, x1, u) + (i < n ? (r() - 0.5) * 70 : 0), y = lerp(y0, y1, u) + (i < n ? (r() - 0.5) * 40 : 0);
    ctx.lineTo(x, y);
    if (r() < 0.35 && i < n) { ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 90, y + r() * 60); ctx.moveTo(x, y); }
  }
  ctx.stroke();
  ctx.restore();
}
// lectern with microphones (topY = the reading surface)
function podium(ctx, cx, topY, s, color, lw, micY) {
  ctx.save();
  ctx.translate(cx, topY); ctx.scale(s, s);
  ink(ctx, color, lw / s, 0);
  ctx.fillStyle = 'rgba(30,10,12,0.96)';
  ctx.beginPath();
  ctx.moveTo(-230, 0); ctx.lineTo(230, 0); ctx.lineTo(250, 46); ctx.lineTo(-250, 46); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-200, 46); ctx.lineTo(200, 46); ctx.lineTo(150, 470); ctx.lineTo(-150, 470); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-180, 470); ctx.lineTo(180, 470); ctx.lineTo(180, 500); ctx.lineTo(-180, 500); ctx.closePath(); ctx.fill(); ctx.stroke();
  // emblem
  ctx.beginPath(); ctx.arc(0, 210, 62, 0, TAU); ctx.stroke();
  ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 18 : 42; ctx.lineTo(Math.cos(a) * r, 210 + Math.sin(a) * r); }
  ctx.closePath(); ctx.stroke();
  // microphones reaching up to the speaker's mouth
  const my = micY === undefined ? -120 : micY;
  ctx.beginPath();
  ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-40, my * 0.5, -86, my);
  ctx.moveTo(30, 0); ctx.quadraticCurveTo(40, my * 0.5, 86, my);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(-92, my - 16, 13, 22, -0.6, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(92, my - 16, 13, 22, 0.6, 0, TAU); ctx.fill();
  ctx.restore();
}
// a phone held up, filming (for the crowd staring at the stage)
function phone(ctx, x, y, s, rot, color, lw) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ink(ctx, color, lw / s);
  rrect(ctx, -34, -60, 68, 120, 10); ctx.stroke();
  ctx.fillStyle = rgba(D.bone, 0.18); rrect(ctx, -27, -50, 54, 96, 5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-8, 54); ctx.lineTo(8, 54); ctx.stroke();
  // the hand
  ctx.beginPath(); ctx.moveTo(-40, 20); ctx.quadraticCurveTo(-52, 80, -30, 130); ctx.moveTo(40, 30); ctx.quadraticCurveTo(50, 80, 28, 130); ctx.stroke();
  ctx.restore();
}

// ---------- everyday things the claws reach
function iconPayslip(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ink(ctx, color, lw / s);
  ctx.beginPath();
  ctx.moveTo(-80, -100); ctx.lineTo(80, -100); ctx.lineTo(80, 100);
  for (let i = 0; i < 8; i++) ctx.lineTo(80 - (i + 0.5) * 20, i % 2 ? 100 : 88);
  ctx.lineTo(-80, 100); ctx.closePath();
  for (let i = 0; i < 4; i++) { ctx.moveTo(-58, -64 + i * 26); ctx.lineTo(i === 3 ? 10 : 30, -64 + i * 26); }
  ctx.stroke();
  ctx.font = FONT(900, 46); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.fillText('− %', 0, 70);
  ctx.restore();
}
function iconMedicine(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ink(ctx, color, lw / s);
  ctx.beginPath();
  rrect(ctx, -60, -70, 120, 170, 16); ctx.stroke();
  ctx.beginPath(); rrect(ctx, -70, -100, 140, 34, 8); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 50); ctx.moveTo(-35, 15); ctx.lineTo(35, 15); ctx.stroke();
  ctx.restore();
}
function iconLaw(ctx, x, y, s, color, lw) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ink(ctx, color, lw / s);
  ctx.beginPath();
  // scales of justice
  ctx.moveTo(0, -100); ctx.lineTo(0, 80); ctx.moveTo(-50, 90); ctx.lineTo(50, 90); ctx.moveTo(-30, 80); ctx.lineTo(30, 80);
  ctx.moveTo(-80, -70); ctx.lineTo(80, -70);
  ctx.moveTo(-80, -70); ctx.lineTo(-105, -10); ctx.moveTo(-80, -70); ctx.lineTo(-55, -10);
  ctx.moveTo(80, -70); ctx.lineTo(55, -10); ctx.moveTo(80, -70); ctx.lineTo(105, -10);
  ctx.moveTo(-110, -10); ctx.quadraticCurveTo(-80, 30, -50, -10); ctx.closePath();
  ctx.moveTo(50, -10); ctx.quadraticCurveTo(80, 30, 110, -10);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -104, 10, 0, TAU); ctx.stroke();
  ctx.restore();
}
