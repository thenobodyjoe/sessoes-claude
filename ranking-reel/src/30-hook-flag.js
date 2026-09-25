// ============================================================
// Scene 1 (beats 0-4): the hook. "VAI VOTAR NO ESCURO?" under a failing lamp, a blackout, and one
// point of light that blows up into the whole frame.
// Scene 2 (beats 4-8): the flag, rebuilt from its geometry, then taken apart into Brasília: the globe
// splits into the Senate dome and the Chamber bowl, the rhombus flattens into the roof slab and
// the twin towers rise. The bowl then flips over and becomes the plenary of scene 3.
// ============================================================

// the failing lamp: 1 = lit. Shared with the audio (every stutter gets a zap).
function lampAt(b) {
  if (b < 2.06) return 0;
  const k = Math.floor(b * 16);
  if (b < 2.3) return hash(k * 1.7) < 0.5 ? 0.25 : 1;
  if (b > 2.62 && hash(k * 3.7 + 1) < (b - 2.55) * 0.62) return 0.12;
  return 1;
}

function sceneHook(ctx, b) {
  ctx.fillStyle = C.deep;
  ctx.fillRect(0, 0, W, H);
  if (b >= 3.5) {
    // blackout, then one point of light that swells into the frame
    if (b >= 3.6) {
      const grow = E.inExpo(seg(b, 3.78, 4.0));
      const r = lerp(10 + 3 * Math.sin(b * 40), 1250, grow);
      glow(ctx, 540, 960, 120 + r * 1.4, '#AFC2FF', 0.5 * seg(b, 3.6, 3.7));
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(540, 960, r, 0, TAU); ctx.fill();
    }
    return;
  }
  const lamp = lampAt(b);
  // subtle cold room light once the lamp is on
  glow(ctx, 540, 1000, 900, '#2A3FA0', 0.28 * lamp);

  // the filament: a line of light that draws itself, then becomes the text's floor
  if (b < 1.4) {
    const p = pr(b, 0.05, 0.85, E.outExpo), out = pr(b, 1.0, 1.35, E.inExpo);
    const w = 860 * p * (1 - out), fl = 0.75 + 0.25 * Math.sin(b * 70);
    glow(ctx, 540, 960, 520 * p, '#6F8BFF', 0.3 * p * (1 - out));
    ctx.save();
    ctx.shadowColor = '#9FB4FF'; ctx.shadowBlur = 36;
    ctx.fillStyle = `rgba(255,255,255,${fl})`;
    ctx.fillRect(540 - w / 2, 957, w, 5);
    ctx.restore();
  }

  // VAI VOTAR
  kLine(ctx, b, { text: 'VAI VOTAR', x: 540, y: 900, size: 150, weight: 800, maxW: 930, tIn: 1.0, style: 'rise', mask: true, stagger: 0.05, dur: 1.0 });

  // NO ESCURO? - hollow letters, only filled where the flickering spotlight lands
  if (b >= 2.0) {
    const text = 'NO ESCURO?';
    const size = fitSize(ctx, text, 900, 168, 0, 950);
    const L = layoutLine(ctx, text, 900, size, 0);
    const x0 = 540 - L.w / 2, y = 1085;
    const app = pr(b, 2.0, 2.35, E.outExpo);
    const jit = b > 3.0 ? E.inCubic(seg(b, 3.0, 3.5)) * 26 : 0;
    const jk = Math.floor(b * 24);
    ctx.save();
    ctx.font = FONT(900, size);
    const sc = lerp(1.12, 1, app);
    ctx.translate(540, y - size * 0.35); ctx.scale(sc, sc); ctx.translate(-540, -(y - size * 0.35));
    const drawLetters = fill => {
      for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') continue;
        const jx = jit * (hash(jk * 7 + i) - 0.5), jy = jit * (hash(jk * 11 + i + 3) - 0.5);
        if (fill) ctx.fillText(text[i], x0 + L.xs[i] + jx, y + jy);
        else ctx.strokeText(text[i], x0 + L.xs[i] + jx, y + jy);
      }
    };
    ctx.lineWidth = 2.5; ctx.strokeStyle = `rgba(143,168,255,${0.42 * app})`;
    drawLetters(false);
    // spotlight
    const sx = 540 + Math.sin((b - 2.0) * 2.1 - 1.2) * 340 + noise1(b * 3) * 50;
    const sy = 1010 + noise1(b * 2.3 + 9) * 36;
    if (lamp > 0) {
      ctx.save();
      ctx.beginPath(); ctx.arc(sx, sy, 245, 0, TAU); ctx.clip();
      glow(ctx, sx, sy, 300, '#C8D6FF', 0.22 * lamp);
      ctx.fillStyle = `rgba(255,255,255,${lamp})`;
      drawLetters(true);
      ctx.restore();
      // the rim of the beam
      ctx.strokeStyle = `rgba(200,214,255,${0.18 * lamp})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(sx, sy, 245, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  }
}

// ---------- scene 2 geometry
const FLAG = {
  cx: 540, cy: 960, r: 320,
  rh: [[540, 405], [1030, 960], [540, 1515], [50, 960]],       // rhombus vertices T R B L
  band: { cx: 380, cy: 1880, r0: 940, r1: 998 },
};
const CONG = {
  slabY: 1229, slabH: 22, groundY: 1330, poolY: 1500,
  dome: { cx: 300, rx: 135, ry: 88 }, bowl: { cx: 790, rx: 190, ry: 100 },
  towers: [[487, 533], [547, 593]], towerTop: 560,
};
// 27 stars: one for each state and the Federal District, one above the band as on the flag
const STARS = (() => {
  const r = mulberry(27), out = [[620, 872, 13]];
  let guard = 0;
  while (out.length < 27 && guard++ < 5000) {
    const x = FLAG.cx + (r() * 2 - 1) * 290, y = FLAG.cy + (r() * 2 - 1) * 290;
    if (Math.hypot(x - FLAG.cx, y - FLAG.cy) > 280) continue;
    if (Math.hypot(x - FLAG.band.cx, y - FLAG.band.cy) > FLAG.band.r0 - 22) continue;
    if (out.some(s => Math.hypot(s[0] - x, s[1] - y) < 46)) continue;
    out.push([x, y, 7 + r() * 8]);
  }
  // where each star goes when the flag becomes the night sky over Brasília
  return out.map((s, i) => ({ x: s[0], y: s[1], r: s[2], sx: 60 + hash(i * 3.1) * 960, sy: 170 + hash(i * 5.7 + 2) * 470, tw: hash(i * 9.3) * TAU }));
})();

const SH2 = {};     // cached morph endpoints
function flagShapes() {
  if (SH2.ready) return SH2;
  SH2.rh = S_.rhombus(540, 960, 980, 1110);
  SH2.slab = S_.rect(540, CONG.slabY + CONG.slabH / 2, 940, CONG.slabH, 3);
  SH2.up = S_.half(FLAG.cx, FLAG.cy, FLAG.r, FLAG.r, true);
  SH2.low = S_.half(FLAG.cx, FLAG.cy, FLAG.r, FLAG.r, false);
  SH2.dome = S_.half(CONG.dome.cx, CONG.slabY, CONG.dome.rx, CONG.dome.ry, true);
  SH2.bowl = S_.half(CONG.bowl.cx, CONG.slabY - CONG.bowl.ry, CONG.bowl.rx, CONG.bowl.ry, false);
  SH2.plen = S_.half(540, 1420, 490, 490, true);     // the plenary of scene 3
  SH2.tmp = new Float32Array(NP * 2);
  SH2.ready = true;
  return SH2;
}

function nightSky(ctx, b) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#050A26');
  g.addColorStop(0.55, '#0D1A52');
  g.addColorStop(0.68, '#27418F');
  g.addColorStop(0.69, '#0B1440');
  g.addColorStop(1, '#060B26');
  ctx.fillStyle = g;
  ctx.fillRect(-W, -H, W * 3, H * 3);
}

function drawStar(ctx, x, y, r, rot) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
    if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// the band with "ORDEM E PROGRESSO" along it, swept in by angle
function flagBand(ctx, b, alpha) {
  const B = FLAG.band, sweep = pr(b, 4.35, 4.9, E.outCubic);
  if (sweep <= 0 || alpha <= 0) return;
  const a0 = -106 * Math.PI / 180, a1 = lerp(a0, -52 * Math.PI / 180, sweep);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.beginPath(); ctx.arc(FLAG.cx, FLAG.cy, FLAG.r * 0.999, 0, TAU); ctx.clip();
  ctx.beginPath();
  ctx.arc(B.cx, B.cy, B.r1, a0, a1);
  ctx.arc(B.cx, B.cy, B.r0, a1, a0, true);
  ctx.closePath();
  ctx.fillStyle = '#fff';
  ctx.fill();
  // lettering, bent along the band
  const text = 'ORDEM E PROGRESSO', size = 29, track = 3.2;
  const L = layoutLine(ctx, text, 700, size, track);
  const R = (B.r0 + B.r1) / 2 - size * 0.34;
  const ac = Math.atan2(FLAG.cy - 30 - B.cy, FLAG.cx - B.cx);
  ctx.font = FONT(700, size);
  ctx.fillStyle = C.flagGreen;
  for (let i = 0; i < text.length; i++) {
    const s = L.xs[i] + L.ws[i] / 2 - L.w / 2;
    const a = ac + s / R;
    if (a > a1 - 0.01) continue;
    const q = pr(b, 4.55 + i * 0.022, 4.8 + i * 0.022, E.outBack);
    if (q <= 0) continue;
    ctx.save();
    ctx.translate(B.cx + Math.cos(a) * R, B.cy + Math.sin(a) * R);
    ctx.rotate(a + Math.PI / 2);
    ctx.scale(q, q);
    ctx.fillText(text[i], -L.ws[i] / 2, size * 0.36);
    ctx.restore();
  }
  ctx.restore();
}

function sceneFlag(ctx, b) {
  const S = flagShapes();
  ctx.fillStyle = C.flagGreen;
  ctx.fillRect(0, 0, W, H);

  // camera: lands tilted and settles, breathes on the downbeat, then stays put for the build
  const land = pr(b, 4.0, 5.0, E.outExpo);
  let cs = lerp(1.1, 1, land) + 0.018 * kick(b, 5, 5) + 0.012 * kick(b, 6, 5);
  let crot = lerp(-0.07, 0, land);
  const [shx, shy] = shakeAt(b, [[4, 22], [6.0, 8]]);
  // the flip into the plenary: everything but the bowl drops out of frame
  const drop = E.inCubic(seg(b, 7.25, 7.85));
  ctx.save();
  ctx.translate(540 + shx, 960 + shy); ctx.rotate(crot); ctx.scale(cs, cs); ctx.translate(-540, -960);

  // flood: the globe's blue floods outward and becomes the night
  const flood = E.inOutExpo(seg(b, 5.5, 6.15));
  if (flood > 0) {
    ctx.save();
    ctx.beginPath(); ctx.arc(FLAG.cx, FLAG.cy, lerp(FLAG.r, 1500, flood), 0, TAU); ctx.clip();
    nightSky(ctx, b);
    ctx.restore();
  }
  const night = seg(b, 5.6, 6.3);

  // stars: pop in on the globe, then scatter into the sky and twinkle
  const fly = E.inOutCubic(seg(b, 5.55, 6.35));
  STARS.forEach((s, i) => {
    const q = pr(b, 4.6 + i * 0.028, 4.95 + i * 0.028, E.outBack);
    if (q <= 0) return;
    const x = lerp(s.x, s.sx, fly), y = lerp(s.y, s.sy, fly) - Math.sin(fly * Math.PI) * 120;
    const tw = fly > 0.9 ? 0.55 + 0.45 * Math.sin(b * 5 + s.tw) : 1;
    const r = lerp(s.r, 3 + s.r * 0.25, fly) * q;
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + 0.65 * tw) * (1 - 0.8 * seg(b, 7.4, 7.95))})`;
    if (fly < 0.98) drawStar(ctx, x, y, r, fly * 3);
    else { ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill(); }
  });

  // rhombus: corners fly in from the four edges, later it flattens into the roof slab
  if (b < 5.55) {
    const from = [[540, -260], [1400, 960], [540, 2200], [-320, 960]];
    ctx.beginPath();
    FLAG.rh.forEach((v, i) => {
      const q = pr(b, 4.08 + i * 0.07, 4.62 + i * 0.07, E.outExpo);
      const x = lerp(from[i][0], v[0], q), y = lerp(from[i][1], v[1], q);
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.fillStyle = C.flagYellow;
    ctx.fill();
  }

  // Congress, built as a layer so it can be mirrored in the reflecting pool
  const build = seg(b, 5.55, 8);
  if (b >= 5.55) {
    ctx.save();
    ctx.translate(0, drop * 900);
    ctx.globalAlpha = 1 - drop;
    congress(ctx, b, S, false);
    // reflecting pool: the same drawing, flipped about the waterline, faded
    const water = pr(b, 6.1, 6.7, E.outCubic);
    if (water > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, CONG.groundY, W, CONG.poolY - CONG.groundY); ctx.clip();
      ctx.fillStyle = '#081238'; ctx.fillRect(0, CONG.groundY, W, CONG.poolY - CONG.groundY);
      ctx.globalAlpha *= 0.32 * water;
      ctx.translate(0, CONG.groundY * 2); ctx.scale(1, -1);
      congress(ctx, b, S, true);
      ctx.restore();
      // ripples of light on the water
      ctx.save();
      ctx.globalAlpha *= water;
      for (let k = 0; k < 9; k++) {
        const y = CONG.groundY + 18 + k * 19, w = 120 + hash(k) * 320, x = (hash(k * 3) * 900 + b * 40 * (k % 2 ? 1 : -1)) % 1000;
        ctx.fillStyle = 'rgba(160,190,255,0.10)'; ctx.fillRect(x, y, w, 2);
      }
      ctx.fillStyle = '#050A22'; ctx.fillRect(0, CONG.poolY, W, H - CONG.poolY);
      ctx.fillStyle = 'rgba(160,190,255,0.25)'; ctx.fillRect(0, CONG.groundY, W, 2);
      ctx.restore();
    }
    ctx.restore();
  }

  // the globe: one circle (from the burst of light), then two halves that become dome and bowl
  if (b < 5.55) {
    const q = E.outExpo(seg(b, 4.0, 4.55));
    const r = lerp(1250, FLAG.r, q);
    ctx.fillStyle = mix('#FFFFFF', C.flagBlue, seg(b, 4.0, 4.32));
    ctx.beginPath(); ctx.arc(FLAG.cx, FLAG.cy, r, 0, TAU); ctx.fill();
    // stars sit on the globe; draw them again on top of it
    STARS.forEach((s, i) => {
      const qq = pr(b, 4.6 + i * 0.028, 4.95 + i * 0.028, E.outBack);
      if (qq <= 0) return;
      ctx.fillStyle = '#fff';
      drawStar(ctx, s.x, s.y, s.r * qq, 0);
    });
    flagBand(ctx, b, 1 - seg(b, 5.4, 5.55));
  } else {
    const m = E.inOutExpo(seg(b, 5.6, 6.3));
    const col = mix(C.flagBlue, C.concrete, seg(b, 5.85, 6.3));
    // a small split before the morph (anticipation)
    const gap = 16 * Math.sin(Math.PI * seg(b, 5.55, 5.95));
    morphPts(S.up, S.dome, m, S.tmp);
    ctx.save(); ctx.translate(0, -gap * (1 - m)); ctx.translate(0, drop * 900); ctx.globalAlpha = 1 - drop;
    domeFill(ctx, S.tmp, col, m);
    ctx.restore();
    // the bowl keeps going: it flips over and swells into the plenary
    const flip = E.inOutExpo(seg(b, 7.3, 8.0));
    if (flip <= 0) {
      morphPts(S.low, S.bowl, m, S.tmp);
      ctx.save(); ctx.translate(0, gap * (1 - m));
      domeFill(ctx, S.tmp, col, m);
      ctx.restore();
    } else {
      morphPts(S.bowl, S.plen, flip, S.tmp);
      // scene 3 opens zoomed in 1.5x on the plenary: meet it there
      const z = lerp(1, 1.5, flip);
      ctx.save(); ctx.translate(540, 1420); ctx.scale(z, z); ctx.translate(-540, -1420);
      fillPts(ctx, S.tmp, mix(C.concrete, '#16235F', E.inOutCubic(seg(b, 7.3, 7.8))));
      ctx.restore();
    }
  }

  // labels and counters
  if (b >= 6.35 && drop < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - E.inCubic(seg(b, 7.2, 7.55));
    counterLabel(ctx, b, 6.4, CONG.dome.cx, 1040, 81, 'SENADORES');
    counterLabel(ctx, b, 6.55, CONG.bowl.cx, 1012, 513, 'DEPUTADOS');
    const h = pr(b, 6.2, 6.8);
    if (h > 0) {
      ctx.globalAlpha *= h;
      label(ctx, 'CONGRESSO NACIONAL', 540, 395 - 30 * (1 - h), 34, C.mute, 'center', 9, 700);
      ctx.fillStyle = rgba(C.mute, 0.6);
      const lw = 90 * h;
      ctx.fillRect(540 - 280 - lw, 383, lw, 2); ctx.fillRect(540 + 280, 383, lw, 2);
    }
    ctx.restore();
  }
  ctx.restore();
}

function domeFill(ctx, P, col, m) {
  tracePts(ctx, P);
  ctx.fillStyle = col;
  ctx.fill();
  if (m > 0.6) {
    // concrete shading: lit from the left
    const [cx] = ptsCentroid(P);
    const g = ctx.createLinearGradient(cx - 200, 0, cx + 200, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.0)');
    g.addColorStop(1, `rgba(20,30,80,${0.35 * seg(m, 0.6, 1)})`);
    ctx.fillStyle = g;
    ctx.fill();
  }
}

function counterLabel(ctx, b, b0, x, y, n, word) {
  const p = seg(b, b0, b0 + 0.9);
  if (p <= 0) return;
  const v = Math.round(n * E.outCubic(p));
  const a = pr(b, b0, b0 + 0.35);
  ctx.save();
  ctx.globalAlpha *= a;
  ctx.font = FONT(900, 118);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.yellow;
  ctx.fillText(String(v), x, y - 20 * (1 - a));
  ctx.textAlign = 'left';
  label(ctx, word, x, y + 46, 30, C.white, 'center', 5, 700);
  // leader tick down to the building
  const lh = 26 * pr(b, b0 + 0.2, b0 + 0.6);
  ctx.fillStyle = rgba(C.white, 0.7);
  ctx.fillRect(x - 1, y + 60, 2, lh);
  ctx.beginPath(); ctx.arc(x, y + 62 + lh, 4, 0, TAU); ctx.fill();
  ctx.restore();
}

// the Congress without the dome and bowl (they are drawn by the morph)
function congress(ctx, b, S, mirrored) {
  // slab (the rhombus, flattened)
  const m = E.inOutExpo(seg(b, 5.55, 6.2));
  if (!mirrored) {
    morphPts(S.rh, S.slab, m, S.tmp);
    fillPts(ctx, S.tmp, mix(C.flagYellow, C.concrete, seg(b, 5.75, 6.2)));
  } else {
    fillPts(ctx, S.slab, C.concrete);
    fillPts(ctx, S.dome, C.concrete);
    if (b < 7.3) fillPts(ctx, S.bowl, C.concrete);
  }
  // main block under the slab, opening from the middle
  const open = pr(b, 6.05, 6.55, E.outExpo);
  if (open > 0) {
    const w = 840 * open, x0 = 540 - w / 2;
    ctx.fillStyle = '#9AA6CB';
    ctx.fillRect(x0, CONG.slabY + CONG.slabH, w, CONG.groundY - CONG.slabY - CONG.slabH);
    ctx.fillStyle = 'rgba(10,20,60,0.35)';
    for (let x = x0 + 14; x < x0 + w - 6; x += 28) ctx.fillRect(x, CONG.slabY + CONG.slabH + 8, 3, CONG.groundY - CONG.slabY - CONG.slabH - 8);
    // the ramp up to the roof
    ctx.fillStyle = C.concrete;
    ctx.beginPath();
    ctx.moveTo(lerp(540, 40, open), CONG.groundY); ctx.lineTo(lerp(540, 190, open), CONG.slabY + CONG.slabH);
    ctx.lineTo(lerp(540, 226, open), CONG.slabY + CONG.slabH); ctx.lineTo(lerp(540, 84, open), CONG.groundY);
    ctx.closePath(); ctx.fill();
  }
  // the twin towers rise out of the slab
  CONG.towers.forEach(([x0, x1], i) => {
    const q = pr(b, 6.0 + i * 0.1, 6.75 + i * 0.1, E.outExpo);
    if (q <= 0) return;
    const top = lerp(CONG.slabY, CONG.towerTop, q);
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, i ? '#C9D1EA' : '#F2F4FA');
    g.addColorStop(1, i ? '#A7B2D6' : '#D5DCEF');
    ctx.fillStyle = g;
    ctx.fillRect(x0, top, x1 - x0, CONG.slabY - top);
    ctx.fillStyle = 'rgba(15,25,70,0.16)';
    for (let y = top + 12; y < CONG.slabY - 6; y += 22) ctx.fillRect(x0 + 5, y, x1 - x0 - 10, 3);
  });
  // the bridge between the towers (the H)
  const hq = pr(b, 6.55, 6.85);
  if (hq > 0) { ctx.fillStyle = '#DCE2F2'; ctx.fillRect(533, 868, 14 * hq, 34); }
}
