// ============================================================
// The club: a smoky nineteen-thirties speakeasy, painted once in world space and projected on the GPU.
// A brick back wall with tall blue windows, a stair and railing on the left, a bar and bottle shelves on the
// right, orange pendant lamps on cords, bentwood chairs and round tables with patrons in fedoras, and a dark
// polished floor that will mirror the dancers.
// Units are cm, y up, the floor at y = 0, the back wall at z = WALL_Z.
// ============================================================
function wst(pts, w, col, o, floor, normal) {
  strokeWorld(pts, w, col, o || {}, floor ? V(0, 1, 0) : (normal || V(0, 0, 1)), [NO_IN, NO_OUT]);
}
function wdab(p, w, len, col, o) {
  wst([V(p.x - len / 2, p.y, p.z), V(p.x + len / 2, p.y, p.z)], w, col, o);
}
const SET = {};
const BRICK = [[0.42, 0.20, 0.15], [0.36, 0.17, 0.14], [0.48, 0.25, 0.18], [0.30, 0.15, 0.13], [0.45, 0.30, 0.22], [0.26, 0.14, 0.14], [0.52, 0.24, 0.16]];
const WOOD = [[0.20, 0.11, 0.08], [0.16, 0.09, 0.07], [0.25, 0.14, 0.09], [0.13, 0.08, 0.07]];
const LAMP_X = [-190, 70, 300];
const LAMP_Y = 322;
const WIN = [
  { x: -335, y0: 118, w: 118, h: 178, arch: true },
  { x: -70, y0: 118, w: 108, h: 178 },
  { x: 175, y0: 118, w: 108, h: 178 }
];

function buildWall(rnd) {
  const W = WALL_Z;
  // dark underpainting so the gaps read as mortar and soot
  for (let y = -10; y < 500; y += 38) {
    for (let x = -820; x < 820; x += 210) wst([V(x, y + rnd() * 8, W - 0.2), V(x + 110, y + rnd() * 8, W - 0.2), V(x + 230, y + rnd() * 8, W - 0.2)], 52, [0.11 + rnd() * 0.03, 0.06, 0.06], { recv: 1, dry: 0.15, h: 0.12 });
  }
  // broad wall strokes, then courses of single bricks
  for (let y = -6; y < 490; y += 21) {
    let x = -800 + rnd() * 40;
    while (x < 800) {
      const len = 70 + rnd() * 110;
      const c = BRICK[(rnd() * BRICK.length) | 0], k = 0.5 + rnd() * 0.22;
      wst([V(x, y + rnd() * 4, W), V(x + len / 2, y + (rnd() - 0.5) * 5, W), V(x + len, y + rnd() * 4, W)], 25, scalec(c, k), { recv: 1, dry: 0.5, h: 0.28, sq: 0.55 });
      x += len * (0.72 + rnd() * 0.2);
    }
  }
  for (let row = 0; row < 56; row++) {
    const y = 3 + row * 8.6;
    for (let x = -800 + (row % 2) * 11.5; x < 800; x += 23) {
      const r1 = rnd(), r2 = rnd(), r3 = rnd(), r4 = rnd();
      if (r1 > 0.5) continue;
      const c = BRICK[(r2 * BRICK.length) | 0], k = 0.62 + r3 * 0.4;
      const hl = 7 + r4 * 3.5, dx = (r3 - 0.5) * 3;
      wst([V(x + dx - hl, y + (r4 - 0.5) * 1.2, W + 0.2), V(x + dx + hl, y + (r3 - 0.5) * 1.2, W + 0.2)], 5.4 + r2 * 1.8, scalec(c, k), { recv: 1, dry: 0.3, h: 0.55, w0: 0.95, tip: 0.9, sq: 0.75, a: 0.75 + 0.25 * r1 / 0.5 });
    }
  }
  // soot and damp streaks
  for (let i = 0; i < 22; i++) {
    const x = -700 + rnd() * 1400, y0 = 420 + rnd() * 60, y1 = y0 - 120 - rnd() * 200;
    wst([V(x, y0, W + 0.3), V(x + (rnd() - 0.5) * 10, (y0 + y1) / 2, W + 0.3), V(x, y1, W + 0.3)], 10 + rnd() * 14, [0.04, 0.03, 0.05], { recv: 1, a: 0.3, dry: 0.7, w0: 0.9, tip: 0.2 });
  }
  // a wainscot of dark wood along the foot of the wall
  for (let x = -820; x < 820; x += 22) wst([V(x, 0, W + 0.5), V(x, 62, W + 0.5)], 22, scalec(WOOD[(rnd() * 4) | 0], 0.9 + rnd() * 0.3), { recv: 1, dry: 0.2, h: 0.3, sq: 1, w0: 1, tip: 1 });
  wst([V(-820, 64, W + 1), V(820, 64, W + 1)], 5, [0.32, 0.18, 0.1], { recv: 1, gloss: 0.6, dry: 0.2, h: 0.4 });
  // ceiling beam and two iron posts framing the room
  wst([V(-820, 468, W + 4), V(820, 468, W + 4)], 34, [0.06, 0.04, 0.05], { recv: 1, dry: 0.2, h: 0.3 });
  for (const px of [-500, 470]) wst([V(px, 0, W + 30), V(px, 480, W + 30)], 20, [0.05, 0.05, 0.08], { recv: 1, dry: 0.2, h: 0.4, gloss: 0.5 });
}

function buildWindows(rnd) {
  const W = WALL_Z;
  for (const win of WIN) {
    const { x, y0, w, h } = win;
    const spring = y0 + h - w / 2;
    // cool glow spilling out around each window (unlit, soft)
    wdab(V(x, y0 + h * 0.5, W + 0.6), h * 1.5, w * 3.4, [0.12, 0.34, 0.56], { kind: 1, a: 0.32 });
    // recessed frame
    const half = yy => (win.arch && yy > spring ? Math.sqrt(Math.max(0, (w / 2) * (w / 2) - (yy - spring) * (yy - spring))) : w / 2);
    for (let yy = y0 - 6; yy <= y0 + h + 4; yy += 8) {
      const hw = half(yy) + 7;
      wst([V(x - hw, yy, W + 0.8), V(x + hw, yy, W + 0.8)], 9, [0.05, 0.05, 0.08], { recv: 1, dry: 0.15, h: 0.35, sq: 1, w0: 1, tip: 1 });
    }
    // the panes: rows of luminous blue, brighter toward the top
    for (let yy = y0; yy <= y0 + h; yy += 6) {
      const hw = half(yy);
      const k = (yy - y0) / h;
      const c = mixc([0.10, 0.50, 0.82], [0.44, 0.86, 1.0], k * 0.7 + rnd() * 0.15);
      wst([V(x - hw, yy, W + 1), V(x + hw, yy + (rnd() - 0.5), W + 1)], 7, c, { recv: 0, dry: 0.12, h: 0.14, sq: 1, w0: 1, tip: 1 });
    }
    // mullions
    const cols = 3, rows = 5;
    for (let i = 0; i <= cols; i++) {
      const xx = x - w / 2 + i * w / cols;
      const top = win.arch ? y0 + h - Math.max(0, (w / 2) - Math.sqrt(Math.max(0, (w / 2) * (w / 2) - (xx - x) * (xx - x)))) : y0 + h;
      wst([V(xx, y0, W + 1.4), V(xx, top, W + 1.4)], 3.6, [0.04, 0.05, 0.08], { recv: 0.6, dry: 0.15, h: 0.4, w0: 1, tip: 1 });
    }
    for (let j = 0; j <= rows; j++) {
      const yy = y0 + j * h / rows;
      const hw = half(yy);
      wst([V(x - hw, yy, W + 1.4), V(x + hw, yy, W + 1.4)], 3.2, [0.04, 0.05, 0.08], { recv: 0.6, dry: 0.15, h: 0.4, w0: 1, tip: 1 });
    }
    if (win.arch) {
      for (let a = 0; a <= Math.PI + 1e-6; a += Math.PI / 12) {
        wst([V(x, spring, W + 1.4), V(x + Math.cos(a) * w / 2, spring + Math.sin(a) * w / 2, W + 1.4)], 2.6, [0.04, 0.05, 0.08], { recv: 0.6, dry: 0.2, a: 0.9 });
      }
    }
    // sill
    wst([V(x - w / 2 - 8, y0 - 6, W + 3), V(x + w / 2 + 8, y0 - 6, W + 3)], 7, [0.14, 0.08, 0.06], { recv: 1, dry: 0.2, h: 0.5, gloss: 0.4 });
  }
}

function buildStair(rnd) {
  const W = WALL_Z, Z = W + 28;
  const x0 = -520, n = 11, sw = 24, sh = 15;
  // stringer and risers in shadow, treads catching a little light
  wst([V(x0, 0, Z - 1), V(x0 + n * sw, n * sh, Z - 1)], 30, [0.06, 0.035, 0.03], { recv: 1, dry: 0.2, h: 0.3 });
  for (let k = 0; k < n; k++) {
    const x = x0 + k * sw, y = (k + 1) * sh;
    wst([V(x, y - sh * 0.5, Z), V(x + sw, y - sh * 0.5, Z)], sh, scalec(WOOD[k % 4], 0.85), { recv: 1, dry: 0.2, h: 0.35, sq: 1, w0: 1, tip: 1 });
    wst([V(x - 2, y + 0.5, Z + 0.4), V(x + sw + 2, y + 0.5, Z + 0.4)], 2.4, [0.5, 0.32, 0.2], { recv: 1, a: 0.7, dry: 0.4, gloss: 0.8 });
  }
  // landing and a door at the top
  wst([V(x0 + n * sw, n * sh + 4, Z), V(x0 + n * sw + 90, n * sh + 4, Z)], 8, [0.2, 0.11, 0.08], { recv: 1, dry: 0.2, h: 0.4, sq: 1, w0: 1, tip: 1 });
  wst([V(x0 + n * sw + 56, n * sh + 8, Z - 4), V(x0 + n * sw + 56, n * sh + 130, Z - 4)], 44, [0.10, 0.06, 0.05], { recv: 1, dry: 0.2, h: 0.4, sq: 1, w0: 1, tip: 1 });
  // the railing: a handrail, iron balusters, and newel posts
  wst([V(x0 - 6, 86, Z + 8), V(x0 + n * sw + 4, n * sh + 86, Z + 8)], 3.2, [0.04, 0.04, 0.06], { recv: 1, gloss: 0.7, dry: 0.2 });
  wst([V(x0 - 6, 80, Z + 8), V(x0 + n * sw + 4, n * sh + 80, Z + 8)], 0.9, [0.55, 0.62, 0.8], { recv: 1, a: 0.5, dry: 0.4, gloss: 1 });
  for (let k = 0; k <= n; k++) {
    const x = x0 + k * sw;
    wst([V(x, k * sh, Z + 8), V(x, k * sh + 84, Z + 8)], 1.6, [0.04, 0.04, 0.06], { recv: 1, dry: 0.2, a: 0.95 });
  }
}

function buildBar(rnd) {
  const W = WALL_Z;
  // shelves and bottles on the wall, a mirror of lamplight behind them
  wst([V(215, 180, W + 3), V(520, 180, W + 3)], 5, [0.25, 0.14, 0.09], { recv: 1, gloss: 0.6, dry: 0.2 });
  wst([V(215, 240, W + 3), V(520, 240, W + 3)], 5, [0.25, 0.14, 0.09], { recv: 1, gloss: 0.6, dry: 0.2 });
  const glass = [[0.90, 0.55, 0.12], [0.20, 0.55, 0.30], [0.75, 0.25, 0.10], [0.55, 0.60, 0.70], [0.85, 0.7, 0.2], [0.35, 0.15, 0.12]];
  for (const sy of [182, 242]) {
    for (let x = 226; x < 512; x += 12 + rnd() * 6) {
      const h = 22 + rnd() * 20, c = glass[(rnd() * glass.length) | 0];
      wst([V(x, sy + 2, W + 4), V(x, sy + 2 + h, W + 4)], 6.4 + rnd() * 2, c, { recv: 0.7, dry: 0.1, h: 0.5, gloss: 0.95, w0: 1, tip: 0.4, tE: 0.3 });
      wst([V(x - 1.6, sy + 5, W + 4.4), V(x - 1.6, sy + h - 2, W + 4.4)], 1.1, [1, 0.95, 0.8], { recv: 0.5, a: 0.75, dry: 0.4 });
    }
  }
  // counter: dark front panels, a polished top, a brass rail
  for (let x = 205; x < 545; x += 22) wst([V(x, 0, W + 34), V(x, 92, W + 34)], 22, scalec(WOOD[(rnd() * 4) | 0], 0.85), { recv: 1, dry: 0.2, h: 0.35, sq: 1, w0: 1, tip: 1 });
  wst([V(198, 98, W + 38), V(552, 98, W + 38)], 11, [0.36, 0.20, 0.11], { recv: 1, gloss: 0.9, dry: 0.15, h: 0.5, sq: 0.6 });
  wst([V(200, 103, W + 38.6), V(550, 103, W + 38.6)], 1.6, [0.85, 0.6, 0.35], { recv: 1, a: 0.6, gloss: 1, dry: 0.4 });
  wst([V(205, 22, W + 46), V(545, 22, W + 46)], 2.4, [0.75, 0.55, 0.25], { recv: 1, gloss: 1, dry: 0.3, a: 0.9 });
  // the barman, back to us, polishing a glass
  const bx = 360, bz = W + 22;
  wst([V(bx, 58, bz), V(bx + 1, 132, bz)], 34, [0.05, 0.04, 0.06], { recv: 1, dry: 0.15, h: 0.3 });
  wst([V(bx - 12, 128, bz + 0.3), V(bx + 12, 128, bz + 0.3)], 8, [0.90, 0.88, 0.85], { recv: 1, dry: 0.2 });
  wdab(V(bx, 148, bz + 0.4), 15, 15, [0.35, 0.20, 0.15], { recv: 1, dry: 0.15, h: 0.5 });
  wst([V(bx - 11, 154, bz + 0.6), V(bx + 11, 154, bz + 0.6)], 3, [0.05, 0.04, 0.05], { recv: 1 });
  wst([V(bx - 6, 156, bz + 0.6), V(bx + 6, 156, bz + 0.6)], 12, [0.05, 0.04, 0.05], { recv: 1, sq: 1, w0: 1, tip: 1 });
}

// pendant lamps: a cord, a black cone shade, a hot bulb, a big soft glow and a faint cone of light
function buildLamps(rnd) {
  const W = WALL_Z;
  for (const x of LAMP_X) {
    const z = W + 60;
    wst([V(x, 480, z), V(x, LAMP_Y + 28, z)], 1.4, [0.03, 0.03, 0.04], { recv: 0.5 });
    wst([V(x - 22, LAMP_Y + 12, z + 0.2), V(x + 22, LAMP_Y + 12, z + 0.2)], 10, [0.03, 0.03, 0.04], { recv: 0.5, dry: 0.15, gloss: 0.6, sq: 0.8 });
    wst([V(x - 9, LAMP_Y + 28, z + 0.2), V(x + 9, LAMP_Y + 28, z + 0.2)], 8, [0.03, 0.03, 0.04], { recv: 0.5, dry: 0.15 });
    wdab(V(x, LAMP_Y + 3, z + 0.3), 7, 16, [1.0, 0.82, 0.5], { recv: 0, dry: 0.1, h: 0.5 });
    wdab(V(x, LAMP_Y - 6, z + 0.1), 150, 190, [1.0, 0.55, 0.16], { kind: 1, a: 0.36 });
    wdab(V(x, LAMP_Y - 4, z + 0.15), 54, 66, [1.0, 0.72, 0.32], { kind: 1, a: 0.5 });
    // the cone
    for (let i = 0; i < 5; i++) {
      const s = (i - 2) * 26;
      wst([V(x + s * 0.2, LAMP_Y, z), V(x + s, 0, z)], 12 + i % 2 * 5, [1.0, 0.6, 0.22], { kind: 1, a: 0.035, recv: 0 });
    }
  }
}

function buildFloor(rnd) {
  const W = WALL_Z;
  // boards running toward us, polished: the reflection of the dancers lives here
  for (let x = -900; x < 900; x += 15) {
    const c = [0.14 + rnd() * 0.05, 0.085 + rnd() * 0.03, 0.075 + rnd() * 0.03];
    wst([V(x, 0, W), V(x + (rnd() - 0.5) * 3, 0, 60), V(x + (rnd() - 0.5) * 3, 0, 320)], 14.5, c, { recv: 1, gloss: 0.9, dry: 0.16, h: 0.25, sq: 1, w0: 1, tip: 1 }, true);
    wst([V(x + 3, 0.03, W), V(x + 3, 0.03, 320)], 2.4, scalec(c, 1.5), { recv: 1, a: 0.3, dry: 0.6, gloss: 1 }, true);
    wst([V(x + 7.6, 0.05, W), V(x + 7.6, 0.05, 320)], 1.0, [0.02, 0.012, 0.015], { recv: 0.8, a: 0.9 }, true);
  }
  for (let z = W + 50; z < 320; z += 46 + rnd() * 30) {
    for (let x = -880; x < 880; x += 90 + rnd() * 90) wst([V(x, 0.06, z), V(x + 8, 0.06, z)], 0.9, [0.02, 0.012, 0.015], { recv: 0.8, a: 0.8 }, true);
  }
  // a scuffed dance floor: lighter, waxed, a loose oval where everyone dances
  for (let z = -120; z < 120; z += 8) {
    const hw = 260 * Math.sqrt(Math.max(0, 1 - (z - 0) * (z - 0) / (150 * 150)));
    wst([V(-hw, 0.08, z), V(0, 0.08, z + (rnd() - 0.5) * 3), V(hw, 0.08, z)], 8, [0.30, 0.19, 0.13], { recv: 1, gloss: 1, a: 0.16, dry: 0.5 }, true);
  }
}

function chair(x, z, dir, rnd) {
  const c = [0.06, 0.04, 0.035];
  for (const [dx, dz] of [[-9, -8], [9, -8], [-9, 9], [9, 9]]) wst([V(x + dx, 0, z + dz), V(x + dx * 1.1, 46, z + dz)], 2.2, c, { recv: 1, dry: 0.2, w0: 1, tip: 1 });
  wst([V(x - 11, 46, z), V(x + 11, 46, z)], 5, c, { recv: 1, dry: 0.2, gloss: 0.5 });
  wst([V(x - 9, 46, z - 9), V(x + 9, 46, z - 9)], 3, c, { recv: 1, dry: 0.2, gloss: 0.5 });
  wst([V(x - 10, 47, z - 10), V(x - 11, 74, z - 10), V(x, 84, z - 10), V(x + 11, 74, z - 10), V(x + 10, 47, z - 10)], 2.4, c, { recv: 1, dry: 0.3, gloss: 0.6 });
}
function table(x, z, rnd) {
  const c = [0.05, 0.04, 0.045];
  wst([V(x, 0, z), V(x, 70, z)], 5, c, { recv: 1, dry: 0.2, h: 0.3 });
  for (const dx of [-16, 16]) wst([V(x, 1.2, z), V(x + dx, 0.5, z + 5)], 4, c, { recv: 1 });
  // top: a thin ellipse seen almost edge-on, catching the lamplight
  for (let dz = -22; dz <= 22; dz += 5) {
    const hw = 34 * Math.sqrt(Math.max(0, 1 - dz * dz / (24 * 24)));
    wst([V(x - hw, 72, z + dz), V(x + hw, 72, z + dz)], 6, mixc([0.18, 0.09, 0.07], [0.42, 0.24, 0.14], (dz + 22) / 44), { recv: 1, gloss: 0.9, dry: 0.15, h: 0.4 }, true);
  }
  wst([V(x - 34, 72, z), V(x + 34, 72, z + 1)], 1.6, [0.85, 0.6, 0.35], { recv: 1, a: 0.5, gloss: 1, dry: 0.4 });
  // a glass of something red and a candle
  wst([V(x + 12, 73, z + 4), V(x + 12, 82, z + 4)], 5, [0.75, 0.10, 0.08], { recv: 0.4, dry: 0.1, gloss: 1, w0: 1, tip: 0.5, a: 0.9 });
  wdab(V(x - 10, 80, z - 4), 3.4, 3.6, [1.0, 0.85, 0.5], { recv: 0, dry: 0.1 });
  wdab(V(x - 10, 80, z - 4), 22, 22, [1.0, 0.6, 0.25], { kind: 1, a: 0.3 });
}
// a patron: a dark suit, a hat, a warm rim of lamplight on one shoulder
function patron(x, z, seated, hatCol, jacket, faceDir) {
  const yb = seated ? 44 : 60, top = seated ? 104 : 148;
  wst([V(x, yb, z), V(x + faceDir * 1.5, top, z)], 32, jacket, { recv: 1, dry: 0.15, h: 0.3, w0: 1, tip: 0.6 });
  wst([V(x - faceDir * 14, yb + 6, z + 0.2), V(x - faceDir * 15, top - 4, z + 0.2)], 3, [0.9, 0.55, 0.28], { recv: 1, a: 0.32, dry: 0.5, exact: true });
  wst([V(x - 10, top + 2, z + 0.1), V(x + 10, top + 2, z + 0.1)], 6, jacket, { recv: 1, dry: 0.2 });
  wdab(V(x + faceDir * 1.5, top + 12, z + 0.3), 13, 13, [0.30, 0.17, 0.12], { recv: 1, dry: 0.15, h: 0.5 });
  wst([V(x - 14 + faceDir * 1.5, top + 19, z + 0.5), V(x + 14 + faceDir * 1.5, top + 19, z + 0.5)], 3.2, hatCol, { recv: 1, dry: 0.2, gloss: 0.4 });
  wst([V(x - 7.5 + faceDir * 1.5, top + 20, z + 0.5), V(x - 6.5 + faceDir * 1.5, top + 31, z + 0.5), V(x + 6.5 + faceDir * 1.5, top + 31, z + 0.5), V(x + 7.5 + faceDir * 1.5, top + 20, z + 0.5)], 7, hatCol, { recv: 1, dry: 0.2, gloss: 0.4, w0: 1, tip: 1 });
}

function buildRoom(rnd) {
  const dark = [[0.04, 0.035, 0.05], [0.07, 0.05, 0.05], [0.05, 0.06, 0.08], [0.09, 0.05, 0.07]];
  const hats = [[0.05, 0.05, 0.06], [0.16, 0.14, 0.13], [0.08, 0.07, 0.09], [0.22, 0.2, 0.18]];
  const P = () => [dark[(rnd() * 4) | 0], hats[(rnd() * 4) | 0]];
  // tables at several depths, each with two or three chairs and people on them
  const tables = [[-255, -105], [285, -95], [-430, 10], [430, 40], [-150, -190], [380, -180], [-40, -215]];
  for (const [x, z] of tables) {
    table(x, z, rnd);
    for (const s of [-1, 1]) {
      const [j, h] = P();
      chair(x + s * 40, z - 6, s, rnd);
      if (rnd() < 0.85) patron(x + s * 38, z - 8, true, h, j, -s);
    }
  }
  // people standing at the back wall and along the bar
  for (const x of [-140, -100, -15, 30, 120, 150, 250, 300, 420, 470]) {
    const [j, h] = P();
    patron(x + (rnd() - 0.5) * 14, WALL_Z + 30 + rnd() * 24, false, h, j, rnd() < 0.5 ? -1 : 1);
  }
  // big dark shapes of patrons in the foreground, backs to us, framing the picture
  for (const [x, z, s] of [[-330, 180, 1.0], [-250, 200, 0.9], [340, 200, 1.0], [420, 170, 1.1]]) {
    const [j, h] = P();
    wst([V(x, 30, z), V(x, 120, z)], 42, j, { recv: 1, dry: 0.15, h: 0.3, w0: 1, tip: 0.7 });
    wdab(V(x, 142, z + 0.3), 20, 20, [0.05, 0.04, 0.05], { recv: 1 });
    wst([V(x - 22, 154, z + 0.5), V(x + 22, 154, z + 0.5)], 4.4, h, { recv: 1, gloss: 0.4 });
    wst([V(x - 11, 156, z + 0.5), V(x - 10, 174, z + 0.5), V(x + 10, 174, z + 0.5), V(x + 11, 156, z + 0.5)], 11, h, { recv: 1, gloss: 0.4, w0: 1, tip: 1 });
  }
}

function buildHaze(rnd) {
  // a static veil of smoke at several depths, lit by the lamps
  for (let i = 0; i < 26; i++) {
    const y = 40 + rnd() * 420, z = WALL_Z + rnd() * 460;
    const x = -700 + rnd() * 1400, len = 260 + rnd() * 480;
    wst([V(x, y, z), V(x + len * 0.5, y + (rnd() - 0.5) * 18, z), V(x + len, y + (rnd() - 0.5) * 12, z)], 30 + rnd() * 40, [0.58, 0.62, 0.78], { kind: 1, a: 0.05 + rnd() * 0.06, recv: 1 });
  }
}

function buildSets() {
  const mk = fn => { const b = new StrokeBuf(true); G.buf = b; G.layer = 'bg'; fn(); b.dirty = true; return b; };
  SET.club = mk(() => {
    const rnd = mulberry(1937);
    buildWall(rnd);
    buildWindows(rnd);
    buildStair(rnd);
    buildBar(rnd);
    buildFloor(rnd);
    buildRoom(rnd);
    buildLamps(rnd);
    buildHaze(rnd);
  });
}
