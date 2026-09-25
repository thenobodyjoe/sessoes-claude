// ============================================================
// Metamorphic shapes. Every shape is the same number of points, resampled by arc length, starting
// at the top and running clockwise, so any two can be blended point by point: a circle can become a
// rhombus, a bar, a star or the dome of the Congress, and the morph always turns the same way round.
// ============================================================
const NP = 160;

function resample(verts) {
  // verts: [[x, y], ...] closed polyline (dense enough to be the real outline)
  const n = verts.length, cum = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const a = verts[i], b = verts[(i + 1) % n];
    cum[i + 1] = cum[i] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const L = cum[n];
  // clockwise on screen (y down) has a positive shoelace sum
  let area = 0;
  for (let i = 0; i < n; i++) { const a = verts[i], b = verts[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const pts = new Float32Array(NP * 2);
  let j = 0;
  for (let k = 0; k < NP; k++) {
    const s = (k / NP) * L;
    while (j < n - 1 && cum[j + 1] < s) j++;
    const a = verts[j], b = verts[(j + 1) % n];
    const u = (s - cum[j]) / ((cum[j + 1] - cum[j]) || 1);
    pts[k * 2] = lerp(a[0], b[0], u);
    pts[k * 2 + 1] = lerp(a[1], b[1], u);
  }
  let out = pts;
  if (area < 0) {                       // flip to clockwise
    out = new Float32Array(NP * 2);
    for (let k = 0; k < NP; k++) { out[k * 2] = pts[(NP - 1 - k) * 2]; out[k * 2 + 1] = pts[(NP - 1 - k) * 2 + 1]; }
  }
  // start at the point straight above the centroid
  let cx = 0, cy = 0;
  for (let k = 0; k < NP; k++) { cx += out[k * 2]; cy += out[k * 2 + 1]; }
  cx /= NP; cy /= NP;
  let best = 0, bd = 1e9;
  for (let k = 0; k < NP; k++) {
    const dx = out[k * 2] - cx, dy = out[k * 2 + 1] - cy;
    const ang = Math.atan2(dy, dx);
    const d = Math.abs(((ang + Math.PI / 2 + Math.PI) % TAU + TAU) % TAU - Math.PI);
    if (d < bd - 1e-9 || (Math.abs(d - bd) < 1e-9 && dy < out[best * 2 + 1] - cy)) { bd = d; best = k; }
  }
  const rot = new Float32Array(NP * 2);
  for (let k = 0; k < NP; k++) { rot[k * 2] = out[((k + best) % NP) * 2]; rot[k * 2 + 1] = out[((k + best) % NP) * 2 + 1]; }
  return rot;
}

// ---------- outlines (screen space)
function vCircle(cx, cy, r, n) { const v = []; n = n || 240; for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (i / n) * TAU; v.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return v; }
function vEllipse(cx, cy, rx, ry) { const v = []; for (let i = 0; i < 240; i++) { const a = -Math.PI / 2 + (i / 240) * TAU; v.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return v; }
function vRRect(x, y, w, h, r, rs) {
  // rs: per-corner radii [tl, tr, br, bl] (optional)
  const R = rs || [r, r, r, r], v = [];
  const corner = (cx, cy, rr, a0) => { for (let i = 0; i <= 12; i++) { const a = a0 + (i / 12) * (Math.PI / 2); v.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]); } };
  const tl = Math.min(R[0], w / 2, h / 2), tr = Math.min(R[1], w / 2, h / 2), br = Math.min(R[2], w / 2, h / 2), bl = Math.min(R[3], w / 2, h / 2);
  if (tl > 0.01) corner(x + tl, y + tl, tl, Math.PI); else v.push([x, y]);
  if (tr > 0.01) corner(x + w - tr, y + tr, tr, -Math.PI / 2); else v.push([x + w, y]);
  if (br > 0.01) corner(x + w - br, y + h - br, br, 0); else v.push([x + w, y + h]);
  if (bl > 0.01) corner(x + bl, y + h - bl, bl, Math.PI / 2); else v.push([x, y + h]);
  return v;
}
function vPoly(cx, cy, r, n, rot) { const v = []; for (let i = 0; i < n; i++) { const a = (rot || 0) - Math.PI / 2 + (i / n) * TAU; v.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return v; }
function vStar(cx, cy, r1, r2, n, rot) { const v = []; for (let i = 0; i < n * 2; i++) { const a = (rot || 0) - Math.PI / 2 + (i / (n * 2)) * TAU; const r = i % 2 ? r2 : r1; v.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return v; }
function vRhombus(cx, cy, w, h) { return [[cx, cy - h / 2], [cx + w / 2, cy], [cx, cy + h / 2], [cx - w / 2, cy]]; }
// half ellipse: dome (curve up, flat side at cy) or bowl (curve down, flat side at cy)
function vHalf(cx, cy, rx, ry, dome) {
  const v = [];
  for (let i = 0; i <= 120; i++) { const a = Math.PI + (i / 120) * Math.PI; v.push([cx + Math.cos(a) * rx, cy + (dome ? 1 : -1) * Math.sin(a) * ry]); }
  return dome ? v : v.reverse();
}

const S_ = {
  circle: (cx, cy, r) => resample(vCircle(cx, cy, r)),
  ellipse: (cx, cy, rx, ry) => resample(vEllipse(cx, cy, rx, ry)),
  rrect: (x, y, w, h, r, rs) => resample(vRRect(x, y, w, h, r, rs)),
  rect: (cx, cy, w, h, r) => resample(vRRect(cx - w / 2, cy - h / 2, w, h, r || 0)),
  poly: (cx, cy, r, n, rot) => resample(vPoly(cx, cy, r, n, rot)),
  star: (cx, cy, r1, r2, n, rot) => resample(vStar(cx, cy, r1, r2, n || 5, rot)),
  rhombus: (cx, cy, w, h) => resample(vRhombus(cx, cy, w, h)),
  half: (cx, cy, rx, ry, dome) => resample(vHalf(cx, cy, rx, ry, dome)),
};

// unit shapes (radius ~1 about the origin) for the free-floating morphers
const UNIT = {
  circle: S_.circle(0, 0, 1),
  square: S_.rect(0, 0, 1.7, 1.7, 0.18),
  rhombus: S_.rhombus(0, 0, 2.1, 2.1),
  tri: S_.poly(0, 0.18, 1.2, 3),
  star: S_.star(0, 0, 1.2, 0.52, 5),
  pill: S_.rect(0, 0, 2.3, 0.9, 0.45),
  hex: S_.poly(0, 0, 1.08, 6, Math.PI / 6),
  bar: S_.rrect(-0.35, -1.1, 0.7, 2.2, 0, [0.35, 0, 0, 0]),
};
const CYCLE = ['circle', 'rhombus', 'square', 'tri', 'star', 'hex', 'pill', 'bar'];

function morphPts(A, B, t, out) {
  out = out || new Float32Array(NP * 2);
  for (let i = 0; i < NP * 2; i++) out[i] = A[i] + (B[i] - A[i]) * t;
  return out;
}
// a shape that keeps turning into the next one in CYCLE: phase in "shapes" (1.0 = one full morph)
const _cyc = new Float32Array(NP * 2);
function cyclePts(phase, list) {
  list = list || CYCLE;
  const n = list.length, i = ((Math.floor(phase) % n) + n) % n, f = phase - Math.floor(phase);
  // hold each shape for a moment, then snap-morph with an ease: reads as deliberate, not mushy
  const u = E.inOutCubic(smoothstep(0.35, 1, f));
  return morphPts(UNIT[list[i]], UNIT[list[(i + 1) % n]], u, _cyc);
}
function xformPts(P, cx, cy, s, rot, out, sy) {
  out = out || new Float32Array(NP * 2);
  const c = Math.cos(rot || 0), si = Math.sin(rot || 0), syy = sy === undefined ? s : sy;
  for (let k = 0; k < NP; k++) {
    const x = P[k * 2] * s, y = P[k * 2 + 1] * syy;
    out[k * 2] = cx + x * c - y * si;
    out[k * 2 + 1] = cy + x * si + y * c;
  }
  return out;
}
function tracePts(ctx, P) {
  ctx.beginPath();
  ctx.moveTo(P[0], P[1]);
  for (let k = 1; k < NP; k++) ctx.lineTo(P[k * 2], P[k * 2 + 1]);
  ctx.closePath();
}
function fillPts(ctx, P, style) { tracePts(ctx, P); ctx.fillStyle = style; ctx.fill(); }
function ptsCentroid(P) { let x = 0, y = 0; for (let k = 0; k < NP; k++) { x += P[k * 2]; y += P[k * 2 + 1]; } return [x / NP, y / NP]; }
