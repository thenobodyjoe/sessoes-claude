// ============================================================
// The dancers: original painted figures hung on the tracked joints. Nobody here is a portrait:
// the heads are faceless daubs, the costumes are new (the lead wears a vermilion coat with a gold lining,
// a cream scarf and a crimson beret; the others wear long coats in the night colours of the room).
// Coat hems and the scarf are simulated, so they swing and trail behind every move.
// MediaPipe joints: 0 nose, 7/8 ears, 11/12 shoulders, 13/14 elbows, 15/16 wrists, 19/20 index,
// 23/24 hips, 25/26 knees, 27/28 ankles, 29/30 heels, 31/32 toes (odd = the dancer's left).
// ============================================================
const LEAD_STYLE = {
  coat: [0.74, 0.13, 0.07], coat2: [0.93, 0.38, 0.1], lining: [0.98, 0.76, 0.28], shirt: [0.08, 0.05, 0.07],
  trousers: [0.07, 0.05, 0.08], shoe: [0.86, 0.6, 0.2], skin: [0.74, 0.5, 0.33], hair: [0.08, 0.05, 0.06],
  scarf: [0.98, 0.9, 0.68], beret: [0.46, 0.05, 0.13], lead: true
};
const CROWD_COATS = [
  [[0.12, 0.15, 0.36], [0.2, 0.26, 0.5]], [[0.05, 0.2, 0.28], [0.1, 0.34, 0.42]], [[0.28, 0.09, 0.24], [0.42, 0.16, 0.34]],
  [[0.2, 0.23, 0.28], [0.32, 0.36, 0.42]], [[0.27, 0.16, 0.09], [0.44, 0.27, 0.13]], [[0.07, 0.27, 0.26], [0.12, 0.4, 0.36]]
];
const CROWD_SKIN = [[0.62, 0.42, 0.3], [0.45, 0.28, 0.18], [0.78, 0.58, 0.44], [0.34, 0.2, 0.13], [0.7, 0.5, 0.36]];
function styleFor(id, lead) {
  if (lead) return LEAD_STYLE;
  const c = CROWD_COATS[id % CROWD_COATS.length];
  return {
    coat: c[0], coat2: c[1], lining: mixc(c[1], [0.95, 0.8, 0.45], 0.45), shirt: [0.82, 0.78, 0.66],
    trousers: scalec(c[0], 0.55), shoe: [0.1, 0.07, 0.07], skin: CROWD_SKIN[(id * 7) % CROWD_SKIN.length],
    hair: [0.06, 0.04, 0.05], scarf: null, beret: null, lead: false
  };
}

// ---------------------------------------------------------------- cloth, simulated once per track
// Units are body scales (S), so the sim does not care how big the dancer is on screen.
const CLOTH = new Map();   // id -> Map(frame -> {hem, scarf: [x, y, ...] relative to the neck})
function clipScale(P) {
  const X = m => P[m * 3] * VW, Y = m => P[m * 3 + 1] * VH;
  const sh = Math.hypot(X(11) - X(12), Y(11) - Y(12));
  const tl = Math.hypot((X(11) + X(12) - X(23) - X(24)) / 2, (Y(11) + Y(12) - Y(23) - Y(24)) / 2);
  const hd = Math.hypot(X(7) - X(8), Y(7) - Y(8));
  return Math.max(sh, tl * 0.62, hd * 2.2, 6);
}
function buildCloth() {
  const byId = new Map();
  for (let f = 0; f < NF; f++) for (const p of FRAME_PEOPLE[f]) {
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push([f, p.P]);
  }
  const NS = 7, SEG = 0.34;
  for (const [id, seq] of byId) {
    const out = new Map();
    let hem = 0, hemV = 0, px = null, py = null;
    let ch = null, chp = null;
    for (const [f, P] of seq) {
      const S = clipScale(P);
      const hx = (P[23 * 3] + P[24 * 3]) / 2 * VW, hy = (P[23 * 3 + 1] + P[24 * 3 + 1]) / 2 * VH;
      const nx = (P[11 * 3] + P[12 * 3]) / 2 * VW, ny = (P[11 * 3 + 1] + P[12 * 3 + 1]) / 2 * VH - S * 0.08;
      const vx = px === null ? 0 : clamp((hx - px) / S, -0.6, 0.6);
      // hem: a spring that lags behind the hips, with overshoot
      hemV += (-vx * 1.9 - hem) * 0.32; hemV *= 0.8; hem += hemV;
      hem = clamp(hem, -0.9, 0.9);
      // scarf: verlet chain in body units, anchored at the neck; the anchor's own motion drags it
      const ax = px === null ? 0 : (nx - (out.lastNx ?? nx)) / S, ay = py === null ? 0 : (ny - (out.lastNy ?? ny)) / S;
      if (!ch) { ch = []; chp = []; for (let k = 0; k < NS; k++) { ch.push(0.1 * k, SEG * k); chp.push(0.1 * k, SEG * k); } }
      for (let k = 1; k < NS; k++) {
        const x = ch[k * 2], y = ch[k * 2 + 1];
        const vxk = (x - chp[k * 2]) * 0.9 - ax * 0.9, vyk = (y - chp[k * 2 + 1]) * 0.9 - ay * 0.9;
        chp[k * 2] = x; chp[k * 2 + 1] = y;
        ch[k * 2] = x + vxk + 0.006 * Math.sin(f * 0.21 + k);
        ch[k * 2 + 1] = y + vyk + 0.045;
      }
      for (let it = 0; it < 4; it++) {
        ch[0] = 0; ch[1] = 0;
        for (let k = 1; k < NS; k++) {
          const dx = ch[k * 2] - ch[k * 2 - 2], dy = ch[k * 2 + 1] - ch[k * 2 - 1];
          const d = Math.hypot(dx, dy) || 1e-6, e = (d - SEG) / d;
          if (k > 1) { ch[k * 2 - 2] += dx * e * 0.5; ch[k * 2 - 1] += dy * e * 0.5; ch[k * 2] -= dx * e * 0.5; ch[k * 2 + 1] -= dy * e * 0.5; }
          else { ch[k * 2] -= dx * e; ch[k * 2 + 1] -= dy * e; }
        }
      }
      out.set(f, { hem, scarf: ch.slice() });
      out.lastNx = nx; out.lastNy = ny;
      px = hx; py = hy;
    }
    CLOTH.set(id, out);
  }
}

// ---------------------------------------------------------------- painting one dancer
const PT = new Float32Array(33 * 3);
function paintDancer(p, light, prevP) {
  const P = p.P, st = styleFor(p.id, p.lead);
  for (let m = 0; m < 33; m++) { PT[m * 3] = sx(P[m * 3]); PT[m * 3 + 1] = sy(P[m * 3 + 1]); PT[m * 3 + 2] = P[m * 3 + 2]; }
  const X = m => PT[m * 3], Y = m => PT[m * 3 + 1];
  const off = m => P[m * 3] < -0.02 || P[m * 3] > 1.02 || P[m * 3 + 1] < -0.02 || P[m * 3 + 1] > 1.02;
  const ok = m => PT[m * 3 + 2] > 0.3 || off(m);
  const S = clipScale(P) * VIEW.s;
  const cloth = (CLOTH.get(p.id) || new Map()).get(p.f) || { hem: 0, scarf: null };

  // light on this body: the room around it, the warm pool, and which side the key comes from
  const cx = (P[33] + P[36] + P[69] + P[72]) / 4, cy = (P[34] + P[37] + P[70] + P[73]) / 4;
  const [warm, cool] = light.pools;
  const wp = warm[3] * Math.exp(-(((cx - warm[0]) * VW / VH) ** 2 + (cy - warm[1]) ** 2) / (warm[2] * warm[2] * 1.6));
  const amb = light.room(cx, cy);
  const kL = 0.55 + 0.45 * amb[3] + 0.9 * wp + light.pulse * 0.08;
  const keySide = Math.sign(warm[0] - cx) || 1;
  const lit = c => { const k = kL; return [c[0] * k * (1 + 0.12 * wp), c[1] * k, c[2] * k * (1 - 0.1 * wp)]; };
  const rimC = mixc([1.0, 0.8, 0.45], [0.55, 0.78, 1.0], clamp(cool[3] * 2 - wp, 0, 1));
  const rimA = clamp(0.25 + wp * 0.9 + cool[3] * 0.4, 0, 0.85);

  const coat = lit(st.coat), coat2 = lit(st.coat2), lin = lit(st.lining), tro = lit(st.trousers), shoe = lit(st.shoe);
  const skin = lit(st.skin), hair = lit(st.hair), shirt = lit(st.shirt);
  G.mid = st.lead ? 1 : 2;
  const seed0 = p.id * 13.7;
  let sn = 0;
  const S_ = (ctrl, o) => strokeScreen(ctrl, Object.assign({ seed: (seed0 + sn++ * 1.37) % 97, rev: [NO_IN, NO_OUT] }, o));
  // a limb: body colour, a lit edge on the key side, a shadow edge on the other
  const limb = (pts, w0, w1, c, c2, o) => {
    const n = pts.length;
    const ctrl = pts.map((q, i) => ({ x: q[0], y: q[1], w: lerp(w0, w1, i / (n - 1)), c }));
    S_(ctrl, Object.assign({ c2, dry: 0.28, h: 0.5, w0: 0.85, tip: 0.6 }, o));
    const ax = pts[n - 1][0] - pts[0][0], ay = pts[n - 1][1] - pts[0][1], al = Math.hypot(ax, ay) || 1;
    let nx = -ay / al, ny = ax / al;
    if (nx * keySide < 0) { nx = -nx; ny = -ny; }
    S_(pts.map((q, i) => ({ x: q[0] + nx * lerp(w0, w1, i / (n - 1)) * 0.34, y: q[1] + ny * lerp(w0, w1, i / (n - 1)) * 0.34, w: lerp(w0, w1, i / (n - 1)) * 0.28, c: rimC })),
      { a: rimA, dry: 0.5, h: 0.6, tip: 0.3 });
    S_(pts.map((q, i) => ({ x: q[0] - nx * lerp(w0, w1, i / (n - 1)) * 0.3, y: q[1] - ny * lerp(w0, w1, i / (n - 1)) * 0.3, w: lerp(w0, w1, i / (n - 1)) * 0.36, c: scalec(c, 0.45) })),
      { a: 0.7, dry: 0.45, h: 0.4, tip: 0.4 });
  };
  const J = m => [X(m), Y(m)];
  const mid = (a, b, t) => [lerp(X(a), X(b), t === undefined ? 0.5 : t), lerp(Y(a), Y(b), t === undefined ? 0.5 : t)];
  const haveTorso = ok(11) && ok(12);
  const haveHips = ok(23) && ok(24);

  // contact shadow under the feet
  if (ok(27) && ok(28) && !off(27) && !off(28)) {
    const fx = (X(29) + X(30)) / 2, fy = Math.max(Y(29), Y(30), Y(31), Y(32)) + S * 0.04;
    S_([{ x: fx, y: fy, w: S * 0.5, c: [0.02, 0.02, 0.04] }], { len: S * 1.7 + Math.abs(X(27) - X(28)), ang: 0, a: 0.4, kind: 1 });
  }

  // brush trails behind fast hands and feet
  if (prevP) {
    for (const m of [15, 16, 27, 28]) {
      const qx = sx(prevP[m * 3]), qy = sy(prevP[m * 3 + 1]);
      const d = Math.hypot(X(m) - qx, Y(m) - qy);
      if (d > S * 0.22 && ok(m)) {
        const c = m < 20 ? coat2 : tro;
        S_([{ x: qx, y: qy, w: S * 0.05, c }, { x: (qx + X(m)) / 2, y: (qy + Y(m)) / 2, w: S * 0.16, c }, { x: X(m), y: Y(m), w: S * 0.22, c }],
          { kind: 1, a: clamp((d / S - 0.22) * 0.7, 0, 0.35), dry: 0.6 });
      }
    }
  }

  // legs and shoes
  for (const [h, k, a, heel, toe] of [[23, 25, 27, 29, 31], [24, 26, 28, 30, 32]]) {
    if (!ok(h) || !ok(k)) continue;
    limb([J(h), J(k)], S * 0.5, S * 0.4, tro, scalec(tro, 1.4));
    if (ok(a)) {
      limb([J(k), J(a)], S * 0.4, S * 0.3, tro, scalec(tro, 1.4));
      if (ok(toe)) S_([{ x: X(heel), y: Y(heel), w: S * 0.26, c: shoe }, { x: X(toe), y: Y(toe), w: S * 0.18, c: shoe }], { c2: mixc(shoe, [1, 1, 1], 0.4), h: 0.7, gloss: 0.8, dry: 0.15 });
    }
  }

  // the coat: panels from the shoulders to a hem at mid-thigh that swings with the hips
  if (haveTorso) {
    const hipL = haveHips ? J(23) : [X(11) + (X(11) - X(12)) * 0.05, Y(11) + S * 1.5];
    const hipR = haveHips ? J(24) : [X(12) - (X(11) - X(12)) * 0.05, Y(12) + S * 1.5];
    const shL = J(11), shR = J(12);
    const down = [(hipL[0] + hipR[0] - shL[0] - shR[0]) / 2, (hipL[1] + hipR[1] - shL[1] - shR[1]) / 2];
    const tw = Math.max(Math.hypot(shL[0] - shR[0], shL[1] - shR[1]), S * 0.9);
    const nP = 6;
    const swing = cloth.hem * S;
    for (let i = 0; i < nP; i++) {
      const u = (i + 0.5) / nP;
      const flare = (u - 0.5) * 0.35 * S;
      const top = [lerp(shL[0], shR[0], u), lerp(shL[1], shR[1], u)];
      const hp = [lerp(hipL[0], hipR[0], u) + flare * 0.3, lerp(hipL[1], hipR[1], u)];
      const hem = [hp[0] + down[0] * 0.6 + flare + swing * (0.6 + 0.8 * Math.abs(u - 0.5)), hp[1] + down[1] * 0.6];
      const c = scalec(coat, i % 2 ? 0.94 : 1.04);
      S_([{ x: top[0], y: top[1] - S * 0.02, w: tw / nP * 1.9, c }, { x: hp[0], y: hp[1], w: tw / nP * 1.8, c }, { x: hem[0], y: hem[1], w: tw / nP * 1.7, c }],
        { c2: coat2, dry: 0.3, h: 0.55, w0: 0.9, tip: 0.8, tS: 0.05 });
    }
    // the lining flashing at the open front, lapels, the shirt
    const neck = [(shL[0] + shR[0]) / 2, (shL[1] + shR[1]) / 2 - S * 0.04];
    const waist = [(hipL[0] + hipR[0]) / 2, (hipL[1] + hipR[1]) / 2 - down[1] * 0.15];
    S_([{ x: neck[0], y: neck[1] + S * 0.05, w: S * 0.2, c: shirt }, { x: waist[0], y: waist[1], w: S * 0.05, c: shirt }], { h: 0.4, dry: 0.25 });
    for (const s of [-1, 1]) {
      const sh = s < 0 ? shL : shR;
      S_([{ x: lerp(neck[0], sh[0], 0.45), y: lerp(neck[1], sh[1], 0.45), w: S * 0.1, c: lin },
          { x: waist[0] + s * S * 0.05, y: waist[1], w: S * 0.04, c: lin }], { h: 0.8, dry: 0.2, gloss: 0.5 });
      const hemIn = [waist[0] + down[0] * 0.75 + swing * 0.8 + s * S * 0.12, waist[1] + down[1] * 0.75];
      S_([{ x: waist[0] + s * S * 0.06, y: waist[1], w: S * 0.05, c: lin }, { x: hemIn[0], y: hemIn[1], w: S * 0.1, c: lin }], { a: 0.85, dry: 0.3 });
    }
    // rim light down the lit side of the coat
    const side = keySide * (X(12) > X(11) ? -1 : 1) > 0 ? [shL, hipL] : [shR, hipR];
    S_([{ x: side[0][0], y: side[0][1], w: S * 0.08, c: rimC }, { x: side[1][0] + swing * 0.5, y: side[1][1] + down[1] * 0.5, w: S * 0.05, c: rimC }], { a: rimA, h: 0.7, dry: 0.5 });
  }

  // arms: sleeves, a lining cuff, the hand
  for (const [s, e, w, idx] of [[11, 13, 15, 19], [12, 14, 16, 20]]) {
    if (!ok(s) || !ok(e)) continue;
    limb([J(s), J(e)], S * 0.42, S * 0.34, coat, coat2);
    if (!ok(w)) continue;
    limb([J(e), J(w)], S * 0.34, S * 0.27, coat, coat2);
    const cu = mid(e, w, 0.86);
    S_([{ x: cu[0], y: cu[1], w: S * 0.22, c: lin }], { len: S * 0.1, ang: Math.atan2(Y(w) - Y(e), X(w) - X(e)) + Math.PI / 2, h: 0.6 });
    const hx = ok(idx) ? X(idx) : X(w) + (X(w) - X(e)) * 0.25, hy = ok(idx) ? Y(idx) : Y(w) + (Y(w) - Y(e)) * 0.25;
    S_([{ x: X(w), y: Y(w), w: S * 0.2, c: skin }, { x: hx, y: hy, w: S * 0.15, c: skin }], { h: 0.5, dry: 0.3 });
  }

  // the scarf (the lead only): wrapped once at the throat, then the tail the sim swings
  if (st.scarf && haveTorso && cloth.scarf) {
    const n0 = [(X(11) + X(12)) / 2, (Y(11) + Y(12)) / 2 - S * 0.08];
    const sc = lit(st.scarf);
    S_([{ x: n0[0] - S * 0.2, y: n0[1], w: S * 0.14, c: sc }, { x: n0[0], y: n0[1] + S * 0.05, w: S * 0.16, c: sc }, { x: n0[0] + S * 0.2, y: n0[1], w: S * 0.14, c: sc }], { h: 0.6 });
    const ctrl = [];
    for (let k = 0; k < cloth.scarf.length / 2; k++) ctrl.push({ x: n0[0] + cloth.scarf[k * 2] * S, y: n0[1] + cloth.scarf[k * 2 + 1] * S, w: S * (0.2 - k * 0.012), c: k % 2 ? sc : scalec(sc, 0.9) });
    S_(ctrl, { c2: [1, 0.97, 0.85], h: 0.6, dry: 0.35, tip: 0.5 });
  }

  // head: neck, a faceless daub of skin, hair swept to the back of the head, the lead's beret
  const haveHead = ok(0) || ok(7) || ok(8);
  if (haveHead) {
    const ex = ok(7) && ok(8) ? (X(7) + X(8)) / 2 : X(0), ey = ok(7) && ok(8) ? (Y(7) + Y(8)) / 2 : Y(0);
    const ear = ok(7) && ok(8) ? Math.hypot(X(7) - X(8), Y(7) - Y(8)) : 0;
    const R = Math.max(ear * 0.62, S * 0.27);
    const face = [X(0) - ex, Y(0) - ey];
    const fl = Math.hypot(face[0], face[1]);
    const fdx = fl > 1e-3 ? face[0] / fl : 0, turn = clamp(fl / R, 0, 1);
    const hc = [ex + fdx * R * 0.1, ey - R * 0.05];
    if (haveTorso) {
      const nb = [(X(11) + X(12)) / 2, (Y(11) + Y(12)) / 2];
      S_([{ x: nb[0], y: nb[1], w: S * 0.24, c: scalec(skin, 0.75) }, { x: hc[0], y: hc[1] + R * 0.6, w: S * 0.2, c: skin }], { h: 0.4 });
    }
    // face: one round daub of skin, turned toward the nose, a shadow on the far side; no features
    const fcx = hc[0] + fdx * R * 0.18 * turn, fcy = hc[1] + R * 0.08;
    S_([{ x: fcx, y: fcy, w: R * 1.55, c: skin }], { len: R * 1.25, ang: Math.PI / 2, c2: mixc(skin, [1, 0.85, 0.7], 0.3), h: 0.45, dry: 0.2, tip: 0.7, w0: 0.8 });
    S_([{ x: fcx - keySide * R * 0.5, y: fcy - R * 0.35, w: R * 0.42, c: scalec(skin, 0.82) }, { x: fcx - keySide * R * 0.45, y: fcy + R * 0.45, w: R * 0.34, c: scalec(skin, 0.82) }],
      { a: 0.4, h: 0.35, dry: 0.35 });
    // hair: a cap over the crown and down the back of the head
    const back = fl > R * 0.15 ? -fdx : 0;
    for (let k = 0; k < 5; k++) {
      const a0 = Math.PI * (1.05 + k * 0.225) + back * 0.35;
      const x0 = hc[0] + Math.cos(a0) * R * 0.72, y0 = hc[1] + Math.sin(a0) * R * 0.78;
      const x1 = hc[0] + Math.cos(a0 + 0.5) * R * 0.8 + back * R * 0.25, y1 = hc[1] + Math.sin(a0 + 0.5) * R * 0.8;
      S_([{ x: x0, y: y0, w: R * 0.72, c: hair }, { x: x1, y: y1, w: R * 0.6, c: hair }], { c2: mixc(hair, rimC, 0.25), h: 0.6, dry: 0.3 });
    }
    if (back) S_([{ x: hc[0] + back * R * 0.55, y: hc[1] - R * 0.4, w: R * 0.55, c: hair }, { x: hc[0] + back * R * 0.6, y: hc[1] + R * 0.35, w: R * 0.45, c: hair }], { h: 0.55, dry: 0.3 });
    if (st.beret) {
      const bc = lit(st.beret);
      const tilt = -fdx * 0.25 - 0.15;
      const bx = hc[0] - fdx * R * 0.15, by = hc[1] - R * 0.78;
      S_([{ x: bx - Math.cos(tilt) * R * 0.95, y: by - Math.sin(tilt) * R * 0.95, w: R * 0.5, c: bc },
          { x: bx, y: by - R * 0.12, w: R * 0.62, c: bc },
          { x: bx + Math.cos(tilt) * R * 0.95, y: by + Math.sin(tilt) * R * 0.95, w: R * 0.45, c: bc }], { c2: lit([0.7, 0.1, 0.2]), h: 0.7, dry: 0.2 });
      S_([{ x: bx, y: by - R * 0.4, w: R * 0.14, c: lin }], { len: R * 0.2, ang: -1.2, h: 0.9 });
    }
  }
  G.mid = 0;
}
