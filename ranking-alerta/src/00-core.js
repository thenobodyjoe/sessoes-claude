"use strict";
// ============================================================
// Ranking dos Políticos: "Alerta" (vertical 1080x1920, ~65 s, cut to a voice-over).
// Two worlds: a dark, red "emergency broadcast" where the politicians are wolves in sheep's
// clothing, and the brand world of the Ranking (navy, yellow, white) where the light comes on.
// ============================================================
const W = 1080, H = 1920;
const TAU = Math.PI * 2;

// The piece is a pure function of t (seconds) on the same clock as narracao.mp3 (65.36 s).
const DUR = 65.36;
let FAST = false;     // live playback: allow cached bitmaps where they are indistinguishable
// phrases of the voice-over [start, end] (ffmpeg silencedetect); the music ducks under each one
const VO = [[0.06, 2.69], [3.05, 4.53], [4.69, 6.10], [6.51, 9.56], [10.07, 13.18], [13.70, 15.74], [15.96, 18.29],
  [18.55, 21.17], [21.40, 22.65], [22.89, 23.56], [23.78, 25.45], [25.81, 27.70], [27.93, 29.56], [29.73, 32.13],
  [32.50, 34.88], [35.17, 37.88], [38.31, 41.43], [41.77, 43.14], [43.30, 44.06], [44.23, 45.34], [45.49, 47.07],
  [47.27, 48.78], [48.99, 50.23], [50.42, 51.52], [51.69, 52.77], [53.12, 55.04], [55.35, 59.01], [59.32, 61.01], [61.29, 65.26]];
// scene cuts, each in a pause of the voice
const SC = { chamado: 0, palco: 9.85, congresso: 13.62, sorrisos: 25.63, mascaras: 32.32, virada: 38.1, nota: 41.75, tempo: 52.95, fim: 59.17 };

// the dark world
const D = {
  void: '#050203', ink: '#0E0506', deep: '#1A0709', blood: '#4A0A10', wine: '#7A0F18',
  red: '#E3202C', hot: '#FF3040', ember: '#FF6A3D', bone: '#F2E6DE', ash: '#9A807A', smoke: '#3A2427',
  lamb: '#3DE38A', lambGlow: '#7DFFB4',
};
// the Ranking's world
const C = {
  ink: '#060A22', navy: '#0B1440', navy2: '#13205C', deep: '#040716',
  blue: '#2F5BFF', sky: '#8FA8FF', green: '#16C66E', yellow: '#FFD23F', red: '#FF4D5E',
  white: '#FFFFFF', mute: '#A7B2DD', paper: '#F4F6FC', line: '#DCE2F2', text: '#101A46',
};

const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (x, a, b) => clamp((x - a) / (b - a), 0, 1);
const smoothstep = (e0, e1, x) => { const t = seg(x, e0, e1); return t * t * (3 - 2 * t); };
const hash = n => { const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
function mulberry(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const E = {
  lin: t => t,
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s) => { const c = s === undefined ? 1.70158 : s; t -= 1; return t * t * ((c + 1) * t + c) + 1; },
  inBack: (t, s) => { const c = s === undefined ? 1.70158 : s; return t * t * ((c + 1) * t - c); },
};
const pr = (b, b0, b1, e) => (e || E.outExpo)(seg(b, b0, b1));
const kick = (b, b0, rate) => (b < b0 ? 0 : Math.exp(-(b - b0) * (rate || 6)));

function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const _rgb = new Map();
function rgbOf(h) { let v = _rgb.get(h); if (!v) { v = hexRgb(h); _rgb.set(h, v); } return v; }
function mix(a, b, t) {
  const x = rgbOf(a), y = rgbOf(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
}
function rgba(h, a) { const x = rgbOf(h); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; }
// position along keyed points [[t, x, y], ...] on gentle arcs
function pathAt(keys, t, e) {
  if (t <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const k0 = keys[i - 1], k1 = keys[i];
    if (t <= k1[0]) {
      const u = (e || E.inOutCubic)(seg(t, k0[0], k1[0]));
      const mx = (k0[1] + k1[1]) / 2 + (k1[2] - k0[2]) * 0.18, my = (k0[2] + k1[2]) / 2 - (k1[1] - k0[1]) * 0.18;
      return [(1 - u) * (1 - u) * k0[1] + 2 * (1 - u) * u * mx + u * u * k1[1], (1 - u) * (1 - u) * k0[2] + 2 * (1 - u) * u * my + u * u * k1[2]];
    }
  }
  const k = keys[keys.length - 1];
  return [k[1], k[2]];
}
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
