// ============================================================
// Choreography for a 30 second club scene: 56 beats at 112 BPM.
//   0-8    the lead waits in the smoke at the back, hat pulled low; a flick of the brim
//   8-16   the walk: a long, unhurried stride out into the room and down to the spotlight
//  16-24   in the light: shoulder pops, a point, a full spin, up on his toes
//  18-26   four dancers in dark suits march in from both sides and take up a V behind him
//  24-32   a sideways glide, left and back again, with the line swaying in time
//  32-40   the hits: arms flung out on the beat, the whole line together; a spin
//  40-48   the feet: taps and slides (the camera drops to the floor)
//  48-50   everything stops, hands go to the hat brims
//  50-56   the lean: the lead tips far past his balance point, holds, snaps up and tips his hat
// Every pose is a function of the beat, so any frame can be reproduced.
// ============================================================
const parity = k => ((k % 2) + 2) % 2;

function sideHit(b, lag, w0, w1, over) {
  b -= lag || 0;
  const k = Math.floor(b + 0.5);
  const d = b - k;
  const sg = parity(k) === 0 ? 1 : -1;
  const a0 = w0 === undefined ? 0.32 : w0, a1 = w1 === undefined ? 0.3 : w1;
  if (d <= -a0) return -sg;
  if (d >= a1) return sg;
  return lerp(-sg, sg, easeInOutBack((d + a0) / (a0 + a1), over === undefined ? 1.1 : over));
}
const dip = b => Math.pow(0.5 + 0.5 * Math.cos(TAU * b), 2.5);

// the basic two-step: weight shifts on every beat, knees dip on the beat, arms swing across the body
function twoStep(b, amp, P) {
  const s = sideHit(b);
  const sa = sideHit(b, 0.07, 0.3, 0.34, 1.6);
  const dp = dip(b);
  P.px = s * 10 * amp;
  P.py = -3 - dp * 8 * amp;
  P.proll = s * 0.13 * amp;
  P.pyaw = s * 0.14 * amp;
  P.croll = -s * 0.15 * amp;
  P.cyaw = -sa * 0.26 * amp;
  P.cpitch = 0.04 + dp * 0.1 * amp;
  P.hroll = s * 0.1 * amp;
  P.hpitch = -0.03 + dp * 0.16 * amp;
  P.hyaw = -sa * 0.12 * amp;
  const a = -sa;
  P.mX = -12 + 16 * a * amp; P.mY = -22 + 8 * a * amp - dp * 4; P.mZ = 23 - 3 * Math.abs(a) * amp;
  P.fX = 12 + 16 * a * amp; P.fY = -22 - 8 * a * amp - dp * 4; P.fZ = 23 - 3 * Math.abs(a) * amp;
  P.fOpen = smoothstep(-0.25, 0.25, Math.sin(Math.PI * (b + 0.25)));
  P.mOpen = smoothstep(-0.25, 0.25, Math.sin(Math.PI * (b + 0.75)));
  P.lfx = -17; P.rfx = 17;
  P.lheel = Math.max(0, s) * 8 * amp;
  P.rheel = Math.max(0, -s) * 8 * amp;
  P.lkx = lerp(-0.3, 0.9, clamp(s * amp, 0, 1));
  P.rkx = lerp(0.3, -0.9, clamp(-s * amp, 0, 1));
  P.shM = Math.max(0, -s) * 2 * amp;
  P.shF = Math.max(0, s) * 2 * amp;
  P.smile = 0.5;
  P.mouth = 0.05 + 0.05 * dp;
  return P;
}

// shift a pose (built around the origin) to a spot on the floor
function place(P, x, z) {
  P.px += x; P.pz += z; P.lfx += x; P.rfx += x; P.lfz += z; P.rfz += z;
  return P;
}
// an arm reaching a target relative to the chest (side: 'M' = screen left, 'F' = screen right)
function arm(P, side, x, y, z, open, point) {
  if (side === 'M') { P.mX = x; P.mY = y; P.mZ = z; P.mOpen = open || 0; }
  else { P.fX = x; P.fY = y; P.fZ = z; P.fOpen = open || 0; P.fPoint = point || 0; }
}

// a walking stride along the unit vector (dx, dz); A is the half stride (cm), u = beats since the first step
// (feet track the pelvis, so a straight walk at A cm-per-beat / 2 stays planted without sliding)
function stride(b, P, dx, dz, A, b0, faceYaw) {
  const yaw = faceYaw === undefined ? Math.atan2(dx, dz) : faceYaw;
  const fx = dx, fz = dz, rx = Math.cos(yaw), rz = -Math.sin(yaw);
  const u = b - b0, c = Math.cos(Math.PI * u), sn = Math.sin(Math.PI * u);
  const sL = A * c, sR = -A * c;
  P.pyaw = yaw;
  P.lfx = -11 * rx + fx * sL; P.lfz = -11 * rz + fz * sL;
  P.rfx = 11 * rx + fx * sR; P.rfz = 11 * rz + fz * sR;
  P.lfy = 9 * Math.max(0, -sn); P.rfy = 9 * Math.max(0, sn);
  P.lfyaw = yaw - 0.1; P.rfyaw = yaw + 0.1;
  P.lheel = 7 * Math.max(0, sn) * (c < 0 ? 1 : 0.3); P.rheel = 7 * Math.max(0, -sn) * (c > 0 ? 1 : 0.3);
  P.py = -3 - 2.2 * Math.abs(sn);
  P.proll = 0.06 * sn; P.croll = -0.07 * sn; P.cyaw = -0.16 * c;
  P.hyaw = -0.5 * yaw; P.hpitch = 0.06; P.hroll = -0.04 * sn;
  P.mX = -20 - 3 * sn; P.mY = -29; P.mZ = 14 + 11 * c; P.mOpen = 0.3;
  P.fX = 20 + 3 * sn; P.fY = -29; P.fZ = 14 - 11 * c; P.fOpen = 0.3;
  P.smile = 0.25; P.mouth = 0.03;
  return P;
}

// ---------------------------------------------------------------- moves
function idle(b, P, amp) { twoStep(b, amp, P); P.smile = 0.2; P.hpitch += 0.12; return P; }

// hand to the brim, tip, and back
function hatTip(b, P, s, amp) {
  const lb = b - s;
  twoStep(b, amp === undefined ? 0.3 : amp, P);
  const up = easeOutBack(seg(lb, 0, 0.35), 1.8), down = smoothstep(0.95, 1.5, lb);
  const e = up * (1 - down);
  arm(P, 'F', lerp(P.fX, 13, e), lerp(P.fY, 43, e), lerp(P.fZ, 17, e), e, 0);
  P.hatLift = e * 0.8;
  P.hpitch = lerp(P.hpitch, 0.16, e); P.hroll = lerp(P.hroll, -0.08, e);
  P.smile = lerp(0.4, 0.9, e); P.brow = 0.4 * e;
  return P;
}

// the low, cool stand-up after the lean: hat down again
function crouchPop(b, P, s) {
  const lb = b - s;
  twoStep(b, 0.6, P);
  const d = bump(lb, 0.1, 0.16);
  P.py -= 12 * d; P.lkx = lerp(P.lkx, -0.9, d); P.rkx = lerp(P.rkx, 0.9, d);
  P.shM += 6 * bump(lb, 0.3, 0.12); P.shF -= 4 * bump(lb, 0.3, 0.12);
  return P;
}

// a full spin on the balls of the feet, arms out, jacket-shoulders leading
function spin(b, P, s) {
  const lb = b - s;
  twoStep(b, 0.35, P);
  const u = easeInOutCubic(seg(lb, 0.35, 1.55));
  let yaw = -0.4 * bump(lb, 0.22, 0.14) + TAU * u;
  if (u > 0.5) yaw -= TAU;
  P.pyaw = yaw; P.cyaw = -0.12 * Math.sin(Math.PI * u); P.croll = 0; P.proll = 0;
  P.px = 0; P.py = -3 - 3 * Math.sin(Math.PI * u);
  const out = 1 - 0.4 * Math.sin(Math.PI * u);
  arm(P, 'M', -38 * out, 6, 10, 1); arm(P, 'F', 38 * out, 6, 10, 1);
  P.mPole = 0; P.fPole = 0;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  P.lfx = -11 * cy + 2 * sy; P.lfz = 11 * sy + 2 * cy;
  P.rfx = 11 * cy + 2 * sy; P.rfz = -11 * sy + 2 * cy;
  P.lfyaw = -0.15 + yaw; P.rfyaw = 0.15 + yaw;
  const toes = Math.sin(Math.PI * u);
  P.lheel = 11 * toes; P.rheel = 11 * toes;
  P.lkx = -0.2; P.rkx = 0.2;
  P.hpitch = 0.05; P.smile = 0.8;
  return P;
}

// up on the toes, arms opening, chin lifting
function toeStand(b, P, s) {
  const lb = b - s;
  twoStep(b, 0.3, P);
  const e = easeOutBack(seg(lb, 0, 0.3), 1.6);
  P.lheel = lerp(P.lheel, 15, e); P.rheel = lerp(P.rheel, 15, e); P.py = lerp(P.py, 4, e);
  P.lfx = -12; P.rfx = 12;
  arm(P, 'M', lerp(P.mX, -30, e), lerp(P.mY, 24, e), lerp(P.mZ, 14, e), e);
  arm(P, 'F', lerp(P.fX, 30, e), lerp(P.fY, 24, e), lerp(P.fZ, 14, e), e);
  P.hpitch = lerp(P.hpitch, -0.14, e); P.smile = 0.8;
  return P;
}

// a shoulder pop and a point across the room
function popPoint(b, P, s) {
  const lb = b - s;
  twoStep(b, 0.7, P);
  const e = easeOutBack(seg(lb, 0.0, 0.25), 2.2) * (1 - smoothstep(1.4, 1.9, lb));
  arm(P, 'F', lerp(P.fX, 50, e), lerp(P.fY, 22, e), lerp(P.fZ, 22, e), 0, e);
  P.shF += 4 * bump(lb, 0.05, 0.1);
  P.hyaw = lerp(P.hyaw, 0.3, e); P.smile = 0.7; P.brow = 0.5 * e;
  return P;
}

// sideways glide: the pelvis is carried along by the path; the feet shuffle underneath
function glide(b, P, dir, b0) {
  twoStep(b, 0.25, P);
  stride(b, P, dir, 0, 5.5, b0, 0);
  P.lfy *= 0.35; P.rfy *= 0.35;
  arm(P, 'M', -26, -4 + 3 * Math.sin(TAU * b), 16, 0.6);
  arm(P, 'F', 28, 2 + 4 * Math.sin(Math.PI * b), 18, 0.8);
  P.hroll = 0.07 * Math.sin(Math.PI * b); P.hpitch = 0.08; P.smile = 0.6;
  return P;
}

// arms flung out on the beat: side is 'M' (screen left) or 'F' (screen right), s = first beat
function hits(b, P, s, side) {
  twoStep(b, 0.55, P);
  const k = Math.floor(b), u = b - k;
  const on = parity(k - s) === 0;
  const e = on ? easeOutBack(seg(u, 0, 0.22), 2.4) * (1 - smoothstep(0.7, 0.98, u)) : 0;
  const sg = side === 'M' ? -1 : 1;
  arm(P, side, lerp(P[side.toLowerCase() + 'X'], sg * 50, e), lerp(P[side.toLowerCase() + 'Y'], 24, e), lerp(P[side.toLowerCase() + 'Z'], 22, e), 0, side === 'F' ? e : 0);
  P.hyaw = lerp(P.hyaw, sg * 0.35, e); P.pyaw += sg * 0.25 * e; P.smile = 0.4;
  return P;
}

// the rest-of-the-line move: a finger snap by the shoulder on every beat
function snapStep(b, P) {
  twoStep(b, 0.55, P);
  const dp = dip(b), u = b - Math.floor(b);
  arm(P, 'F', 30, 9 + 3 * dp, 17, u > 0.72 ? lerp(1, 0.15, seg(u, 0.72, 0.95)) : smoothstep(0, 0.07, u) * 0.85 + 0.15, 0);
  P.fPole = 0.3; P.shF += 2 * bump(u, 0.02, 0.05);
  return P;
}

// both hands to the brim and hold
function handsToBrim(b, P, s, hold) {
  const lb = b - s;
  twoStep(b, 0.1 * (1 - smoothstep(0, 0.4, lb)), P);
  const e = easeOutBack(seg(lb, 0, 0.3), 1.6);
  arm(P, 'M', lerp(P.mX, -13, e), lerp(P.mY, 44, e), lerp(P.mZ, 15, e), e);
  arm(P, 'F', lerp(P.fX, 13, e), lerp(P.fY, 44, e), lerp(P.fZ, 15, e), e);
  P.hpitch = lerp(P.hpitch, 0.18, e); P.smile = 0.1; P.py = lerp(P.py, -5, e);
  return P;
}

// the feet: quick taps and slides on the eighth notes while the upper body stays cool
function taps(b, P) {
  twoStep(b, 0.35, P);
  const e = b * 2, k = Math.floor(e), u = e - k;
  const left = parity(k) === 0;
  const tap = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 1.5);
  P.lfx = -12; P.rfx = 12;
  if (left) { P.lheel = 16 * tap; P.lfy = 3 * tap; P.lfz = 4 * Math.sin(Math.PI * u); }
  else { P.rheel = 16 * tap; P.rfy = 3 * tap; P.rfz = 4 * Math.sin(Math.PI * u); }
  const sl = Math.sin(TAU * b * 0.5);
  P.lfx += 5 * sl; P.rfx += 5 * sl;
  arm(P, 'M', -24 + 6 * Math.sin(TAU * b), -8, 18, 0.5);
  arm(P, 'F', 24 - 6 * Math.sin(TAU * b), -8, 18, 0.5);
  P.hpitch = 0.12; P.smile = 0.7;
  return P;
}

// the lean: anchored feet, the whole body pivots forward far past where balance would allow.
// L runs 0..1; the body turns three-quarters so the tilt shows in profile
function lean(b, P, s) {
  const lb = b - s;
  const down = easeInOutCubic(seg(lb, 0, 1.3));
  const up = easeInOutCubic(seg(lb, 3.05, 3.4));
  const L = down * (1 - up);
  const yaw = 0.62 * L;
  const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
  twoStep(b, 0.15 * (1 - L), P);
  const reach = 27 * L;
  P.px = fx * reach; P.pz = fz * reach;
  P.py = -14 * L;
  P.pyaw = yaw; P.ppitch = 0.74 * L; P.proll = 0; P.croll = 0; P.cyaw = 0; P.cpitch = 0.12 * L + 0.03;
  // the feet stay where they were: wide, one slightly behind the other, toes pointing along the tilt
  const back = 8 + 10 * L;
  P.lfx = -12 * rx - fx * back; P.lfz = -12 * rz - fz * back;
  P.rfx = 12 * rx - fx * back * 0.6; P.rfz = 12 * rz - fz * back * 0.6;
  P.lfyaw = yaw - 0.1; P.rfyaw = yaw + 0.1;
  P.lheel = 0; P.rheel = 0; P.lfy = 0; P.rfy = 0; P.lkx = -0.15; P.rkx = 0.15;
  // eyes stay on us, chin up
  P.hyaw = -0.62 * L; P.hpitch = -0.62 * L; P.hroll = 0.05 * L;
  // arms hang straight down, one slightly back, fingers spread
  arm(P, 'M', lerp(P.mX, -22, L), lerp(P.mY, -32, L), lerp(P.mZ, 26, L), 0.8 * L);
  arm(P, 'F', lerp(P.fX, 24, L), lerp(P.fY, -30, L), lerp(P.fZ, 4, L), 0.8 * L);
  P.smile = lerp(0.4, 0.9, L);
  return P;
}

// ---------------------------------------------------------------- the lead
// where his pelvis is on the floor at beat b
function leadXZ(b) {
  if (b < 8) return [120, -175];
  if (b < 16) { const u = (b - 8) / 8; return [lerp(120, 0, u), lerp(-175, 30, u)]; }
  if (b < 24) return [0, 30];
  if (b < 28) return [lerp(0, -46, (b - 24) / 4), 30];
  if (b < 32) return [lerp(-46, 0, (b - 28) / 4), 30];
  if (b < 40) return [0, 30];
  if (b < 48) return [0, 30 + 26 * smoothstep(40, 41.5, b) * (1 - smoothstep(46.5, 48, b))];
  return [0, 30];
}
const LEAD_SECTIONS = [
  { b: -1, f: (b, P) => idle(b, P, 0.12) },
  { b: 5.5, f: (b, P, s) => hatTip(b, P, 6.2, 0.12) },
  { b: 8, f: (b, P, s) => { const [x0, z0] = [120, -175], d = vnorm(V(-120, 0, 205)); return stride(b, P, d.x, d.z, 14.5, 8); } },
  { b: 15.5, f: (b, P) => { twoStep(b, lerp(0.15, 0.7, seg(b, 15.5, 16.5)), P); return P; } },
  { b: 16, f: (b, P) => popPoint(b, P, 16.5) },
  { b: 19, f: (b, P) => hatTip(b, P, 19.4, 0.8) },
  { b: 20, f: (b, P) => spin(b, P, 20.3) },
  { b: 22, f: (b, P) => toeStand(b, P, 22.3) },
  { b: 24, f: (b, P) => glide(b, P, -1, 24) },
  { b: 28, f: (b, P) => glide(b, P, 1, 28) },
  { b: 32, f: (b, P) => hits(b, P, 32, 'F') },
  { b: 36, f: (b, P) => spin(b, P, 36.2) },
  { b: 38, f: (b, P) => popPoint(b, P, 38.4) },
  { b: 40, f: (b, P) => taps(b, P) },
  { b: 47.5, f: (b, P) => crouchPop(b, P, 47.9) },
  { b: 48.4, f: (b, P) => handsToBrim(b, P, 48.5) },
  { b: 50, f: (b, P) => lean(b, P, 50) },
  { b: 53.6, f: (b, P) => hatTip(b, P, 53.7, 0.05) }
];
function sectionPose(list, b, i) {
  const S = list[i];
  return S.f(b, basePose(), S.b);
}
function leadAt(b) {
  const list = LEAD_SECTIONS;
  let i = 0;
  while (i + 1 < list.length && b >= list[i + 1].b) i++;
  let P = sectionPose(list, b, i);
  if (i > 0 && b < list[i].b + 0.3) P = lerpPose(sectionPose(list, b, i - 1), P, smoothstep(list[i].b - 0.2, list[i].b + 0.3, b));
  if (i + 1 < list.length && b > list[i + 1].b - 0.3) P = lerpPose(P, sectionPose(list, b, i + 1), smoothstep(list[i + 1].b - 0.3, list[i + 1].b + 0.2, b));
  const [x, z] = leadXZ(b);
  place(P, x, z);
  P.hat = 1;
  P.blink = Math.max(P.blink || 0, naturalBlink(b));
  return P;
}
function naturalBlink(b) {
  const k = Math.floor(b / 2.7);
  return bump(b, k * 2.7 + 0.4 + hash(k * 7.7) * 1.8, 0.045);
}

// ---------------------------------------------------------------- the line of dancers
const ENS = [
  { style: 'a', slot: [-104, -48], from: [-440, -48], t0: 18, side: 'M', yaw: 0.18 },
  { style: 'b', slot: [-60, -112], from: [-440, -112], t0: 19, side: 'M', yaw: 0.1 },
  { style: 'c', slot: [104, -48], from: [440, -48], t0: 18.5, side: 'F', yaw: -0.18 },
  { style: 'd', slot: [60, -112], from: [440, -112], t0: 19.5, side: 'F', yaw: -0.1 }
];
const ENS_ARRIVE = 26;
function ensAt(b, e) {
  const [x0, z0] = e.from, [x1, z1] = e.slot;
  let P;
  if (b < ENS_ARRIVE + 0.5) {
    const u = clamp((b - e.t0) / (ENS_ARRIVE - e.t0), 0, 1);
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz);
    const speed = len / (ENS_ARRIVE - e.t0);
    P = stride(b, basePose(), dx / len, dz / len, u > 0 && u < 1 ? speed / 2 : 0.001, e.t0);
    if (u <= 0 || u >= 1) { twoStep(b, u >= 1 ? 0.55 : 0.1, P); }
    place(P, lerp(x0, x1, u), lerp(z0, z1, u));
    if (b > ENS_ARRIVE - 0.4) {
      const Q = place(sectionEns(b, e), x1, z1);
      P = lerpPose(P, Q, smoothstep(ENS_ARRIVE - 0.4, ENS_ARRIVE + 0.4, b));
    }
  } else {
    P = place(sectionEns(b, e), x1, z1);
  }
  P.hat = 1;
  P.blink = Math.max(P.blink || 0, naturalBlink(b + e.t0));
  return P;
}
function sectionEns(b, e) {
  const P = basePose();
  const yaw = e.yaw;
  if (b < 32) snapStep(b, P);
  else if (b < 36) hits(b, P, 32, e.side);
  else if (b < 40) { twoStep(b, 0.7, P); arm(P, 'M', 10, -2, 22, 0.5); arm(P, 'F', -10, 0, 24, 0.5); P.mX = 10; P.fX = -10; }
  else if (b < 48) snapStep(b, P);
  else if (b < 50) handsToBrim(b, P, 48.5);
  else { handsToBrim(50, P, 48.5); P.hyaw = -Math.sign(e.slot[0]) * 0.55; P.smile = 0.2; }
  P.pyaw += yaw;
  return P;
}

// ---------------------------------------------------------------- the cast at time t
function castAt(t) {
  const b = t / BEAT;
  const out = [{ id: 'lead', style: STYLES.lead, P: leadAt(b) }];
  ENS.forEach((e, i) => out.push({ id: 'e' + i, style: STYLES[e.style], P: ensAt(b, e) }));
  for (const c of out) c.J = solveRig(c.P);
  return out;
}
