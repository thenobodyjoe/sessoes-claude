// ============================================================
// Scene 5 (beats 17-20): "LEVA SÓ 2 MINUTOS". The ranking card is now a stopwatch; a slot-machine
// digit rolls to 2 while the arc sweeps once round.
// Wipe (19.45-20.45): three bars shaped like the logo's (rounded top-left) sweep up and away.
// Scene 6 (beats 20-24): the voting machine. Four boxes fill, CONFIRMA, "FIM"... and the letters of
// FIM come loose to seed the logo. No digits are ever shown: no candidate, no party number.
// ============================================================
const CLOCK = { cx: 540, cy: 1010, R: 300, th: 28, track: '#1E2C72' };

function sceneClock(ctx, b, withBg) {
  if (withBg) {
    bgNavy(ctx, b, C.ink, C.navy, CLOCK.cy);
    dotGrid(ctx, b, 0.06);
  }
  const { cx, cy, R, th } = CLOCK;
  const pop = kick(b, 19.25, 5);
  // ticks
  for (let i = 0; i < 60; i++) {
    const q = pr(b, 17.1 + i * 0.008, 17.45 + i * 0.008, E.outBack);
    if (q <= 0) continue;
    const a = -Math.PI / 2 + (i / 60) * TAU, big = i % 5 === 0;
    const r0 = R + 32 + (big ? 0 : 8), r1 = R + 32 + (big ? 30 : 20) * q;
    const lit = seg(b, 17.35, 19.25) * 60 > i;
    ctx.strokeStyle = lit ? C.yellow : rgba(C.mute, 0.55);
    ctx.lineWidth = big ? 6 : 3;
    ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.stroke();
  }
  // ring track (only once the morph from the card has finished)
  if (b >= 17.3) {
    ctx.strokeStyle = CLOCK.track; ctx.lineWidth = th;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
  }
  // crown button, pressed to start
  const press = bump1(b, 17.3) * 10;
  ctx.fillStyle = CLOCK.track;
  rrect(ctx, cx - 22, cy - R - 64 + press, 44, 40, 8); ctx.fill();
  rrect(ctx, cx - 44, cy - R - 76 + press, 88, 20, 10); ctx.fill();
  // the sweep
  const p = E.inOutCubic(seg(b, 17.35, 19.25));
  if (p > 0) {
    const a0 = -Math.PI / 2, a1 = a0 + p * TAU;
    ctx.save();
    ctx.shadowColor = C.yellow; ctx.shadowBlur = 30;
    ctx.strokeStyle = C.yellow; ctx.lineWidth = th; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a1); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx + Math.cos(a1) * R, cy + Math.sin(a1) * R, th * 0.36, 0, TAU); ctx.fill();
  }
  if (pop > 0.02) {
    ctx.strokeStyle = rgba(C.yellow, pop * 0.8); ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R + (1 - pop) * 160, 0, TAU); ctx.stroke();
  }
  // the digit: a slot-machine roll 0 -> 1 -> 2, clipped to the dial
  const roll = seg(b, 17.35, 18.15);
  if (roll > 0) {
    const size = 470, dh = size * 1.1;
    const v = E.outBack(roll, 1.3) * 2;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R - th / 2 - 4, 0, TAU); ctx.clip();
    ctx.font = FONT(900, size); ctx.textAlign = 'center';
    const sc = 1 + 0.07 * pop;
    ctx.translate(cx, cy); ctx.scale(sc, sc);
    for (let d = 0; d <= (v > 2 ? 3 : 2); d++) {
      const y = (d - v) * dh;
      if (Math.abs(y) > dh * 1.2) continue;
      ctx.fillStyle = d === 2 ? C.white : rgba(C.white, 0.5);
      ctx.fillText(String(d % 10), 0, y + size * 0.35);
    }
    ctx.restore();
  }
  if (withBg) {
    kLine(ctx, b, { text: 'LEVA SÓ', x: 540, y: 470, size: 130, weight: 800, maxW: 960, tIn: 17.05, style: 'rise', mask: true });
    kLine(ctx, b, { text: 'MINUTOS', x: 540, y: 1510, size: 136, weight: 900, maxW: 960, tIn: 17.55, style: 'rise', mask: true, color: C.yellow });
  }
  burst(ctx, b, 19.25, cx, cy - R, 14, 7, 360);
}

// the three-bar wipe (colours of the flag, shape of the logo's bars)
function wipeBars(ctx, b) {
  if (b < 19.45 || b > 20.5) return;
  const cols = [C.green, C.yellow, C.blue];
  for (let i = 0; i < 3; i++) {
    const top = lerp(H + 60, -60, E.inOutExpo(seg(b, 19.45 + i * 0.09, 19.86 + i * 0.09)));
    const bot = lerp(H + 60, -60, E.inOutExpo(seg(b, 19.98 + i * 0.09, 20.4 + i * 0.09)));
    if (bot <= top) continue;
    const x = i * 360;
    ctx.fillStyle = cols[i];
    const r = Math.min(180, (bot - top) / 2);
    ctx.beginPath();
    ctx.moveTo(x, top + r); ctx.arcTo(x, top, x + r, top, r);
    ctx.lineTo(x + 362, top); ctx.lineTo(x + 362, bot); ctx.lineTo(x, bot); ctx.closePath();
    ctx.fill();
  }
}

// ---------- scene 6: the voting machine (a stylised, upright take on the Brazilian urna)
const URNA = {
  x: 170, y: 700, w: 740, h: 860,
  scr: [215, 760, 650, 300], lcd: [235, 780, 610, 260],
  keyW: 130, keyH: 74, keyX0: 327, keyY0: 1090, pitchX: 148, pitchY: 92,
  btnY: 1460, btnH: 72,
  btns: [['BRANCO', 205, 200, '#F7F7F2'], ['CORRIGE', 420, 200, '#F28C28'], ['CONFIRMA', 635, 240, '#1FA64A']],
};
const FILLS = [20.55, 20.8, 21.05, 21.3];         // the four boxes fill (the typing is off screen)
const CONFIRM_B = 22.0;
// the FIM letters, where they sit on the screen: shared with the logo scene, which takes them over
function fimLayout(ctx) {
  const L = layoutLine(ctx, 'FIM', 900, 190, 6);
  const x0 = 540 - L.w / 2;
  return ['F', 'I', 'M'].map((ch, i) => ({ ch, x: x0 + L.xs[i] + L.ws[i] / 2, y: 978 - 190 * 0.35, w: L.ws[i] }));
}
function urnaFall(b) { return E.inExpo(seg(b, 23.35, 23.95)); }

function sceneUrna(ctx, b, withBg) {
  if (withBg) {
    bgNavy(ctx, b, C.ink, C.navy, 1100);
    glow(ctx, 540, 1150, 700, '#2F5BFF', 0.18);
  }
  const enter = pr(b, 19.95, 20.6, E.outExpo);
  const fall = urnaFall(b);
  const [shx, shy] = shakeAt(b, [[CONFIRM_B, 10], [22.25, 16]]);
  const s = lerp(0.95, 1, enter) + 0.03 * kick(b, 22.25, 4);
  ctx.save();
  ctx.translate(540 + shx, 1130 + shy + (1 - enter) * 80 + fall * 1100);
  ctx.rotate(fall * 0.16);
  ctx.scale(s, s);
  ctx.translate(-540, -1130);
  urnaBody(ctx, b);
  ctx.restore();

  // pointer to CONFIRMA
  const cb = URNA.btns[2], bx = cb[1] + cb[2] / 2, by = URNA.btnY + URNA.btnH / 2;
  const [px, py] = pathAt([[21.1, 1180, 1780], [21.85, bx + 10, by + 6], [22.3, bx + 14, by + 10], [22.9, 1200, 1900]], b);
  pointer(ctx, px, py, bump1(b, CONFIRM_B), pr(b, 21.1, 21.3) * (1 - seg(b, 22.6, 22.9)));
  ripple(ctx, bx, by, b, CONFIRM_B, C.green, 150);

  // headline
  kLine(ctx, b, { text: 'SEU VOTO', x: 540, y: 330, size: 122, weight: 800, maxW: 960, tIn: 20.2, style: 'rise', mask: true, tOut: 23.3, outDur: 0.4 });
  kLine(ctx, b, { text: 'NÃO É', x: 540, y: 462, size: 122, weight: 800, maxW: 960, tIn: 22.22, style: 'slam', stagger: 0.03, dur: 0.6, tOut: 23.35, outDur: 0.4 });
  kLine(ctx, b, { text: 'DESPERDIÇADO.', x: 540, y: 594, size: 122, weight: 900, maxW: 960, tIn: 22.4, style: 'slam', stagger: 0.03, dur: 0.6, color: C.green, tOut: 23.4, outDur: 0.4 });
}

function urnaBody(ctx, b) {
  const U = URNA;
  // body
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 70; ctx.shadowOffsetY = 36;
  rrect(ctx, U.x, U.y, U.w, U.h, 34);
  const g = ctx.createLinearGradient(0, U.y, 0, U.y + U.h);
  g.addColorStop(0, '#F1ECDF'); g.addColorStop(1, '#D8D0BC');
  ctx.fillStyle = g; ctx.fill();
  ctx.restore();
  ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(U.x + 30, U.y + 22, U.w - 60, 6);
  // screen
  const [sx, sy, sw, sh] = U.scr, [lx, ly, lw, lh] = U.lcd;
  rrect(ctx, sx, sy, sw, sh, 16); ctx.fillStyle = '#2A2E38'; ctx.fill();
  const lg = ctx.createLinearGradient(0, ly, 0, ly + lh);
  lg.addColorStop(0, '#E3EAE4'); lg.addColorStop(1, '#CCD6CF');
  ctx.fillStyle = lg; ctx.fillRect(lx, ly, lw, lh);
  const done = b >= CONFIRM_B + 0.12;
  ctx.save();
  ctx.beginPath(); ctx.rect(lx, ly, lw, lh); ctx.clip();
  ctx.fillStyle = '#1E2522';
  if (!done) {
    ctx.font = FONT(600, 22); ctx.fillText('SEU VOTO PARA', lx + 22, ly + 38);
    ctx.font = FONT(700, 34); ctx.textAlign = 'center'; ctx.fillText('DEPUTADO FEDERAL', 540, ly + 92); ctx.textAlign = 'left';
    const bw = 64, bh = 78, gap = 16, x0 = 540 - (4 * bw + 3 * gap) / 2, y0 = ly + 118;
    FILLS.forEach((f, i) => {
      const x = x0 + i * (bw + gap);
      const on = b >= f, flash = kick(b, f, 10);
      ctx.lineWidth = 3; ctx.strokeStyle = '#1E2522';
      ctx.fillStyle = `rgba(30,37,34,${0.12 * flash})`;
      ctx.fillRect(x, y0, bw, bh); ctx.strokeRect(x, y0, bw, bh);
      if (on) { ctx.fillStyle = '#1E2522'; ctx.beginPath(); ctx.arc(x + bw / 2, y0 + bh / 2, 12 * E.outBack(seg(b, f, f + 0.2), 3), 0, TAU); ctx.fill(); }
      const next = FILLS.findIndex(ff => b < ff);
      if (next === i && Math.floor(b * 4) % 2 === 0) ctx.fillRect(x + 12, y0 + bh - 14, bw - 24, 5);
    });
    ctx.font = FONT(500, 19); ctx.textAlign = 'center';
    ctx.fillText('Aperte a tecla VERDE para CONFIRMAR este voto', 540, ly + lh - 20);
    ctx.textAlign = 'left';
  } else {
    // FIM (its letters leave the screen for the logo scene)
    const lift = seg(b, 23.3, 23.5);
    if (lift < 1) {
      ctx.font = FONT(900, 190);
      ctx.globalAlpha = 1 - lift;
      for (const l of fimLayout(ctx)) { ctx.fillText(l.ch, l.x - l.w / 2, 978); }
      ctx.globalAlpha = 1;
    }
  }
  // the screen flashes as the vote is cast
  const fl = kick(b, CONFIRM_B + 0.12, 7);
  if (fl > 0.01) { ctx.fillStyle = `rgba(255,255,255,${0.8 * fl})`; ctx.fillRect(lx, ly, lw, lh); }
  ctx.restore();
  // keypad (keys lift off for the logo scene)
  const lift = seg(b, 23.3, 23.45);
  for (let k = 0; k < 10; k++) {
    const [x, y] = urnaKey(k);
    ctx.globalAlpha = 1 - lift;
    rrect(ctx, x, y + 4, U.keyW, U.keyH, 12); ctx.fillStyle = '#0B0C0F'; ctx.fill();
    rrect(ctx, x, y, U.keyW, U.keyH, 12); ctx.fillStyle = '#1C1D22'; ctx.fill();
    ctx.font = FONT(700, 38); ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    ctx.fillText(String(k === 9 ? 0 : k + 1), x + U.keyW / 2, y + U.keyH / 2 + 14);
    ctx.textAlign = 'left';
    ctx.globalAlpha = 1;
  }
  // action buttons
  U.btns.forEach(([t, x, w, col], i) => {
    const pressed = i === 2 ? Math.max(0, 1 - Math.abs(b - CONFIRM_B - 0.04) / 0.14) : 0;
    const y = U.btnY + pressed * 6;
    rrect(ctx, x, U.btnY + 6, w, U.btnH, 12); ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fill();
    rrect(ctx, x, y, w, U.btnH, 12); ctx.fillStyle = pressed ? mix(col, '#000000', 0.2 * pressed) : col; ctx.fill();
    ctx.font = FONT(700, 25); ctx.fillStyle = '#16181C'; ctx.textAlign = 'center';
    ctx.fillText(t, x + w / 2, y + U.btnH / 2 + 9);
    ctx.textAlign = 'left';
  });
}
function urnaKey(k) {
  const U = URNA;
  const col = k === 9 ? 1 : k % 3, row = k === 9 ? 3 : Math.floor(k / 3);
  return [U.keyX0 + col * U.pitchX, U.keyY0 + row * U.pitchY];
}
// screen position of an urna element, with the urna's current transform (used by the logo scene)
function urnaToScreen(b, x, y) {
  const enter = pr(b, 19.95, 20.6, E.outExpo), fall = urnaFall(b);
  const s = lerp(0.95, 1, enter) + 0.03 * kick(b, 22.25, 4);
  const c = Math.cos(fall * 0.16), si = Math.sin(fall * 0.16);
  const dx = (x - 540) * s, dy = (y - 1130) * s;
  return [540 + dx * c - dy * si, 1130 + (1 - enter) * 80 + fall * 1100 + dx * si + dy * c];
}
