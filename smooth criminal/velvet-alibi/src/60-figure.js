// ============================================================
// The people of the club, painted stroke by stroke from a posed skeleton.
// One painter dresses everybody: a cream-suited lead and dancers in dark suits and fedoras.
// (face, hands and the light-shading helper live in 61-face.js)
// ============================================================
const ID = { coat: 1, lining: 2, blk: 3, skin: 4, hair: 5, mic: 6, ink: 7, lips: 8, white: 9 };
const mat = (s, m, l, c) => ({ s, m, l, c });
const MAT = {
  skin: mat([0.5, 0.27, 0.27], [0.83, 0.53, 0.41], [0.96, 0.69, 0.53], [0.74, 0.55, 0.6]),
  hair: mat([0.02, 0.015, 0.02], [0.08, 0.05, 0.05], [0.24, 0.15, 0.13], [0.2, 0.28, 0.5]),
  // the lead: cream suit, teal shirt, white hat, black shoes
  cream: mat([0.40, 0.33, 0.34], [0.84, 0.76, 0.62], [1.0, 0.95, 0.82], [0.45, 0.62, 0.95]),
  teal: mat([0.03, 0.14, 0.24], [0.10, 0.44, 0.60], [0.34, 0.80, 0.90], [0.3, 0.6, 0.95]),
  hatWhite: mat([0.42, 0.38, 0.38], [0.86, 0.82, 0.74], [1.0, 0.98, 0.9], [0.5, 0.65, 0.95]),
  // the line of dancers: charcoal, brown, navy and plum suits
  char: mat([0.02, 0.02, 0.04], [0.09, 0.09, 0.12], [0.26, 0.26, 0.34], [0.2, 0.3, 0.6]),
  brown: mat([0.08, 0.04, 0.03], [0.26, 0.15, 0.10], [0.52, 0.34, 0.22], [0.3, 0.4, 0.7]),
  navy: mat([0.01, 0.02, 0.08], [0.05, 0.09, 0.24], [0.16, 0.26, 0.5], [0.25, 0.45, 0.85]),
  plum: mat([0.06, 0.02, 0.06], [0.22, 0.09, 0.22], [0.46, 0.24, 0.42], [0.3, 0.4, 0.75]),
  shirtW: mat([0.35, 0.35, 0.44], [0.78, 0.78, 0.84], [1.0, 0.98, 0.95], [0.5, 0.65, 0.95]),
  hatBlk: mat([0.01, 0.01, 0.02], [0.06, 0.06, 0.08], [0.2, 0.2, 0.27], [0.25, 0.35, 0.65]),
  hatGry: mat([0.06, 0.06, 0.08], [0.22, 0.21, 0.24], [0.5, 0.48, 0.5], [0.3, 0.4, 0.7]),
  shoe: mat([0.015, 0.015, 0.025], [0.06, 0.055, 0.08], [0.3, 0.28, 0.38], [0.22, 0.28, 0.55])
};
const STYLES = {
  lead: { jacket: MAT.cream, trouser: MAT.cream, shirt: MAT.teal, tie: null, hat: MAT.hatWhite, band: [0.05, 0.05, 0.07], sock: MAT.teal, tilt: 0.16, hairLen: 0.6, lapel: [0.68, 0.6, 0.5] },
  a: { jacket: MAT.char, trouser: MAT.char, shirt: MAT.shirtW, tie: [0.55, 0.08, 0.1], hat: MAT.hatBlk, band: [0.22, 0.22, 0.28], sock: MAT.char, tilt: -0.1, hairLen: 0.3, lapel: [0.03, 0.03, 0.05] },
  b: { jacket: MAT.brown, trouser: MAT.brown, shirt: MAT.shirtW, tie: [0.1, 0.25, 0.4], hat: MAT.hatGry, band: [0.1, 0.06, 0.05], sock: MAT.char, tilt: 0.1, hairLen: 0.3, lapel: [0.1, 0.06, 0.04] },
  c: { jacket: MAT.navy, trouser: MAT.navy, shirt: MAT.shirtW, tie: [0.6, 0.5, 0.15], hat: MAT.hatBlk, band: [0.5, 0.4, 0.15], sock: MAT.char, tilt: -0.14, hairLen: 0.3, lapel: [0.02, 0.03, 0.09] },
  d: { jacket: MAT.plum, trouser: MAT.char, shirt: MAT.shirtW, tie: [0.12, 0.35, 0.3], hat: MAT.hatGry, band: [0.18, 0.06, 0.18], sock: MAT.char, tilt: 0.12, hairLen: 0.3, lapel: [0.08, 0.03, 0.08] }
};
G.style = STYLES.lead;

function armDepth(J, which) {
  const el = which === 'M' ? J.elM : J.elF, wr = which === 'M' ? J.wrM : J.wrF;
  const mid = vlerp(el, wr, 0.6);
  return mid.z - J.chest.z;
}

// ---------------------------------------------------------------- legs and shoes
function drawSuitLegs(J, S) {
  for (const s of ['L', 'R']) {
    const sg = s === 'L' ? -1 : 1;
    const hip = J['hip' + s], kn = J['kn' + s], an = J['an' + s], ft = J['foot' + s];
    const top = vadd(hip, V(0, 7, 0));
    const hem = vadd(vlerp(an, ft.ball, 0.4), V(0, S === STYLES.lead ? 2.2 : -0.6, 1.5));
    G.mid = ID.mic;
    const shoe = shade(MAT.shoe, vnorm(V(sg * 0.2, 0.6, 0.8)));
    if (S === STYLES.lead) {
      // a flash of teal sock between hem and loafer
      st([vadd(an, V(0, 1.6, 0.4)), vadd(an, V(0, -2.4, 0.6))], 7.6, shade(S.sock, vnorm(V(sg * 0.2, 0.3, 1))), { dry: 0.2, h: 0.35, w0: 1, tip: 1 });
    }
    st([vadd(an, V(0, -1.5, 0.5)), vadd(ft.ball, V(0, 2.6, 0.5)), vadd(ft.toe, V(0, 1.7, 0))], [8.6, 10.2, 9.4], shoe, { dry: 0.1, h: 0.45, gloss: 0.95, w0: 0.95, tip: 0.9, tE: 0.2 });
    st([vadd(ft.heel, V(-sg * 1, 1.2, 0)), vadd(ft.ball, V(0, 0.4, 0)), vadd(ft.toe, V(0, 0.6, 0.6))], [8.8, 10.4, 9.2], MAT.shoe.s, { a: 0.9, dry: 0.15, h: 0.3, w0: 0.95, tip: 0.9 });
    dab(vadd(ft.toe, V(-1.6, 3.1, -0.6)), 1.5, 2.8, [0.55, 0.6, 0.75], { dry: 0.3, gloss: 1, a: 0.7, noShadow: true });
    G.mid = ID.blk;
    st([top, hip, kn, an, hem], [19.5, 18, 14.5, 12.4, 13], shade(S.trouser, vnorm(V(sg * 0.3, 0, 1))), { dry: 0.26, h: 0.32, tip: 0.95, tE: 0.12, sq: 0.6 });
    const lit = vnorm(V(-1, 0.2, 0.5)), cool = vnorm(V(1, 0.2, 0.5));
    st([vadd(kn, V(-5, 1, 2)), vadd(an, V(-4.2, 1, 2)), vadd(hem, V(-4.6, 1, 0))], 3.4, shade(S.trouser, lit), { a: 0.85, dry: 0.5, h: 0.3 });
    st([vadd(kn, V(5, 1, 2)), vadd(an, V(4.2, 1, 2)), vadd(hem, V(4.6, 1, 0))], 2.4, shade(S.trouser, cool), { a: 0.8, dry: 0.55, h: 0.3 });
    // the front crease
    st([vadd(hip, V(-sg * 0.6, -5, 8.6)), vadd(kn, V(-sg * 0.4, 0, 7.6)), vadd(hem, V(-sg * 0.2, 1, 6.8))], 0.9, shade(S.trouser, vnorm(V(0, 0.3, 1)), -0.32), { a: 0.6, dry: 0.4, noShadow: true });
    st([vadd(hem, V(-5.8, 1.4, -1)), vadd(hem, V(0, 0.4, 1.6)), vadd(hem, V(5.8, 1.4, -1))], 1.8, shade(S.trouser, V(0, -0.3, 0.6), -0.3), { a: 0.75, dry: 0.3, noShadow: true });
  }
}

// ---------------------------------------------------------------- jacket, shirt, tie, lapels
function drawSuitTorso(J, S, front) {
  const Rc = J.Rc, Rw = J.Rw, Rp = J.Rp;
  const isLead = S === STYLES.lead;
  G.mid = ID.coat;
  // neck first, so the collar and shirt sit on top of it
  G.mid = ID.skin;
  st([xf(J.neckTop, J.Rh, 0, 2.5, 1.5), xf(J.neck, Rc, 0, 4, 3)], 9.4, shade(MAT.skin, mv(J.Rh, V(0, -0.5, 0.8))), { tip: 0.9, w0: 0.9, dry: 0.15 });
  G.mid = ID.coat;
  // the jacket body: four broad planes from the hem up to the shoulder line, then the shoulders
  for (const x of [-11.5, -3.8, 3.8, 11.5]) {
    const n = mv(Rc, vnorm(V(x / 14, 0.1, front ? 1 : -1)));
    const z = front ? 1 : -1;
    st([xf(J.pelvis, Rp, x * 1.2, -10, 8 * z), xf(J.waist, Rw, x * 1.06, 0, 9 * z), xf(J.chest, Rc, x, 4, 10.5 * z), xf(J.neck, Rc, x * 0.9, 1, 5 * z)],
      [15, 15, 15, 12], shade(S.jacket, n), { dry: 0.28, h: 0.34 });
  }
  st([xf(J.neck, Rc, -19.5, -3, 0.5), xf(J.neck, Rc, 0, 2.5, 2.5), xf(J.neck, Rc, 19.5, -3, 0.5)], 13, shade(S.jacket, mv(Rc, V(0, 0.8, 0.6))), { dry: 0.2, h: 0.4 });
  // the drape: a soft dark fold on the shadow side and a lit one on the key side
  st([xf(J.chest, Rc, -13, 2, 11.4 * (front ? 1 : -1)), xf(J.waist, Rw, -12, 0, 10.6 * (front ? 1 : -1)), xf(J.pelvis, Rp, -12, -9, 9 * (front ? 1 : -1))], 2.6, shade(S.jacket, mv(Rc, V(-0.9, 0, 0.5)), 0.14), { a: 0.75, dry: 0.5, h: 0.4, noShadow: true });
  st([xf(J.chest, Rc, 13, 2, 11.4 * (front ? 1 : -1)), xf(J.waist, Rw, 12, 0, 10.6 * (front ? 1 : -1)), xf(J.pelvis, Rp, 12, -9, 9 * (front ? 1 : -1))], 2.2, shade(S.jacket, mv(Rc, V(0.9, 0, 0.4)), -0.2), { a: 0.7, dry: 0.5, h: 0.4, noShadow: true });
  if (!front) {
    // back vent
    st([xf(J.waist, Rw, 0, -2, -10), xf(J.pelvis, Rp, 0, -10, -9)], 1.2, shade(S.jacket, V(0, 0, -1), -0.4), { a: 0.7, dry: 0.4, noShadow: true });
    return;
  }
  // shirt and tie in the V of the jacket
  G.mid = ID.white;
  st([xf(J.neck, Rc, 0, 4.4, 6.6), xf(J.chest, Rc, 0, -3, 11.4), xf(J.chest, Rc, 0, -14, 12)], [10, 8.5, 3], shade(S.shirt, mv(Rc, V(0, 0.2, 1))), { dry: 0.1, h: 0.3, w0: 0.95, tip: 0.6 });
  if (S.tie) {
    G.mid = ID.ink;
    st([xf(J.neck, Rc, 0, 2.6, 7.6), xf(J.chest, Rc, 0, -10, 12.4), xf(J.waist, Rw, 0, -3, 10.8)], [2.8, 4.2, 3.6], S.tie, { dry: 0.2, h: 0.5, gloss: 0.5, tip: 0.6 });
  } else {
    // open collar: two wings of teal shirt over the jacket
    for (const sg of [-1, 1]) st([xf(J.neck, Rc, sg * 3.2, 4.4, 7), xf(J.neck, Rc, sg * 7.4, 3.6, 5.6), xf(J.chest, Rc, sg * 6.4, -1, 11.3)], [3.2, 4.2, 1.4], shade(S.shirt, mv(Rc, V(sg * 0.5, 0.4, 1)), sg < 0 ? 0.12 : -0.08), { dry: 0.15, h: 0.5, tip: 0.5 });
  }
  // lapels
  G.mid = ID.coat;
  for (const sg of [-1, 1]) {
    const top = xf(J.neck, Rc, sg * 5, 3.5, 6.4), notch = xf(J.chest, Rc, sg * 13, 3, 11.4), brk = xf(J.chest, Rc, sg * 6, -17, 12.8);
    const n = mv(Rc, vnorm(V(sg * 0.5, 0.35, 1)));
    st([top, vlerp(top, notch, 0.55), notch, vlerp(notch, brk, 0.5), brk], [3, 5, 5.2, 4.2, 1.4], shade(S.jacket, n, 0.06), { dry: 0.22, h: 0.55, tip: 0.5 });
    st([top, vadd(vlerp(top, brk, 0.5), mv(Rc, V(sg * 1.4, 0, 0.6))), brk], 1.3, S.lapel, { a: 0.7, dry: 0.4, noShadow: true });
  }
  // a pocket flap and a folded square at the breast
  st([xf(J.waist, Rw, 8.5, 2, 10.6), xf(J.waist, Rw, 15, 1.2, 9.8)], 1.6, shade(S.jacket, mv(Rc, V(0.4, -0.2, 1)), -0.3), { a: 0.75, dry: 0.4, noShadow: true });
  G.mid = ID.white;
  dab(xf(J.chest, Rc, -11, 3, 12), 3.4, 1.5, isLead ? [0.98, 0.94, 0.88] : [0.85, 0.85, 0.9], { ang: 0.15, dry: 0.2, noShadow: true });
}

// ---------------------------------------------------------------- arms
function drawSuitArm(J, S, which) {
  const M = which === 'M';
  const sh = M ? J.shM : J.shF, el = M ? J.elM : J.elF, wr = M ? J.wrM : J.wrF;
  const sg = M ? -1 : 1;
  G.mid = ID.coat;
  const fo = vnorm(vsub(wr, el)), up = vnorm(vsub(el, sh));
  const nl = vnorm(vadd(V(-0.7, 0.5, 0.6), vmul(V(0, 0, 1), 0.2)));
  st([sh, el, wr], [15, 12.6, 10.6], [shade(S.jacket, vnorm(V(sg * 0.3, 0.4, 1))), shade(S.jacket, vnorm(V(sg * 0.2, 0, 1)), -0.06), shade(S.jacket, vnorm(V(sg * 0.2, -0.2, 1)), -0.1)], { dry: 0.22, h: 0.4, tip: 0.9 });
  const pE = perpToward(vnorm(vadd(up, fo)), V(-1, 0.4, 0.6));
  st([vmad(sh, pE, 4.2), vmad(el, pE, 4), vmad(wr, pE, 3.6)], [4.8, 4.4, 3.8], shade(S.jacket, nl, 0.06), { a: 0.9, dry: 0.4, h: 0.5, noShadow: true });
  const pS = vmul(pE, -1);
  st([vmad(sh, pS, 4.6), vmad(el, pS, 4.4), vmad(wr, pS, 3.8)], [3.4, 3.4, 3], shade(S.jacket, vnorm(V(sg, -0.1, 0.4)), -0.2), { a: 0.85, dry: 0.45, h: 0.4, noShadow: true });
  st([vmad(el, up, -3.4), vmad(vmad(el, pE, -1.2), V(0, 0, 1), 3), vmad(el, fo, 3.4)], [0.6, 1.4, 0.6], shade(S.jacket, V(0, -0.4, 0.5), -0.34), { a: 0.7, dry: 0.4, noShadow: true });
  // a sliver of cool rim light on the window side
  const rimSide = perpToward(vnorm(vadd(up, fo)), V(sg, 0, -0.3));
  st([vmad(sh, rimSide, 6.4), vmad(el, rimSide, 6), vmad(wr, rimSide, 5.2)], 1.0, [G.rimC || [0.6, 0.75, 1.0]].map(c => c)[0], { a: 0.5, dry: 0.5, noShadow: true, exact: true });
  // white cuff
  G.mid = ID.white;
  const cf = vmad(wr, fo, -3.4);
  const pF = perpToward(fo, V(0, 0, 1));
  st([vmad(cf, pF, 5.2), vmad(vmad(cf, pF, 0), V(0, 0, 1), 2.2), vmad(cf, pF, -5.2)], 2.6, shade(S.shirt, V(0, 0.2, 1)), { a: 0.95, dry: 0.2, noShadow: true });
  drawHand(J, which);
}

// ---------------------------------------------------------------- hair and the fedora
function drawHair(J) {
  const S = G.style;
  G.mid = ID.hair;
  const H = J.head, R = J.Rh;
  const hp = (x, y, z) => xf(H, R, x, y, z);
  const hn = (x, y, z) => mv(R, vnorm(V(x, y, z)));
  const hair = (x, y, z, j) => shade(MAT.hair, hn(x, y, z), j);
  // a short cut under the hat, longer at the temples and nape
  st([hp(-7.4, 5.2, 3.6), hp(-7.6, 9, 5.4), hp(0, 11.4, 7), hp(7.6, 9, 5.4), hp(7.4, 5.2, 3.6)], 8, hair(0, 0.5, 1, -0.1), { dry: 0.2, h: 0.4, w0: 0.9, tip: 0.9 });
  for (const sg of [-1, 1]) {
    st([hp(sg * 7, 7.4, 3.4), hp(sg * 7.6, 3.6, 0.6), hp(sg * 7.4, -0.5, -4 * S.hairLen)], [3.6, 3.4, 2.2], hair(sg, 0.3, 0.3, -0.05), { dry: 0.3, h: 0.5 });
    st([hp(sg * 6.8, 4.6, 6), hp(sg * 6.6, 0.4, 6.4)], 1.5, hair(sg, 0, 1, -0.1), { a: 0.8, dry: 0.4, noShadow: true });
  }
  drawHat(J, S);
}

function drawHat(J, S) {
  const H = J.head, R = J.Rh, ps = J.pose;
  const lift = ps.hatLift || 0;
  let off = V(0, 0, 0);
  if (lift > 0.01) {
    const base = xf(H, R, 0, 8, 0);
    const fo = vnorm(vsub(J.wrF, J.elF));
    const tgt = vadd(vmad(J.wrF, fo, 6), V(0, 5, 3));
    off = vmul(vsub(tgt, base), lift);
  }
  const tilt = S.tilt + (ps.hroll ? 0 : 0);
  const hp = (x, y, z) => vadd(xf(H, R, x, y + tilt * x * 0.5, z), off);
  const hn = (x, y, z) => mv(R, vnorm(V(x, y, z)));
  const hs = (x, y, z, j) => shade(S.hat, hn(x, y, z), j);
  G.mid = ID.coat;
  // crown: a dark block-in, then vertical planes with the pinch at the top
  st([hp(-8, 8.2, 3.4), hp(-7, 14.6, 4.4), hp(-4.6, 19.6, 4.2), hp(0, 19.2, 3.8), hp(4.6, 19.6, 4.2), hp(7, 14.6, 4.4), hp(8, 8.2, 3.4)], 9, hs(0, 0.2, 0.6, -0.3), { dry: 0.18, h: 0.4, w0: 0.9, tip: 0.9 });
  for (const x0 of [-6, -3, 0, 3, 6]) {
    const q = x0 * x0;
    st([hp(x0, 8.8, 8.6 - 0.06 * q), hp(x0 * 0.94, 14.4, 9 - 0.05 * q), hp(x0 * 0.78, 19.4, 6.8 - 0.03 * q)], [4.4, 4.8, 3.8],
      [hs(x0 * 0.1, 0.1, 1, -0.08), hs(x0 * 0.08, 0.5, 0.9, 0.02), hs(x0 * 0.06, 1, 0.4, 0.1)], { dry: 0.28, h: 0.55, gloss: 0.45, tip: 0.6 });
  }
  st([hp(0, 19.6, 6), hp(0, 16, 9.4)], 2.6, hs(0, -0.2, 0.7, -0.35), { a: 0.7, dry: 0.5, h: 0.4, noShadow: true });
  // the band
  G.mid = ID.blk;
  st([hp(-8.2, 9.8, 4.4), hp(-5, 10.2, 8.8), hp(0, 10.4, 10.2), hp(5, 10.2, 8.8), hp(8.2, 9.8, 4.4)], 2.9, S.band, { dry: 0.15, h: 0.5, gloss: 0.6, noShadow: true });
  // the brim: broad, snapped down at the front, with its shadow across the brow
  G.mid = ID.coat;
  const bw = [3, 5, 6.4, 7, 6.4, 5, 3];
  st([hp(-15.5, 8.8, 0), hp(-13, 7.6, 8), hp(-7, 6.4, 15), hp(0, 5.6, 17.8), hp(7, 6.4, 15), hp(13, 7.6, 8), hp(15.5, 8.8, 0)], bw,
    [hs(-1, 0.4, 0.5, -0.05), hs(-0.8, 0.6, 0.8), hs(-0.4, 0.7, 1), hs(0, 0.8, 1, 0.05), hs(0.4, 0.7, 1), hs(0.8, 0.6, 0.8), hs(1, 0.4, 0.5, -0.1)], { dry: 0.2, h: 0.45, gloss: 0.4, w0: 0.9, tip: 0.85 });
  st([hp(-14, 8.2, -3), hp(-8, 7.4, -9), hp(0, 7.4, -11), hp(8, 7.4, -9), hp(14, 8.2, -3)], [4, 5, 5.4, 5, 4], hs(0, 0.6, -1, -0.25), { dry: 0.25, h: 0.35, w0: 0.9, tip: 0.9 });
  st([hp(-9.5, 5.6, 11), hp(0, 4.6, 14), hp(9.5, 5.6, 11)], 4.4, [0.03, 0.02, 0.03], { a: 0.5, dry: 0.5, noShadow: true });
  st([hp(-12, 8.2, 8.6), hp(-5, 7.2, 15.6), hp(2.4, 6.6, 17.4)], 1.1, hs(-0.6, 1, 0.6, 0.25), { a: 0.85, dry: 0.5, gloss: 0.8, noShadow: true });
}

// ---------------------------------------------------------------- head seen from behind
function drawSuitHeadBack(J, S) {
  const H = J.head, R = J.Rh;
  const hp = (x, y, z) => xf(H, R, x, y, z);
  const hn = (x, y, z) => mv(R, vnorm(V(x, y, z)));
  G.mid = ID.skin;
  st([hp(0, -13, -2.5), hp(0, -6, -3.5)], 9.6, shade(MAT.skin, hn(0, -0.2, -1)), { dry: 0.15, w0: 0.9, tip: 0.9 });
  for (const sg of [-1, 1]) st([hp(sg * 6.8, 5, 0.5), hp(sg * 7.2, 0, 0.2), hp(sg * 6.6, -5, 0.8)], [3.2, 3.6, 3], shade(MAT.skin, hn(sg, 0, -0.3), -0.1), { dry: 0.15, h: 0.35 });
  G.mid = ID.hair;
  st([hp(0, -7.5, -4.5), hp(0, 0, -7.2), hp(0, 8, -6.2), hp(0, 11, -1)], [11.5, 14.5, 14, 11], shade(MAT.hair, hn(0, 0.1, -1), -0.1), { dry: 0.15, h: 0.45, w0: 0.9, tip: 0.8 });
  drawHat(J, S);
}

// ---------------------------------------------------------------- one person
function drawSuit(J, S) {
  G.style = S;
  const facing = mv(J.Rc, V(0, 0, 1)).z;
  const front = facing > -0.15;
  drawSuitLegs(J, S);
  const mz = armDepth(J, 'M'), fz = armDepth(J, 'F');
  if (mz < -3) drawSuitArm(J, S, 'M');
  if (fz < -3) drawSuitArm(J, S, 'F');
  drawSuitTorso(J, S, front);
  if (mv(J.Rh, V(0, 0, 1)).z < -0.25) drawSuitHeadBack(J, S); else drawHead(J);
  if (mz >= -3) drawSuitArm(J, S, 'M');
  if (fz >= -3) drawSuitArm(J, S, 'F');
}

// a simple dark silhouette for floor shadows (mask pass)
function drawSilSuit(J) {
  const flat = { sq: 0.6 };
  for (const s of ['L', 'R']) {
    const hip = J['hip' + s], an = J['an' + s], ft = J['foot' + s];
    st([vadd(hip, V(0, 7, 0)), hip, J['kn' + s], an, vadd(vlerp(an, ft.ball, 0.4), V(0, -0.6, 1.5))], [19, 17.5, 14, 12.5, 12.5], null, flat);
    st([vadd(an, V(0, -1.5, 0.5)), vadd(ft.ball, V(0, 2, 0)), ft.toe], [9, 10.5, 9], null);
  }
  st([J.pelvis, J.waist, J.chest], 34, null, flat);
  st([xf(J.shM, J.Rc, -3, 1, 0), J.neck, xf(J.shF, J.Rc, 3, 1, 0)], 15, null);
  st([J.chest, J.neck, J.neckTop, J.head], [22, 12, 11, 13], null);
  for (const M of [true, false]) {
    const sh = M ? J.shM : J.shF, el = M ? J.elM : J.elF, wr = M ? J.wrM : J.wrF;
    st([sh, el, wr], [15, 13, 11], null);
    const fo = vnorm(vsub(wr, el));
    dab(vmad(wr, fo, 5), 9, 9, null, { ang: screenAng(wr, vmad(wr, fo, 8)) });
  }
  const H = J.head, R = J.Rh;
  st([xf(H, R, -15, 8, 0), xf(H, R, 0, 6, 15), xf(H, R, 15, 8, 0)], 6, null);
  st([xf(H, R, 0, 8, 3), xf(H, R, 0, 19, 3)], 16, null);
}
