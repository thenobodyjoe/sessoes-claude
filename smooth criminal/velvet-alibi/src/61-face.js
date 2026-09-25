// ============================================================
// Face, hands and light shading, carried over from the original engine
// (the suit, hat and body are in 60-figure.js)
// ============================================================
function shade(mat, n, jit) {
  const dw = vdot(n, G.wDir), dc = vdot(n, G.cDir);
  const lw = clamp(smoothstep(-0.45, 0.8, dw) * G.wI, 0, 1.25);
  const lc = smoothstep(0.0, 0.85, dc) * G.cI;
  if (G.pop) { const v = clamp(0.2 + 0.62 * smoothstep(0, 1.1, lw) + 0.18 * lc, 0, 1); return [v, v, v]; }
  let c = mixc(mat.s, mat.m, smoothstep(0.0, 0.5, lw));
  c = mixc(c, mat.l, smoothstep(0.5, 1.15, lw));
  c = mixc(c, mat.c, clamp(lc * 0.45 * (1 - 0.6 * smoothstep(0.4, 1.0, lw)), 0, 1));
  if (G.tint) c = [c[0] * G.tint[0], c[1] * G.tint[1], c[2] * G.tint[2]];
  if (jit) c = scalec(c, 1 + jit);
  return c;
}

function screenAng(p, q) {
  const a = G.proj(p), b = G.proj(q);
  return Math.atan2(b.y - a.y, b.x - a.x);
}
function perpToward(dir, toward) {
  let p = vcross(dir, V(0, 0, 1));
  if (vlen(p) < 1e-4) p = V(1, 0, 0);
  p = vnorm(p);
  return vdot(p, toward) < 0 ? vmul(p, -1) : p;
}


function drawHead(J) {
  const H = J.head, R = J.Rh, ps = J.pose;
  const hp = (x, y, z) => xf(H, R, x, y, z);
  const hn = (x, y, z) => mv(R, vnorm(V(x, y, z)));
  const skin = (x, y, z, j) => shade(MAT.skin, hn(x, y, z), j);
  G.mid = ID.skin;
  // block in the head in a darker skin tone first, so no gaps open between the planes
  st([hp(0, 8.5, 4.5), hp(0, 1, 5.5), hp(0, -7, 5.5), hp(0, -10, 5)], [13.4, 14.6, 13, 8], skin(0.2, -0.1, 0.5, -0.18), { dry: 0.05, h: 0.3, w0: 0.9, tip: 0.8 });
  for (const sg of [-1, 1]) {
    st([hp(sg * 6.6, 5, 1.5), hp(sg * 7.0, 0, 1.2), hp(sg * 6.4, -5, 1.8)], [3.2, 3.6, 3], skin(sg, 0, 0.2, -0.12), { dry: 0.15, h: 0.35 });
    st([hp(sg * 7.2, 2.4, -0.4), hp(sg * 7.7, -0.3, -0.3), hp(sg * 7.0, -3.4, 0.2)], [2.0, 2.5, 1.8], skin(sg, 0, 0.35, -0.05), { dry: 0.2, h: 0.4 });
  }
  st([hp(0, 8.6, 7.6), hp(0, 3, 9.6), hp(0, -3, 9.8), hp(0, -8, 8.8), hp(0.1, -11.1, 7.2)], [12.2, 13.9, 13.2, 10.2, 5.4],
    [skin(0, 0.5, 1), skin(0, 0.1, 1), skin(0, -0.1, 1), skin(0, -0.4, 1, -0.04), skin(0, -0.8, 0.6, -0.08)], { dry: 0.08, h: 0.35, w0: 0.9, tip: 0.8, c2: G.pop ? undefined : [0.86, 0.5, 0.42] });
  st([hp(-3.7, 7.6, 8.2), hp(-4.7, 2, 8.6), hp(-4.4, -3.5, 8.4), hp(-3.1, -8, 7.8)], [4.4, 5, 4.6, 3.3],
    [skin(-0.7, 0.4, 0.7, 0.05), skin(-0.8, 0, 0.6, 0.05), skin(-0.8, -0.2, 0.6, 0.03), skin(-0.6, -0.5, 0.6)], { dry: 0.2, h: 0.4 });
  st([hp(5.6, 6.2, 6.4), hp(6.2, 1, 6.6), hp(5.7, -4.5, 6.0), hp(3.8, -8.8, 6.2)], [2.8, 3.2, 3.0, 2.3],
    [skin(0.9, 0.2, 0.3, -0.1), skin(1, 0, 0.3, -0.12), skin(0.9, -0.2, 0.3, -0.12), skin(0.6, -0.6, 0.4, -0.1)], { a: 0.7, dry: 0.3, h: 0.4 });
  st([hp(-3, 6.3, 9.2), hp(1.5, 6.7, 9.4)], 2.2, skin(-0.3, 0.6, 0.8, 0.08), { a: 0.7, dry: 0.4, noShadow: true });
  for (const sg of [-1, 1]) {
    if (!G.pop) dab(hp(sg * 4.3, -2.8, 8.5), 3.2, 3, [0.9, 0.46, 0.42], { kind: 1, a: 0.3, noShadow: true });
    dab(hp(sg * 3.1, 1.3, 9.0), 3.2, 3.8, G.pop ? [0.45, 0.45, 0.45] : mixc(MAT.skin.s, MAT.skin.m, 0.45), { kind: 1, a: 0.45, ang: 0, noShadow: true });
  }
  // brows
  G.mid = ID.ink;
  const br = ps.brow * 0.8;
  for (const sg of [-1, 1]) st([hp(sg * 1.3, 3.3 + br * 0.6, 9.8), hp(sg * 3.4, 3.95 + br, 9.6), hp(sg * 5.6, 3.3 + br * 0.5, 8.6)], [1.1, 1.3, 0.9], [0.4, 0.18, 0.11], { dry: 0.25, noShadow: true });
  // eyes (free-side eye can wink)
  for (const sg of [-1, 1]) {
    const shut = clamp(ps.blink + (sg > 0 ? ps.wink : 0), 0, 1);
    G.mid = ID.ink;
    if (shut > 0.6) {
      st([hp(sg * 1.9, 1.3, 9.4), hp(sg * 3.1, 0.8, 9.5), hp(sg * 4.4, 1.2, 9.0)], 0.6, [0.2, 0.1, 0.1], { dry: 0.2, noShadow: true });
    } else {
      st([hp(sg * 1.9, 1.2, 9.4), hp(sg * 3.1, 1.6 - shut + ps.brow * 0.25, 9.45), hp(sg * 4.4, 1.15, 9.0)], 0.9, [0.15, 0.08, 0.08], { dry: 0.1, w0: 0.8, tip: 0.6, noShadow: true });
      dab(hp(sg * 3.0, 0.85, 9.45), 1.2 * (1 - shut) + 0.2 + ps.brow * 0.25, 1.1, [0.19, 0.12, 0.12], { ang: 0, noShadow: true });
      G.mid = ID.white;
      dab(hp(sg * 3.0 - 0.4, 1.2, 9.6), 0.4, 0.4, [0.95, 0.9, 0.88], { a: 0.75 * (1 - shut), noShadow: true });
    }
  }
  // nose
  G.mid = ID.skin;
  st([hp(0.9, 2.2, 10.2), hp(1.3, -1.5, 11.0), hp(1.0, -3.3, 11.1)], [1.0, 1.25, 1.1], G.pop ? [0.3, 0.3, 0.3] : mixc(MAT.skin.s, MAT.skin.m, 0.35), { a: 0.75, dry: 0.3, noShadow: true });
  dab(hp(-0.3, -2.6, 11.7), 1.6, 1.4, skin(-0.4, 0, 1, 0.08), { a: 0.8, noShadow: true });
  dab(hp(0.2, -4.1, 10.9), 1.0, 2.4, G.pop ? [0.3, 0.3, 0.3] : [0.55, 0.3, 0.3], { a: 0.75, ang: 0, noShadow: true });
  // mouth
  const mo = ps.mouth, sm = ps.smile, mO = ps.mO || 0;
  if (mO > 0.25) {
    // a round "oh!" of surprise
    G.mid = ID.ink;
    dab(hp(0, -7.2, 9.8), 1.4 + 2.0 * mO, 1.8 + 2.4 * mO, [0.2, 0.06, 0.08], { ang: Math.PI / 2, dry: 0.05, noShadow: true });
    G.mid = ID.lips;
    st([hp(-1.2 - mO, -6.6, 9.4), hp(0, -5.6 + 0.2 * mO, 10.0), hp(1.2 + mO, -6.6, 9.4)], 0.8, [0.72, 0.36, 0.34], { dry: 0.2, noShadow: true });
    st([hp(-1.1 - mO, -7.6, 9.4), hp(0, -8.9 - 0.9 * mO, 9.8), hp(1.1 + mO, -7.6, 9.4)], 1.0, [0.8, 0.44, 0.4], { dry: 0.2, noShadow: true });
  } else if (mo > 0.15) {
    G.mid = ID.ink;
    dab(hp(0, -6.9 - mo * 0.5, 9.7), 1.0 + mo * 2.0, 3.0, [0.2, 0.06, 0.08], { ang: 0, dry: 0.05, noShadow: true });
    G.mid = ID.lips;
    st([hp(-2.5, -5.9, 9.1), hp(0, -5.8, 10.0), hp(2.5, -5.9, 9.1)], 0.8, [0.7, 0.34, 0.32], { dry: 0.2, noShadow: true });
    st([hp(-2.0, -7.5 - mo * 1.0, 9.2), hp(0, -8.0 - mo * 1.1, 9.7), hp(2.0, -7.5 - mo * 1.0, 9.2)], 1.0, [0.8, 0.44, 0.4], { dry: 0.2, noShadow: true });
  } else if (sm > 0.8) {
    // the grin: teeth between the lips, corners pulled up
    const k = (sm - 0.8) / 0.2;
    G.mid = ID.ink;
    st([hp(-3.0, -5.7 + sm * 0.5, 8.9), hp(0, -6.35, 10.0), hp(3.0, -5.7 + sm * 0.5, 8.9)], 0.75, [0.42, 0.14, 0.15], { dry: 0.15, noShadow: true });
    G.mid = ID.white;
    st([hp(-2.3, -6.1 + sm * 0.25, 9.3), hp(0, -6.75, 10.0), hp(2.3, -6.1 + sm * 0.25, 9.3)], 0.55 + 0.35 * k, [0.94, 0.9, 0.84], { dry: 0.2, noShadow: true, exact: true });
    G.mid = ID.ink;
    st([hp(-2.1, -6.6 + sm * 0.2, 9.3), hp(0, -7.25, 9.9), hp(2.1, -6.6 + sm * 0.2, 9.3)], 0.5, [0.35, 0.1, 0.12], { dry: 0.2, a: 0.8, noShadow: true });
    G.mid = ID.lips;
    st([hp(-1.6, -7.7, 9.5), hp(1.6, -7.7, 9.5)], 1.0, [0.82, 0.48, 0.44], { a: 0.7, dry: 0.3, noShadow: true });
  } else {
    G.mid = ID.ink;
    st([hp(-2.8, -6.0 + sm * 0.7, 9.0), hp(0, -6.5, 10.0), hp(2.8, -6.0 + sm * 0.7, 9.0)], 0.8, [0.45, 0.15, 0.16], { dry: 0.15, noShadow: true });
    G.mid = ID.lips;
    st([hp(-1.5, -7.3, 9.5), hp(1.5, -7.3, 9.5)], 1.1, [0.82, 0.48, 0.44], { a: 0.75, dry: 0.3, noShadow: true });
  }
  G.mid = ID.skin;
  dab(hp(-0.5, -9.6, 8.3), 2, 2.4, skin(-0.3, -0.5, 0.9, 0.06), { a: 0.5, noShadow: true });
  drawHair(J);
}


function drawHand(J, which) {
  const M = which === 'M';
  const ps = J.pose;
  const el = M ? J.elM : J.elF, wr = M ? J.wrM : J.wrF;
  const fore = vnorm(vsub(wr, el));
  let dir = fore;
  if (!M) dir = vnorm(vadd(fore, V(0, 0.25, 0.2)));
  const lat = perpToward(dir, V(M ? -1 : 1, 0, 0));
  const knuck = vmad(wr, dir, 8.2);
  G.mid = ID.skin;
  const cS = shade(MAT.skin, vnorm(V(M ? -0.4 : 0.3, 0.3, 0.9)));
  const cL = shade(MAT.skin, vnorm(V(-0.6, 0.5, 0.7)), 0.04);
  const open = M ? (ps.mOpen || 0) : ps.fOpen * (1 - ps.fPoint);
  st([vmad(wr, dir, 0.5), vmad(wr, dir, 4.8), knuck], [6.6, 8.2, 8.4 - open * 0.8], cS, { dry: 0.14, h: 0.45, w0: 0.9, tip: 0.85 });
  if (open > 0.05) {
    for (let i = 0; i < 4; i++) {
      const o = (i - 1.5);
      const base = vmad(knuck, lat, o * 1.9);
      const fd = vnorm(vadd(dir, vmul(lat, o * 0.16 * open)));
      const tip = vmad(vmad(base, fd, 1 + 6.2 * open), V(0, 0, 1), 0.6 * open);
      st([vmad(base, fd, -1), tip], [2.0, 1.6], i === 0 ? cL : cS, { dry: 0.15, h: 0.4, tip: 0.7, w0: 0.9 });
    }
  } else {
    st([vmad(knuck, lat, -3.8), vmad(vmad(knuck, V(0, 0, 1), 1.4), lat, 0), vmad(knuck, lat, 3.8)], 2.4, cL, { a: 0.85, dry: 0.3, noShadow: true });
  }
  if (!M && ps.fPoint > 0.05) {
    const base = vmad(knuck, lat, -2.2);
    st([vmad(base, dir, -1), vmad(base, dir, 1 + 7.5 * ps.fPoint)], [2.1, 1.7], cL, { dry: 0.12, h: 0.4, tip: 0.8, w0: 0.9 });
  }
  const th0 = vmad(vmad(wr, lat, -3.2), dir, 1.5);
  st([th0, vmad(vmad(th0, dir, 4.2), lat, -1.2 - open * 1.5)], [2.5, 2.0], cS, { dry: 0.15, h: 0.4, tip: 0.8, w0: 0.9 });
}

