// ============================================================
// The motion score: poses, cuts, camera drift and the light map taken from the reference clip
// (see tools/pack.py). Everything here is numbers; the painting decides what they look like.
// ============================================================
const FPS = DATA.fps, NF = DATA.n, VW = DATA.w, VH = DATA.h;
const b64bytes = s => { const b = atob(s), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
const POSE_BYTES = b64bytes(DATA.poseB64);
const POSE_DV = new DataView(POSE_BYTES.buffer);
delete DATA.poseB64;

// ---------------------------------------------------------------- shots
const SHOT_OF = new Int32Array(NF);
DATA.shots.forEach(([a, b], k) => { for (let i = a; i < b; i++) SHOT_OF[i] = k; });
const shotStart = f => DATA.shots[SHOT_OF[f]][0];
const shotEnd = f => DATA.shots[SHOT_OF[f]][1];

// ---------------------------------------------------------------- people
// frame f -> [{id, lead, P: Float32Array(33*3) with x, y (0..1 of the clip frame), vis}]
const FRAME_PEOPLE = new Array(NF);
for (let f = 0; f < NF; f++) {
  let o = DATA.poseOff[f];
  const n = POSE_BYTES[o++], list = [];
  for (let k = 0; k < n; k++) {
    const id = POSE_DV.getUint16(o, true), lead = POSE_BYTES[o + 2] === 1;
    o += 3;
    const P = new Float32Array(99);
    for (let m = 0; m < 33; m++) {
      P[m * 3] = POSE_DV.getInt16(o, true) / 4096;
      P[m * 3 + 1] = POSE_DV.getInt16(o + 2, true) / 4096;
      P[m * 3 + 2] = POSE_BYTES[o + 4] / 255;
      o += 5;
    }
    list.push({ id, lead, P });
  }
  FRAME_PEOPLE[f] = list;
}

// The people at a (fractional) frame: joints are blended between neighbouring frames of the same shot,
// so the painting can play at any refresh rate and still land exactly on each clip frame.
function peopleAt(ff) {
  const f0 = clamp(Math.floor(ff), 0, NF - 1), f1 = Math.min(f0 + 1, NF - 1);
  const u = ff - f0;
  const A = FRAME_PEOPLE[f0];
  if (u < 1e-4 || f1 === f0 || SHOT_OF[f1] !== SHOT_OF[f0]) return A.map(p => ({ id: p.id, lead: p.lead, P: p.P, f: f0, u: 0 }));
  const B = FRAME_PEOPLE[f1];
  return A.map(p => {
    const q = B.find(r => r.id === p.id);
    if (!q) return { id: p.id, lead: p.lead, P: p.P, f: f0, u: 0 };
    const P = new Float32Array(99);
    for (let i = 0; i < 99; i++) P[i] = p.P[i] + (q.P[i] - p.P[i]) * u;
    return { id: p.id, lead: p.lead, P, f: f0, u };
  });
}

// camera drift of the room (in clip-frame fractions) and the two light pools
function camAt(ff) {
  const f0 = clamp(Math.floor(ff), 0, NF - 1), f1 = Math.min(f0 + 1, NF - 1);
  const u = SHOT_OF[f1] === SHOT_OF[f0] ? ff - f0 : 0;
  const c = DATA.cam;
  return [lerp(c[f0 * 2], c[f1 * 2], u), lerp(c[f0 * 2 + 1], c[f1 * 2 + 1], u)];
}
function poolsAt(ff) {
  const f0 = clamp(Math.floor(ff), 0, NF - 1), f1 = Math.min(f0 + 1, NF - 1);
  const u = SHOT_OF[f1] === SHOT_OF[f0] ? ff - f0 : 0;
  const p = DATA.pools, r = [];
  for (let k = 0; k < 2; k++) {
    const a = (f0 * 2 + k) * 4, b = (f1 * 2 + k) * 4;
    r.push([0, 1, 2, 3].map(j => lerp(p[a + j], p[b + j], u)));
  }
  return r;   // [[x, y, r, strength] warm, [..] cool], x/y in 0..1 of the frame, r in frame heights
}

// ---------------------------------------------------------------- the room's light, restyled
// The 32x18 colour map is re-inked as a nocturne in blue and gold: luminance picks a step on one of two
// ramps, and warmth decides which ramp. Only a trace of the clip's own chroma survives.
const RAMP_COOL = [[0, [0.015, 0.02, 0.05]], [0.22, [0.05, 0.1, 0.22]], [0.45, [0.1, 0.28, 0.46]], [0.7, [0.36, 0.6, 0.74]], [1, [0.9, 0.94, 0.92]]];
const RAMP_GOLD = [[0, [0.04, 0.025, 0.035]], [0.22, [0.26, 0.09, 0.06]], [0.45, [0.66, 0.32, 0.1]], [0.7, [0.95, 0.68, 0.3]], [1, [1.0, 0.95, 0.8]]];
function ramp(R, x) {
  x = clamp(x, 0, 1);
  let i = 0;
  while (i < R.length - 2 && x > R[i + 1][0]) i++;
  const [x0, c0] = R[i], [x1, c1] = R[i + 1];
  return mixc(c0, c1, smoothstep(0, 1, (x - x0) / (x1 - x0)));
}
function restyle(r, g, b) {
  const L = 0.3 * r + 0.55 * g + 0.15 * b;
  const Lp = clamp(Math.pow(L, 0.8) * 1.15, 0, 1);
  const warm = smoothstep(0.02, 0.16, r - b * 0.95);
  const c = mixc(ramp(RAMP_COOL, Lp), ramp(RAMP_GOLD, Lp), warm);
  return mixc(c, [r * 1.1, g * 1.1, b * 1.1], 0.12);
}
const FW = DATA.fw, FH = DATA.fh, FSTEP = DATA.fstep;
const FIELD = (() => {
  const raw = b64bytes(DATA.fieldB64);
  delete DATA.fieldB64;
  const n = raw.length / (FW * FH * 3), out = [];
  for (let k = 0; k < n; k++) {
    const F = new Float32Array(FW * FH * 4);
    for (let j = 0; j < FW * FH; j++) {
      const o = (k * FW * FH + j) * 3;
      const c = restyle(raw[o] / 255, raw[o + 1] / 255, raw[o + 2] / 255);
      F[j * 4] = c[0]; F[j * 4 + 1] = c[1]; F[j * 4 + 2] = c[2];
      F[j * 4 + 3] = 0.3 * c[0] + 0.55 * c[1] + 0.15 * c[2];
    }
    out.push(F);
  }
  return out;
})();

// the restyled room at frame ff: a blend of the two stored maps around it (never across a cut)
const ROOM = { F: new Float32Array(FW * FH * 4), f: -1 };
function roomAt(ff) {
  const f = clamp(ff, 0, NF - 1);
  if (Math.abs(f - ROOM.f) < 1e-4) return ROOM.F;
  const s0 = shotStart(Math.floor(f)), s1 = shotEnd(Math.floor(f)) - 1;
  let k0 = Math.floor(f / FSTEP), k1 = k0 + 1;
  let u = f / FSTEP - k0;
  if (k0 * FSTEP < s0) { k0 = Math.ceil(s0 / FSTEP); k1 = k0; u = 0; }
  if (k1 * FSTEP > s1 || k1 >= FIELD.length) { k1 = k0; u = 0; }
  k0 = Math.min(k0, FIELD.length - 1); k1 = Math.min(k1, FIELD.length - 1);
  const A = FIELD[k0], B = FIELD[k1], O = ROOM.F;
  for (let i = 0; i < O.length; i++) O[i] = A[i] + (B[i] - A[i]) * u;
  ROOM.f = f;
  return O;
}
// bilinear sample of the room map at (x, y) in 0..1 of the clip frame -> [r, g, b, lum]
function roomSample(F, x, y) {
  const fx = clamp(x * FW - 0.5, 0, FW - 1.001), fy = clamp(y * FH - 0.5, 0, FH - 1.001);
  const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
  const r = [0, 0, 0, 0];
  const w = [(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v];
  const ix = [(y0 * FW + x0) * 4, (y0 * FW + x0 + 1) * 4, ((y0 + 1) * FW + x0) * 4, ((y0 + 1) * FW + x0 + 1) * 4];
  for (let k = 0; k < 4; k++) for (let c = 0; c < 4; c++) r[c] += F[ix[k] + c] * w[k];
  return r;
}
// luminance gradient (per unit of frame width / height)
function roomGrad(F, x, y) {
  const e = 1 / FW;
  const l = roomSample(F, x - e, y)[3], rr = roomSample(F, x + e, y)[3];
  const d = roomSample(F, x, y - e * VW / VH)[3], uu = roomSample(F, x, y + e * VW / VH)[3];
  return [(rr - l) / (2 * e), (uu - d) / (2 * e)];
}

// ---------------------------------------------------------------- clip frame -> canvas (cover fit)
const VIEW = { s: 1, ox: 0, oy: 0 };
function viewFit() {
  const s = Math.max(CW / VW, CH / VH);
  VIEW.s = s; VIEW.ox = (CW - VW * s) / 2; VIEW.oy = (CH - VH * s) / 2;
}
const sx = x => VIEW.ox + x * VW * VIEW.s;
const sy = y => VIEW.oy + y * VH * VIEW.s;
const fxOf = X => (X - VIEW.ox) / (VW * VIEW.s);
const fyOf = Y => (Y - VIEW.oy) / (VH * VIEW.s);
