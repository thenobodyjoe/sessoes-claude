"use strict";
// ============================================================
// Ranking dos Políticos: a 15-second vertical motion piece (1080x1920).
// 8 bars of 4/4 at 128 BPM = 32 beats = exactly 15.0 s. Everything is a pure function of time,
// so the same code plays live in the browser and renders frame by frame to video.
// ============================================================
const W = 1080, H = 1920;
const TAU = Math.PI * 2;
const BPM = 128;
const BEAT = 60 / BPM;
const DUR = 32 * BEAT;
const REDUCED = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

// Scene cuts, in beats. The middle of the piece is phrased in groups of three beats (a hemiola against
// the 4/4 drums), so the cuts at 11, 14 and 17 land off the bar line and push the edit forward.
const SC = { hook: 0, flag: 4, hemi: 8, ui: 11, crit: 14, clock: 17, urna: 20, confirm: 22, logo: 24, cta: 28, end: 32 };

// Brand palette. The logo is white on transparent, so the colour lives in the backgrounds and accents.
const C = {
  ink: '#060A22', navy: '#0B1440', navy2: '#13205C', deep: '#040716',
  blue: '#2F5BFF', sky: '#8FA8FF', green: '#16C66E', yellow: '#FFD23F', red: '#FF4D5E', orange: '#F28C28',
  white: '#FFFFFF', mute: '#A7B2DD', paper: '#F4F6FC', line: '#DCE2F2', text: '#101A46',
  flagGreen: '#009C3B', flagYellow: '#FEDF00', flagBlue: '#002776', concrete: '#EEF1F8', beige: '#E8E2D2'
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

// ---------- easing
const E = {
  lin: t => t,
  inCubic: t => t * t * t,
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outQuint: t => 1 - Math.pow(1 - t, 5),
  inOutQuint: t => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  inExpo: t => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  outExpo: t => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutExpo: t => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t, s) => { const c = s === undefined ? 1.70158 : s; t -= 1; return t * t * ((c + 1) * t + c) + 1; },
  inBack: (t, s) => { const c = s === undefined ? 1.70158 : s; return t * t * ((c + 1) * t - c); },
  outElastic: t => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (TAU / 3)) + 1),
  // an underdamped spring settling on 1
  spring: (t, k, d) => (t <= 0 ? 0 : 1 - Math.exp(-(d || 7) * t) * Math.cos((k || 16) * t)),
};
// progress of beat b through [b0, b1], eased
const pr = (b, b0, b1, e) => (e || E.outExpo)(seg(b, b0, b1));
// an exponentially decaying kick after beat b0 (0 before it)
const kick = (b, b0, rate) => (b < b0 ? 0 : Math.exp(-(b - b0) * (rate || 6)));

// ---------- colour
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const _rgbCache = new Map();
function rgbOf(h) { let v = _rgbCache.get(h); if (!v) { v = hexRgb(h); _rgbCache.set(h, v); } return v; }
function mix(a, b, t) {
  const x = rgbOf(a), y = rgbOf(b);
  return `rgb(${Math.round(lerp(x[0], y[0], t))},${Math.round(lerp(x[1], y[1], t))},${Math.round(lerp(x[2], y[2], t))})`;
}
function rgba(h, a) { const x = rgbOf(h); return `rgba(${x[0]},${x[1]},${x[2]},${a})`; }

// ---------- 2D helpers
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
// cubic bezier through keyframes [[b, x, y], ...] with ease between them (for the pointer)
function pathAt(keys, b, e) {
  if (b <= keys[0][0]) return [keys[0][1], keys[0][2]];
  for (let i = 1; i < keys.length; i++) {
    const k0 = keys[i - 1], k1 = keys[i];
    if (b <= k1[0]) {
      const u = (e || E.inOutCubic)(seg(b, k0[0], k1[0]));
      // a slight arc so moves never look robotic
      const mx = (k0[1] + k1[1]) / 2 + (k1[2] - k0[2]) * 0.18, my = (k0[2] + k1[2]) / 2 - (k1[1] - k0[1]) * 0.18;
      const x = (1 - u) * (1 - u) * k0[1] + 2 * (1 - u) * u * mx + u * u * k1[1];
      const y = (1 - u) * (1 - u) * k0[2] + 2 * (1 - u) * u * my + u * u * k1[2];
      return [x, y];
    }
  }
  const k = keys[keys.length - 1];
  return [k[1], k[2]];
}
