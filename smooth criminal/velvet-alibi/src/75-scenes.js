// ============================================================
// Camera, lights and the moving atmosphere for the club scene.
// Beats:  0 wide, the lead waits | 8 he walks out | 14 the spot finds him | 18 the line arrives |
//        24 glide | 32 hits | 40 low shot, the feet | 48.5 everything stops | 50 the lean | 54 hat tip | 56 end
// ============================================================

// [beat, visible height at the dancers (cm), look-at x, look-at y, camera height above look-at, roll (rad)]
const CAM_KEYS = [
  [0, 336, 78, 120, 30, 0.0], [8, 318, 46, 112, 24, 0.0],
  [16, 268, 4, 102, 14, 0.0], [24, 252, -6, 104, 12, 0.0],
  [32, 238, 0, 100, 10, 0.0], [39.5, 242, 0, 100, 10, 0.0],
  [41.2, 178, 0, 66, -4, 0.0], [47.2, 172, 0, 66, -4, 0.0],
  [48.6, 238, 0, 102, 8, 0.0], [50, 252, 14, 104, 8, 0.0], [53.2, 252, 14, 104, 8, 0.0],
  [55.2, 208, 0, 112, 6, 0.0], [56, 204, 0, 112, 6, 0.0]
];
function cameraAt(t) {
  const b = t / BEAT;
  let i = 0;
  while (i + 1 < CAM_KEYS.length && b >= CAM_KEYS[i + 1][0]) i++;
  const k0 = CAM_KEYS[i], k1 = CAM_KEYS[Math.min(i + 1, CAM_KEYS.length - 1)];
  const u = k1[0] > k0[0] ? easeInOut(clamp((b - k0[0]) / (k1[0] - k0[0]), 0, 1)) : 0;
  let viewH = lerp(k0[1], k1[1], u), tx = lerp(k0[2], k1[2], u), ty = lerp(k0[3], k1[3], u);
  const yOff = lerp(k0[4], k1[4], u), roll = lerp(k0[5], k1[5], u);
  // a whisper of handheld drift, and a small push on every bar line
  tx += 1.6 * Math.sin(t * 0.7) + 0.8 * Math.sin(t * 1.9 + 1);
  ty += 1.1 * Math.sin(t * 0.9 + 2);
  if (!REDUCED) viewH *= 1 - 0.012 * Math.pow(dip(b / 4), 2);
  const asp = CW / CH;
  if (asp < 1.1) { const need = 200 / asp; if (need > viewH) { ty += (need - viewH) * 0.1; viewH = need; } }
  const fov = 2 * Math.atan((viewH / 2) / CAM_DIST);
  return makeCam(V(tx * 0.75, ty + yOff, CAM_DIST), V(tx, ty, 0), fov, roll + 0.004 * Math.sin(t * 0.6));
}

// how brightly the follow-spot burns: it finds him as he reaches the mark, narrows for the lean, dies at the end
function spotOn(b) {
  const on = smoothstep(12.6, 14.6, b) * (1 - smoothstep(55.3, 56, b));
  const pulse = 1 + 0.05 * hitPulse('kick', b * BEAT, 0.2) + 0.09 * hitPulse('snare', b * BEAT, 0.12) + 0.14 * hitPulse('crash', b * BEAT, 0.4);
  return on * pulse;
}
function lightsFor(b) {
  const on = spotOn(b);
  return {
    // key: a warm spot from above and in front, slightly to his left; rim: cool light through the windows behind
    w: V(-140, 420, 300), c: V(320, 150, -300),
    wI: 0.5 + 0.75 * on, cI: 1.0 + 0.1 * hitPulse('kick', b * BEAT, 0.15)
  };
}
const LOOK = { tint: null, rimW: [1.0, 0.82, 0.55], rimC: [0.45, 0.72, 1.0] };

// world-space ellipse on the screen, as the composite expects: [cx, cy (from the bottom), rx, ry]
function poolAt(cam, p, rxCm, ryCm) {
  const q = project(cam, p);
  return [q.x, CH - q.y, rxCm * q.s, ryCm * q.s];
}

// smoke that drifts and curls through the room, and the faint cone of the follow-spot
function drawSmoke(t, b, cam, lead) {
  const rnd = mulberry(4711);
  G.mid = 0;
  for (let i = 0; i < 18; i++) {
    const y = 26 + rnd() * 400, z = WALL_Z + 30 + rnd() * 560;
    const x0 = -650 + rnd() * 1300, len = 200 + rnd() * 340, sp = 0.15 + rnd() * 0.35, ph = rnd() * TAU, amp = 50 + rnd() * 90;
    const w = 26 + rnd() * 34;
    const x = x0 + Math.sin(t * sp + ph) * amp;
    const y1 = y + 10 * Math.sin(t * 0.55 + ph), y2 = y + 14 * Math.sin(t * 0.4 + ph * 2);
    st([V(x, y, z), V(x + len * 0.5, y1, z), V(x + len, y2, z)], [w * 0.6, w, w * 0.5], [0.60, 0.64, 0.82],
      { kind: 1, a: 0.045 + rnd() * 0.05, recv: 1, dry: 0.3 });
  }
  const on = spotOn(b);
  if (on > 0.02) {
    const [lx, lz] = leadXZ(b);
    for (let k = -2; k <= 2; k++) {
      st([V(lx * 0.4 - 90 + k * 6, 480, lz - 70), V(lx + k * 22, 0, lz)], [4, 28 + Math.abs(k) * 4], [1.0, 0.86, 0.6],
        { kind: 1, a: 0.032 * on, recv: 0, dry: 0.2 });
    }
  }
  // dust turning in the beam
  for (let i = 0; i < 26; i++) {
    const [lx, lz] = leadXZ(b);
    const ph = i * 2.37;
    const x = lx + 90 * Math.sin(t * 0.3 + ph) * (0.4 + (i % 5) * 0.15), y = 30 + ((t * 8 + i * 37) % 340), z = lz + 60 * Math.cos(t * 0.27 + ph * 1.3);
    dab(V(x, y, z), 1.8, 2.4, [1.0, 0.9, 0.7], { a: 0.5 * on, kind: 0, dry: 0.2, noShadow: true });
  }
}
