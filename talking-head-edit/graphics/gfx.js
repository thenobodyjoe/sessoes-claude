// Motion graphics for the Talking Head edit.
// Two layers: "behind" is composited between the backdrop and the presenter's
// matte, "front" goes over everything. renderFrame() accumulates sub-frames
// for a 180-degree shutter motion blur.
const W = 1920, H = 1080;
const INK = '#0E0F11', PAPER = '#F2EFEA', ACC = '#FF5A1F';
const SERIF = '"Instrument Serif"', SANS = '"Inter Tight"';

const out = document.getElementById('out');
const OX = out.getContext('2d');
const scratch = document.createElement('canvas');
scratch.width = W; scratch.height = H;
const SX = scratch.getContext('2d');
const TL = window.TL;

// ---------- timing ----------
function wt(key, n = 1, edge = 's') {
  let c = 0;
  for (const w of TL.words) if (w.key === key && ++c === n) return w[edge];
  throw new Error('word ' + key + ' #' + n);
}
const clamp = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => clamp((t - t0) / d);
const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
const ci = (x) => x * x * x;
const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const bo = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
const lerp = (a, b, x) => a + (b - a) * x;

// ---------- drawing primitives ----------
let drew = false;
const font = (fam, size, w = 400, it = false) => `${it ? 'italic ' : ''}${w} ${size}px ${fam}`;

function measure(ctx, s, f, track = 0) {
  ctx.save();
  ctx.font = f; ctx.letterSpacing = track + 'px';
  const m = ctx.measureText(s).width - track; // no trailing tracking
  ctx.restore();
  return m;
}

// o: {font, color, alpha, align, track, blur, scale, ox, oy, rot, stroke, shadow}
function text(ctx, s, x, y, o) {
  const a = o.alpha ?? 1;
  if (a <= 0.004) return;
  drew = true;
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = o.font;
  ctx.letterSpacing = (o.track ?? 0) + 'px';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const w = measure(ctx, s, o.font, o.track ?? 0);
  let lx = x;
  if (o.align === 'center') lx = x - w / 2;
  else if (o.align === 'right') lx = x - w;
  if (o.blur > 0.3) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
  if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 2; }
  const sc = o.scale ?? 1, rot = o.rot ?? 0;
  if (sc !== 1 || rot) {
    const ox = o.ox ?? lx + w / 2, oy = o.oy ?? y;
    ctx.translate(ox, oy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-ox, -oy);
  }
  if (o.stroke) { ctx.strokeStyle = o.color ?? PAPER; ctx.lineWidth = o.stroke; ctx.strokeText(s, lx, y); }
  else { ctx.fillStyle = o.color ?? PAPER; ctx.fillText(s, lx, y); }
  ctx.restore();
  return w;
}

// Text rising out of an invisible slot (clip box) — the classic editorial reveal.
function slot(ctx, s, x, y, size, o, p) {
  if (p <= 0) return;
  const w = measure(ctx, s, o.font, o.track ?? 0);
  let lx = x;
  if (o.align === 'center') lx = x - w / 2;
  else if (o.align === 'right') lx = x - w;
  ctx.save();
  ctx.beginPath();
  ctx.rect(lx - 40, y - size * 1.08, w + 80, size * 1.42);
  ctx.clip();
  text(ctx, s, x, y + (1 - p) * size * 1.15, { ...o, alpha: (o.alpha ?? 1) * clamp(p * 1.6) });
  ctx.restore();
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ---------- scenes ----------
const BIG_W = 1720;
function bigSize(ctx, s) {
  const f = (sz) => font(SANS, sz, 800);
  return 100 * BIG_W / measure(ctx, s, f(100), -2);
}

// 1. "WELCOME TO THE / MASTERCLASS" — giant word behind the presenter.
function sMasterclass(ctx, t, outline) {
  const t0 = 0.08, tx = wt('this') - 0.12;
  if (t > tx + 0.6) return;
  const size = bigSize(ctx, 'MASTERCLASS');
  const pin = eo(pr(t, t0, 1.2)), pout = ci(pr(t, tx, 0.5));
  const track = lerp(0.14, -0.02, pin) * size;
  const base = 330 + 0.365 * size - pout * 70;
  const alpha = clamp(pr(t, t0, 0.5)) * (1 - pout);
  const o = {
    font: font(SANS, size, 800), align: 'center', track,
    alpha: outline ? alpha * 0.14 : alpha, blur: (1 - pin) * 14 + pout * 16,
    scale: lerp(1.16, 1, pin), ox: 960, oy: base - size * 0.36,
    stroke: outline ? 1.8 : 0,
  };
  text(ctx, 'MASTERCLASS', 960, base, o);
  if (outline) return;
  const left = 960 - measure(ctx, 'MASTERCLASS', o.font, -0.02 * size) / 2;
  const kp = eo(pr(t, wt('welcome') - 0.05, 0.7));
  slot(ctx, 'WELCOME TO THE', left + 6, base - size * 0.73 - 34, 26,
    { font: font(SANS, 26, 600), track: 11, color: ACC, alpha: 1 - pout }, kp);
}

// 2. Title block: "How to build a / Successful / Coaching / Practice."
function sTitle(ctx, t) {
  const tIn = wt('masterclass', 2) - 0.05, tOut = wt('practice', 1, 'e') + 0.06;
  if (t < tIn || t > tOut + 0.8) return;
  const x = 112;
  const ex = (k) => ci(pr(t, tOut + k * 0.05, 0.4));
  const lineO = (k, o) => ({ ...o, alpha: (o.alpha ?? 1) * (1 - ex(k)), blur: ex(k) * 10 });
  const dx = (k) => -70 * ex(k);

  slot(ctx, 'THE MASTERCLASS', x + dx(0), 205, 22,
    lineO(0, { font: font(SANS, 22, 600), track: 9, color: ACC }), eo(pr(t, tIn, 0.7)));

  const f1 = font(SANS, 44, 500);
  let cx = x;
  for (const k of ['how', 'to', 'build', 'a']) {
    const s = k === 'how' ? 'How' : k;
    const ts = k === 'to' ? wt('to', 2) : wt(k);
    slot(ctx, s, cx + dx(1), 270, 44, lineO(1, { font: f1, color: PAPER, alpha: 0.8 }), eo(pr(t, ts - 0.04, 0.55)));
    cx += measure(ctx, s + ' ', f1);
  }
  const fs = font(SERIF, 120, 400, true), fr = font(SERIF, 120, 400);
  const ts = wt('successful');
  slot(ctx, 'Successful', x + dx(2), 382, 120, lineO(2, { font: fs, color: ACC }), eo(pr(t, ts - 0.04, 0.65)));
  // hand-drawn underline
  const up = io(pr(t, ts + 0.18, 0.5)) * (1 - ex(2));
  if (up > 0) {
    const w = measure(ctx, 'Successful', fs);
    ctx.save();
    ctx.globalAlpha = 1 - ex(2);
    ctx.strokeStyle = ACC; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath();
    const x0 = x + dx(2), steps = 40;
    for (let i = 0; i <= steps * up; i++) {
      const u = i / steps;
      const px = x0 + 6 + u * (w - 6), py = 406 + Math.sin(u * Math.PI) * 7 - u * 6;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke(); ctx.restore(); drew = true;
  }
  slot(ctx, 'Coaching', x + dx(3), 490, 120, lineO(3, { font: fr, color: PAPER }), eo(pr(t, wt('coaching') - 0.04, 0.65)));
  slot(ctx, 'Practice.', x + dx(4), 598, 120, lineO(4, { font: fr, color: PAPER }), eo(pr(t, wt('practice') - 0.04, 0.65)));
}

// 3. Name title: Eric Edmeades / YOUR HOST
function sName(ctx, t) {
  const t0 = wt('my'), tOut = TL.words.find((w) => w.key === 'excited' && w.s > 9).s + 0.02;
  if (t < t0 || t > tOut + 0.6) return;
  const x = 112;
  const po = ci(pr(t, tOut, 0.4));
  const lw = 380 * eo(pr(t, t0, 0.8));
  const lx0 = x + 380 * po;
  if (lw > lx0 - x) {
    ctx.save(); ctx.fillStyle = ACC; ctx.fillRect(lx0, 452, Math.max(0, x + lw - lx0), 3); ctx.restore(); drew = true;
  }
  const pn = eo(pr(t, wt('eric') - 0.06, 0.75)) * (1 - po);
  slot(ctx, 'Eric Edmeades', x, 425, 100, { font: font(SERIF, 100), color: PAPER }, pn);
  const ph = eo(pr(t, wt('your') - 0.05, 0.6)) * (1 - po);
  slot(ctx, 'YOUR HOST', x + 2, 500, 22, { font: font(SANS, 22, 600), track: 9, color: PAPER, alpha: 0.75 }, ph);
}

// 4. "you're / curious / or intrigued?" on the right of the punch-in.
function sCurious(ctx, t) {
  const tc = wt('curious'), tOut = wt('either');
  if (t < tc - 0.15 || t >= tOut) return;
  const x = 1196;
  slot(ctx, "YOU'RE", x + 4, 268, 22, { font: font(SANS, 22, 600), track: 9, color: PAPER, alpha: 0.75 },
    eo(pr(t, wt("you're", 2) - 0.05, 0.6)));
  const p = eo(pr(t, tc - 0.04, 0.7));
  text(ctx, 'curious', x, 425, {
    font: font(SERIF, 176, 400, true), color: ACC, alpha: clamp(pr(t, tc - 0.04, 0.25)),
    blur: (1 - p) * 14, scale: lerp(1.22, 1, p), ox: x, oy: 380,
  });
  const f2 = font(SERIF, 96);
  slot(ctx, 'or', x, 530, 96, { font: f2, color: PAPER, alpha: 0.85 }, eo(pr(t, wt('or') - 0.04, 0.55)));
  const xi = x + measure(ctx, 'or ', f2);
  slot(ctx, 'intrigued', xi, 530, 96, { font: f2, color: PAPER, alpha: 0.85 }, eo(pr(t, wt('intrigued') - 0.04, 0.6)));
  const q = pr(t, wt('intrigued', 1, 'e') - 0.08, 0.5);
  if (q > 0) {
    const xq = xi + measure(ctx, 'intrigued', f2) + 8;
    text(ctx, '?', xq, 530, {
      font: font(SERIF, 96, 400, true), color: ACC, alpha: clamp(q * 3),
      scale: Math.max(0, bo(q)), rot: (1 - eo(q)) * -0.9, ox: xq + 20, oy: 500,
    });
  }
}

// 5. Two option cards: growing a practice / starting one.
function checkCard(ctx, x, y, w, h, label, main, pIn, pChk, pOut) {
  const a = clamp(pIn * 1.4) * (1 - pOut);
  if (a <= 0.004) return;
  drew = true;
  const dy = (1 - pIn) * 40 + pOut * 26;
  const sc = lerp(0.95, 1, pIn);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x + w / 2, y + h / 2 + dy); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  rrect(ctx, x, y, w, h, 24); ctx.fillStyle = 'rgba(14,15,17,0.78)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(242,239,234,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
  // check circle
  const cx = x + 62, cy = y + h / 2, r = 28;
  const pc = eo(pChk);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = pChk > 0 ? ACC : 'rgba(242,239,234,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
  if (pChk > 0) {
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(bo(clamp(pChk * 1.4)), bo(clamp(pChk * 1.4))); ctx.translate(-cx, -cy);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill();
    ctx.restore();
    const pts = [[-11, 1], [-3, 9], [12, -8]];
    const L1 = Math.hypot(8, 8), L2 = Math.hypot(15, 17), L = (L1 + L2) * clamp((pc - 0.2) / 0.8);
    ctx.beginPath(); ctx.moveTo(cx + pts[0][0], cy + pts[0][1]);
    if (L <= L1) ctx.lineTo(cx + pts[0][0] + 8 * L / L1, cy + pts[0][1] + 8 * L / L1);
    else { ctx.lineTo(cx + pts[1][0], cy + pts[1][1]); const u = (L - L1) / L2; ctx.lineTo(cx + pts[1][0] + 15 * u, cy + pts[1][1] - 17 * u); }
    ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  }
  ctx.font = font(SANS, 18, 600); ctx.letterSpacing = '5px'; ctx.fillStyle = 'rgba(242,239,234,0.62)';
  ctx.fillText(label, x + 114, y + 60);
  ctx.font = font(SERIF, 54); ctx.letterSpacing = '0px'; ctx.fillStyle = PAPER;
  ctx.fillText(main, x + 112, y + 112);
  ctx.restore();
}
function sCards(ctx, t) {
  const t1 = wt('growing'), t2 = wt('or', 2), tOut = wt('and', 3) + 0.02;
  if (t < t1 - 0.1 || t > tOut + 0.6) return;
  const w = 600, h = 150, y = 250;
  checkCard(ctx, 112, y, w, h, 'ALREADY COACHING', 'Growing your practice',
    eo(pr(t, t1 - 0.06, 0.65)), pr(t, wt('practice', 2) + 0.05, 0.45), ci(pr(t, tOut, 0.4)));
  checkCard(ctx, W - 112 - w, y, w, h, 'JUST GETTING STARTED', 'Starting one',
    eo(pr(t, t2 - 0.06, 0.65)), pr(t, wt('one') + 0.02, 0.45), ci(pr(t, tOut + 0.06, 0.4)));
}

// 6. YOU (behind) & (front, accent) I (behind)
function sYouAndI(ctx, t, layer) {
  const c0 = TL.cuts[1], c1 = TL.cuts[2];
  if (t < c0 || t >= c1) return;
  const pop = (ts) => eo(pr(t, ts - 0.04, 0.6));
  if (layer === 'behind') {
    const f = font(SANS, 300, 800);
    const pY = pop(wt('you', 2)), pI = pop(wt('i'));
    const yo = (p) => ({ font: f, track: -6, color: PAPER, alpha: clamp(p * 2.5), blur: (1 - p) * 16, scale: lerp(1.3, 1, p) });
    text(ctx, 'YOU', 738, 480, { ...yo(pY), align: 'right', ox: 738 - 290, oy: 370 });
    text(ctx, 'I', 1188, 480, { ...yo(pI), ox: 1230, oy: 370 });
  } else {
    const q = pr(t, wt('and', 4) - 0.04, 0.55);
    if (q > 0) text(ctx, '&', 960, 790, {
      font: font(SERIF, 250, 400, true), color: ACC, align: 'center', alpha: clamp(q * 3),
      scale: Math.max(0, bo(q, 1.3)), rot: (1 - eo(q)) * -0.35, ox: 960, oy: 700,
    });
  }
}

// 7. HELP PEOPLE — per-letter rise behind the presenter, outline hint in front.
function sHelp(ctx, t, outline) {
  const t1 = wt('help'), t2 = wt('people'), tOut = wt('people', 2) - 0.02;
  if (t < t1 - 0.1 || t > tOut + 0.8) return;
  const s = 'HELP PEOPLE';
  const size = bigSize(ctx, s);
  const f = font(SANS, size, 800), track = -0.02 * size;
  const total = measure(ctx, s, f, track);
  const x0 = 960 - total / 2, base = 332 + 0.365 * size;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === ' ') continue;
    const ts = (i < 4 ? t1 + i * 0.03 : t2 + (i - 5) * 0.03) - 0.05;
    const p = eo(pr(t, ts, 0.6));
    const po = ci(pr(t, tOut + (s.length - i) * 0.01, 0.3));
    const a = clamp(pr(t, ts, 0.2)) * (1 - po);
    const x = x0 + measure(ctx, s.slice(0, i), f, track) + (i ? track : 0);
    text(ctx, s[i], x, base + (1 - p) * 110 - po * 90, {
      font: f, color: PAPER, alpha: outline ? a * 0.14 : a, blur: (1 - p) * 10 + po * 14,
      stroke: outline ? 1.8 : 0,
    });
  }
}

// 8. Growth chart behind + "Better results / Better performance" chips in front.
const PATH = [[110, 940], [330, 880], [520, 905], [700, 790], [880, 815], [1060, 660], [1230, 690], [1400, 520], [1570, 470], [1810, 215]];
function sGraph(ctx, t) {
  const tg = wt('have', 2), tOut = wt('maybe') + 0.28;
  if (t < tg - 0.1 || t > tOut + 0.6) return;
  const fade = 1 - ci(pr(t, tOut, 0.45));
  const g = clamp(pr(t, tg - 0.1, 0.5)) * fade;
  drew = true;
  ctx.save();
  ctx.globalAlpha = g * 0.07; ctx.strokeStyle = PAPER; ctx.lineWidth = 1;
  for (let x = 160; x < W; x += 160) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 980); ctx.stroke(); }
  for (let y = 190; y < 1000; y += 130) { ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(1830, y); ctx.stroke(); }
  ctx.restore();

  const p = io(pr(t, tg + 0.05, 1.6));
  const segs = []; let L = 0;
  for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); segs.push(l); L += l; }
  let rem = L * p; const pts = [PATH[0]];
  for (let i = 1; i < PATH.length && rem > 0; i++) {
    const u = Math.min(1, rem / segs[i - 1]);
    pts.push([lerp(PATH[i - 1][0], PATH[i][0], u), lerp(PATH[i - 1][1], PATH[i][1], u)]);
    rem -= segs[i - 1];
  }
  const dy = (1 - fade) * 30;
  ctx.save();
  ctx.translate(0, dy);
  ctx.globalAlpha = fade;
  // area under the curve
  const grad = ctx.createLinearGradient(0, 200, 0, 1000);
  grad.addColorStop(0, 'rgba(255,90,31,0.28)'); grad.addColorStop(1, 'rgba(255,90,31,0)');
  ctx.beginPath(); ctx.moveTo(pts[0][0], 1000);
  for (const q of pts) ctx.lineTo(q[0], q[1]);
  ctx.lineTo(pts[pts.length - 1][0], 1000); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
  ctx.strokeStyle = ACC; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255,90,31,0.8)'; ctx.shadowBlur = 24; ctx.stroke();
  ctx.shadowBlur = 0;
  const hd = pts[pts.length - 1];
  if (p < 1) {
    ctx.beginPath(); ctx.arc(hd[0], hd[1], 10, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill();
    ctx.beginPath(); ctx.arc(hd[0], hd[1], 22, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(242,239,234,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  } else {
    const a = Math.atan2(PATH[9][1] - PATH[8][1], PATH[9][0] - PATH[8][0]);
    const ap = bo(pr(t, tg + 1.65, 0.4));
    ctx.translate(hd[0], hd[1]); ctx.rotate(a); ctx.scale(ap, ap);
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-18, -16); ctx.lineTo(-10, 0); ctx.lineTo(-18, 16); ctx.closePath();
    ctx.fillStyle = ACC; ctx.fill();
  }
  ctx.restore();
}
function chip(ctx, x, y, label, p, align) {
  const a = clamp(p * 2);
  if (a <= 0.004) return;
  drew = true;
  const f = font(SANS, 30, 600);
  const w = 74 + measure(ctx, label, f) + 30, h = 68;
  const lx = align === 'right' ? x - w : x;
  const s = Math.max(0, bo(p, 1.4));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(lx + (align === 'right' ? w : 0), y + h / 2); ctx.scale(s, s); ctx.translate(-(lx + (align === 'right' ? w : 0)), -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rrect(ctx, lx, y, w, h, h / 2); ctx.fillStyle = PAPER; ctx.fill();
  ctx.shadowColor = 'transparent';
  const cx = lx + 36, cy = y + h / 2;
  ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill();
  ctx.strokeStyle = PAPER; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 10); ctx.moveTo(cx - 8, cy - 2); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 8, cy - 2); ctx.stroke();
  ctx.font = f; ctx.fillStyle = INK; ctx.fillText(label, lx + 72, y + 44);
  ctx.restore();
}
function sChips(ctx, t) {
  const tOut = wt('maybe') + 0.28;
  if (t < wt('results') - 0.2 || t > tOut + 0.6) return;
  const po = ci(pr(t, tOut, 0.35));
  const k = (ts) => eo(pr(t, ts - 0.06, 0.5)) * (1 - po);
  chip(ctx, 112, 560, 'Better results', k(wt('results')), 'left');
  chip(ctx, W - 112, 300, 'Better performance', k(wt('performance')), 'right');
}

// 9. Life-area pills stacked on the left, carried across the cut to the close-up.
const ICONS = {
  business(ctx, cx, cy) {
    rrect(ctx, cx - 12, cy - 6, 24, 16, 3); ctx.stroke();
    rrect(ctx, cx - 5, cy - 11, 10, 5, 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx - 12, cy + 1); ctx.lineTo(cx + 12, cy + 1); ctx.stroke();
  },
  health(ctx, cx, cy) {
    ctx.beginPath();
    [[-13, 1], [-6, 1], [-3, -8], [2, 9], [5, 1], [13, 1]].forEach(([x, y], i) => (i ? ctx.lineTo(cx + x, cy + y) : ctx.moveTo(cx + x, cy + y)));
    ctx.stroke();
  },
  heart(ctx, cx, cy) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + 10);
    ctx.bezierCurveTo(cx - 16, cy - 1, cx - 9, cy - 14, cx, cy - 6);
    ctx.bezierCurveTo(cx + 9, cy - 14, cx + 16, cy - 1, cx, cy + 10);
    ctx.stroke();
  },
  family(ctx, cx, cy) {
    ctx.beginPath(); ctx.arc(cx - 5, cy - 7, 4, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx - 5, cy + 11, 9, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 8, cy - 1, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + 8, cy + 12, 6.5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
  },
};
function pill(ctx, x, y, label, icon, pIn, dim, pOut) {
  const a = clamp(pIn * 1.8) * (1 - pOut) * lerp(1, 0.5, dim);
  if (a <= 0.004) return;
  drew = true;
  const f = font(SANS, 34, 600);
  const h = 86, w = 96 + measure(ctx, label, f) + 38;
  const s = lerp(0.9, 1, pIn);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.translate(x - (1 - pIn) * 50 - pOut * 70, 0);
  ctx.translate(x, y + h / 2); ctx.scale(s, s); ctx.translate(-x, -(y + h / 2));
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10;
  rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(14,15,17,0.8)'; ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(242,239,234,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
  const cx = x + 45, cy = y + h / 2;
  ctx.beginPath(); ctx.arc(cx, cy, 31, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill();
  ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1.12, 1.12); ctx.translate(-cx, -cy); ICONS[icon](ctx, cx, cy); ctx.restore();
  ctx.font = f; ctx.fillStyle = PAPER; ctx.fillText(label, x + 96, y + 55);
  ctx.restore();
}
function sPills(ctx, t) {
  const items = [
    ['Business', 'business', wt('business')],
    ['Health & Fitness', 'health', wt('health')],
    ['Relationships', 'heart', wt('relationship')],
    ['Parenting', 'family', wt('parenting')],
  ];
  const tOut = TL.cuts[4] - 0.16;
  if (t < items[0][2] - 0.1 || t > tOut + 0.7) return;
  items.forEach(([label, icon, ts], i) => {
    const next = items[i + 1] ? items[i + 1][2] : Infinity;
    pill(ctx, 112, 214 + i * 106, label, icon,
      eo(pr(t, ts - 0.06, 0.55)), io(pr(t, next - 0.06, 0.3)) * 0.9, ci(pr(t, tOut + i * 0.05, 0.32)));
  });
}

// 10. Warm backdrop glow + "a better / Quality  of Life" typed behind him.
function sQuality(ctx, t) {
  const c = TL.cuts[4];
  if (t < c) return;
  const g = io(pr(t, c + 0.2, 2.8)) * 0.34;
  if (g > 0.004) {
    drew = true;
    const rg = ctx.createRadialGradient(980, 430, 0, 980, 430, 1150);
    rg.addColorStop(0, `rgba(255,128,70,${g})`);
    rg.addColorStop(0.45, `rgba(255,90,31,${g * 0.42})`);
    rg.addColorStop(1, 'rgba(255,90,31,0)');
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
  }
  const typed = (s, f, x, y, t0, t1, color, align) => {
    const w = measure(ctx, s, f);
    const lx = align === 'right' ? x - w : x;
    for (let i = 0; i < s.length; i++) {
      const ts = lerp(t0, t1, i / s.length) - 0.03;
      const p = eo(pr(t, ts, 0.5));
      text(ctx, s[i], lx + measure(ctx, s.slice(0, i), f), y + (1 - p) * 44,
        { font: f, color, alpha: clamp(pr(t, ts, 0.14)), blur: (1 - p) * 8 });
    }
    return w;
  };
  const fq = font(SERIF, 214, 400, true);
  slot(ctx, 'A BETTER', 780, 238, 22, { font: font(SANS, 22, 600), track: 9, color: ACC, align: 'right' },
    eo(pr(t, wt('better', 3) - 0.05, 0.6)));
  typed('Quality', fq, 782, 425, wt('quality'), wt('quality', 1, 'e'), PAPER, 'right');
  const fo = font(SERIF, 112, 400, true);
  const wo = typed('of', fo, 1172, 425, wt('of'), wt('of', 1, 'e'), ACC);
  typed('Life', fq, 1172 + wo + 24, 425, wt('life'), wt('life') + 0.26, PAPER);
}

// 11. End card.
function sEnd(ctx, t) {
  const tE = wt('life', 1, 'e') + 0.12;
  if (t < tE) return;
  const r = (k, d = 0.75) => eo(pr(t, tE + k, d));
  slot(ctx, 'MASTERCLASS', 960, 390, 24, { font: font(SANS, 24, 600), track: 12, color: ACC, align: 'center' }, r(0.1));
  slot(ctx, 'How to build a', 960, 462, 40, { font: font(SANS, 40, 500), color: PAPER, alpha: 0.78, align: 'center' }, r(0.25));
  const fi = font(SERIF, 112, 400, true), fn = font(SERIF, 112);
  const w1 = measure(ctx, 'Successful ', fi), w2 = measure(ctx, 'Coaching Practice', fn);
  const lx = 960 - (w1 + w2) / 2, p = r(0.38, 0.85);
  slot(ctx, 'Successful', lx, 588, 112, { font: fi, color: ACC }, p);
  slot(ctx, 'Coaching Practice', lx + w1, 588, 112, { font: fn, color: PAPER }, eo(pr(t, tE + 0.46, 0.85)));
  const lw = 240 * io(pr(t, tE + 0.75, 0.6));
  if (lw > 0) { ctx.save(); ctx.fillStyle = 'rgba(242,239,234,0.35)'; ctx.fillRect(960 - lw / 2, 640, lw, 1.5); ctx.restore(); drew = true; }
  slot(ctx, 'with Eric Edmeades', 960, 702, 28, { font: font(SANS, 28, 500), color: PAPER, alpha: 0.72, align: 'center' }, r(0.85));
}

// 12. Karaoke captions.
function captionHidden(t) {
  return t < wt('practice', 1, 'e') + 0.02 ||
    (t > wt('my') - 0.05 && t < wt('because') - 0.08) ||
    t > wt('life', 1, 'e') - 0.02;
}
function sCaptions(ctx, t) {
  if (captionHidden(t)) return;
  const G = TL.captions, Wd = TL.words;
  let gi = -1;
  for (let i = 0; i < G.length; i++) if (Wd[G[i][0]].s - 0.06 <= t) gi = i;
  if (gi < 0) return;
  const g = G[gi], last = Wd[g[g.length - 1]];
  const nextStart = G[gi + 1] ? Wd[G[gi + 1][0]].s - 0.06 : Infinity;
  if (t > Math.min(nextStart, last.e + 0.45)) return;
  const f = font(SANS, 46, 600);
  const sp = measure(ctx, ' ', f);
  const ws = g.map((k) => measure(ctx, Wd[k].w, f));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (g.length - 1);
  const p = eo(pr(t, Wd[g[0]].s - 0.06, 0.35));
  let x = 960 - total / 2;
  g.forEach((k, i) => {
    const w = Wd[k];
    const said = t >= w.s - 0.02, now = said && t < w.e + 0.02;
    text(ctx, w.w, x, 1002 + (1 - p) * 16, {
      font: f, color: w.accent && said ? ACC : PAPER, alpha: p * (said ? 1 : 0.42),
      shadow: 'rgba(0,0,0,0.65)', scale: now ? 1.04 : 1,
    });
    x += ws[i] + sp;
  });
}

function behind(ctx, t) {
  sMasterclass(ctx, t, false);
  sTitle(ctx, t);
  sName(ctx, t);
  sCurious(ctx, t);
  sYouAndI(ctx, t, 'behind');
  sHelp(ctx, t, false);
  sGraph(ctx, t);
  sQuality(ctx, t);
}
function front(ctx, t) {
  sMasterclass(ctx, t, true);
  sHelp(ctx, t, true);
  sCards(ctx, t);
  sYouAndI(ctx, t, 'front');
  sChips(ctx, t);
  sPills(ctx, t);
  sCaptions(ctx, t);
  sEnd(ctx, t);
}

window.renderFrame = function (i, layer, n = 5) {
  const t = i / TL.fps;
  const dt = 0.5 / TL.fps;
  OX.clearRect(0, 0, W, H);
  OX.globalCompositeOperation = 'lighter';
  let any = false;
  for (let k = 0; k < n; k++) {
    const ts = t - dt / 2 + (dt * (k + 0.5)) / n;
    SX.clearRect(0, 0, W, H);
    drew = false;
    (layer === 'behind' ? behind : front)(SX, ts);
    any = any || drew;
    OX.globalAlpha = 1 / n;
    OX.drawImage(scratch, 0, 0);
  }
  OX.globalAlpha = 1;
  OX.globalCompositeOperation = 'source-over';
  return any;
};

window.ready = Promise.all([
  document.fonts.load(font(SANS, 40, 400)), document.fonts.load(font(SANS, 40, 500)),
  document.fonts.load(font(SANS, 40, 600)), document.fonts.load(font(SANS, 40, 800)),
  document.fonts.load(font(SERIF, 40)), document.fonts.load(font(SERIF, 40, 400, true)),
]).then(() => true);
