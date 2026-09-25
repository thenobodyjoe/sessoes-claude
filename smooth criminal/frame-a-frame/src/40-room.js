// ============================================================
// The room, repainted every frame from the light map: three passes of brush strokes, broad to fine,
// laid along the contours of the light (strokes follow the edges, not cross them). The strokes sit on a
// lattice that slides with the camera, so a pan drags the paint with it; after a cut the new room is
// painted in with a quick sweep of the brush.
// ============================================================
const ROOM_PASSES = [
  // columns, rows, width (fraction of canvas width), length factor, detail-only
  { nx: 9, ny: 6, w: 0.19, len: 1.5, fine: false, dry: 0.3 },
  { nx: 24, ny: 14, w: 0.062, len: 2.0, fine: false, dry: 0.4 },
  { nx: 52, ny: 30, w: 0.024, len: 2.4, fine: true, dry: 0.5 }
];

function paintRoom(ff, t) {
  const F = roomAt(ff);
  const shot = SHOT_OF[clamp(Math.floor(ff), 0, NF - 1)];
  const [cx, cy] = camAt(ff);
  const tShot = (ff - DATA.shots[shot][0]) / FPS;
  const sweepDir = hash(shot * 7.1) < 0.5 ? 1 : -1;
  G.mode = 'paint'; G.layer = 'bg'; G.mid = 0;
  const rnd0 = shot * 131.7;
  let si = 0;
  ROOM_PASSES.forEach((P, pi) => {
    const W = P.w * CW;
    // the lattice lives in room coordinates; cover the canvas plus the drift
    const x0 = fxOf(0) - cx - 0.08, x1 = fxOf(CW) - cx + 0.08, y0 = fyOf(0) - cy - 0.08, y1 = fyOf(CH) - cy + 0.08;
    const dx = 1 / P.nx, dy = 1 / P.ny;
    for (let gy = Math.floor(y0 / dy); gy <= Math.ceil(y1 / dy); gy++) {
      for (let gx = Math.floor(x0 / dx); gx <= Math.ceil(x1 / dx); gx++) {
        const k = rnd0 + pi * 1000.3 + gx * 17.13 + gy * 101.7;
        const rx = (gx + 0.15 + 0.7 * hash(k)) * dx, ry = (gy + 0.15 + 0.7 * hash(k + 3.3)) * dy;
        const x = rx + cx, y = ry + cy;             // where this dab of room is on screen now
        const c = roomSample(F, x, y);
        const g = roomGrad(F, x, y);
        const gm = Math.hypot(g[0], g[1]);
        if (P.fine && gm < 0.35 && hash(k + 9.1) > 0.22) continue;
        // along the contour; where the light is flat, a loose diagonal hatch
        let ang = gm > 0.05 ? Math.atan2(g[1], g[0]) + Math.PI / 2 : 0.5 + (hash(k + 5.5) - 0.5) * 0.6;
        ang += (hash(k + 7.7) - 0.5) * 0.35;
        const X = sx(x), Y = sy(y);
        const w = W * (0.75 + 0.5 * hash(k + 1.1));
        const L = w * P.len * (0.7 + 0.6 * hash(k + 2.2)) * 0.5;
        const ca = Math.cos(ang) * L, sa = Math.sin(ang) * L;
        const bend = (hash(k + 4.4) - 0.5) * w * 0.4;
        const lift = 1 + (hash(k + 6.6) - 0.5) * 0.14;
        const col = [c[0] * lift, c[1] * lift, c[2] * lift];
        const col2 = mixc(col, c[3] > 0.45 ? [1, 0.92, 0.7] : [0.1, 0.16, 0.3], 0.18);
        // the sweep that paints a new shot in
        const sweep = sweepDir > 0 ? X / CW : 1 - X / CW;
        const rev = pi === 0 ? [NO_IN, NO_OUT] : [sweep * 0.55 + hash(k + 8.8) * 0.2, NO_OUT];
        strokeScreen([
          { x: X - ca, y: Y - sa, w, c: col },
          { x: X - sa * 0.0 + bend * -Math.sin(ang), y: Y + bend * Math.cos(ang), w: w * 1.05, c: col },
          { x: X + ca, y: Y + sa, w: w * 0.85, c: col }
        ], { c2: col2, dry: P.dry, h: 0.3 + pi * 0.12, recv: 1, gloss: 0.2, rev, seed: k % 97 });
        si++;
      }
    }
  });
  // smoke curling through the light
  for (let i = 0; i < 14; i++) {
    const k = i * 3.77 + 11;
    const y = 0.15 + 0.7 * hash(k), sp = 0.02 + 0.03 * hash(k + 1);
    const x = ((hash(k + 2) + t * sp) % 1.4) - 0.2;
    const c = roomSample(F, clamp(x, 0, 1), y);
    const w = CW * (0.05 + 0.05 * hash(k + 3));
    const L = CW * (0.18 + 0.2 * hash(k + 4));
    const wob = Math.sin(t * 0.7 + k) * w * 0.8;
    const col = mixc([c[0], c[1], c[2]], [0.75, 0.8, 0.95], 0.45);
    strokeScreen([
      { x: sx(x) - L / 2, y: sy(y), w: w * 0.5, c: col },
      { x: sx(x), y: sy(y) + wob, w, c: col },
      { x: sx(x) + L / 2, y: sy(y) - wob * 0.5, w: w * 0.4, c: col }
    ], { kind: 1, a: 0.05 + 0.05 * hash(k + 5), recv: 1, dry: 0.3, rev: [NO_IN, NO_OUT] });
  }
  return tShot;
}
