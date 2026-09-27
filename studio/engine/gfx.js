// Spec-driven motion graphics. Loaded by engine/page.html (render) and, later, by the editor for live preview.
// window.SPEC = { fps, tv: [virtual source time per output frame], base: {w,h}, style, elements, captions, fx, words }
(function () {
  const BW = 1920, BH = 1080; // layouts are authored on a 1920x1080 grid
  const S = window.SPEC;
  const st = S.style || {};
  const INK = st.ink || '#0E0F11', PAPER = st.paper || '#F2EFEA', ACC = st.accent || '#FF5A1F';
  const SERIF = `"${st.serif || 'Instrument Serif'}"`, SANS = `"${st.sans || 'Inter Tight'}"`;
  const out = document.getElementById('out');
  out.width = S.base.w; out.height = S.base.h;
  const OX = out.getContext('2d');
  const scratch = document.createElement('canvas'); scratch.width = S.base.w; scratch.height = S.base.h;
  const SX = scratch.getContext('2d');
  const IMG = {};

  // ---------- easing & primitives ----------
  const clamp = (x) => Math.max(0, Math.min(1, x));
  const pr = (t, t0, d) => clamp((t - t0) / d);
  const eo = (x) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
  const ci = (x) => x * x * x;
  const io = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
  const bo = (x, s = 1.6) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
  const lerp = (a, b, x) => a + (b - a) * x;
  const font = (fam, size, w = 400, it = false) => `${it ? 'italic ' : ''}${w} ${size}px ${fam}`;
  let drew = false;
  const exitP = (t, e) => ci(pr(t, e.t1 - 0.4, 0.4)); // everything leaves in the last 0.4 s of its range

  function measure(ctx, s, f, track = 0) {
    ctx.save(); ctx.font = f; ctx.letterSpacing = track + 'px';
    const m = ctx.measureText(s).width - track; ctx.restore(); return m;
  }
  function text(ctx, s, x, y, o) {
    const a = o.alpha ?? 1;
    if (a <= 0.004 || !s) return 0;
    drew = true;
    ctx.save();
    ctx.globalAlpha = a; ctx.font = o.font; ctx.letterSpacing = (o.track ?? 0) + 'px'; ctx.textBaseline = 'alphabetic';
    const w = measure(ctx, s, o.font, o.track ?? 0);
    const lx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    if (o.blur > 0.3) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
    if (o.shadow) { ctx.shadowColor = o.shadow; ctx.shadowBlur = 18; ctx.shadowOffsetY = 2; }
    const sc = o.scale ?? 1, rot = o.rot ?? 0;
    if (sc !== 1 || rot) { const ox = o.ox ?? lx + w / 2, oy = o.oy ?? y; ctx.translate(ox, oy); ctx.rotate(rot); ctx.scale(sc, sc); ctx.translate(-ox, -oy); }
    if (o.stroke) { ctx.strokeStyle = o.color ?? PAPER; ctx.lineWidth = o.stroke; ctx.strokeText(s, lx, y); }
    else { ctx.fillStyle = o.color ?? PAPER; ctx.fillText(s, lx, y); }
    ctx.restore();
    return w;
  }
  function slot(ctx, s, x, y, size, o, p) {
    if (p <= 0 || !s) return;
    const w = measure(ctx, s, o.font, o.track ?? 0);
    const lx = o.align === 'center' ? x - w / 2 : o.align === 'right' ? x - w : x;
    ctx.save(); ctx.beginPath(); ctx.rect(lx - 40, y - size * 1.08, w + 80, size * 1.42); ctx.clip();
    text(ctx, s, x, y + (1 - p) * size * 1.15, { ...o, alpha: (o.alpha ?? 1) * clamp(p * 1.6) });
    ctx.restore();
  }
  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }
  const fitBig = (ctx, s, maxW = 1720) => Math.min(340, (100 * maxW) / measure(ctx, s, font(SANS, 100, 800), -2));
  const sideX = (side) => (side === 'right' ? BW - 112 : 112);
  const sideAlign = (side) => (side === 'right' ? 'right' : 'left');
  const STYLE = {
    sans: (sz) => ({ font: font(SANS, Math.round(sz * 0.37), 500), color: PAPER, alpha: 0.8, size: sz * 0.37 }),
    serif: (sz) => ({ font: font(SERIF, sz), color: PAPER, size: sz }),
    serifItalic: (sz) => ({ font: font(SERIF, sz, 400, true), color: PAPER, size: sz }),
    serifItalicAccent: (sz) => ({ font: font(SERIF, sz, 400, true), color: ACC, size: sz }),
    kicker: () => ({ font: font(SANS, 22, 600), color: ACC, track: 9, size: 22 }),
  };

  // ---------- elements ----------
  const E = {};

  E.bigWord = (ctx, t, e, layer) => {
    const size = fitBig(ctx, e.text), pin = eo(pr(t, e.t0, 1.2)), pout = exitP(t, e);
    const track = lerp(0.14, -0.02, pin) * size;
    const base = BH * (e.y ?? 0.305) + 0.365 * size - pout * 70;
    const alpha = clamp(pr(t, e.t0, 0.5)) * (1 - pout);
    const o = { font: font(SANS, size, 800), align: 'center', track, blur: (1 - pin) * 14 + pout * 16, scale: lerp(1.16, 1, pin), ox: 960, oy: base - size * 0.36 };
    if (layer === 'front') return text(ctx, e.text, 960, base, { ...o, alpha: alpha * 0.14, stroke: 1.8 });
    text(ctx, e.text, 960, base, { ...o, alpha });
    if (e.kicker) {
      const left = 960 - measure(ctx, e.text, o.font, -0.02 * size) / 2;
      slot(ctx, e.kicker, left + 6, base - size * 0.73 - 34, 26, { font: font(SANS, 26, 600), track: 11, color: ACC, alpha: 1 - pout }, eo(pr(t, e.t0 + 0.1, 0.7)));
    }
  };

  E.titleStack = (ctx, t, e) => {
    const x = sideX(e.side), al = sideAlign(e.side), big = e.size || 118;
    const ex = (k) => ci(pr(t, e.t1 - 0.45 + k * 0.05, 0.4));
    const dx = (k) => (al === 'right' ? 70 : -70) * ex(k);
    let y = e.y ? BH * e.y : 205;
    if (e.kicker) { slot(ctx, e.kicker, x + dx(0), y, 22, { ...STYLE.kicker(), align: al, alpha: 1 - ex(0) }, eo(pr(t, e.t0, 0.7))); y += 64; }
    (e.lines || []).forEach((ln, i) => {
      const o = (STYLE[ln.style] || STYLE.serif)(big);
      y += i === 0 && ln.style === 'sans' ? 0 : ln.style === 'sans' ? o.size * 1.3 : o.size * 0.92;
      const k = i + 1;
      slot(ctx, ln.text, x + dx(k), y, o.size, { ...o, align: al, alpha: (o.alpha ?? 1) * (1 - ex(k)), blur: ex(k) * 10 }, eo(pr(t, (ln.at ?? e.t0) - 0.04, 0.65)));
      if (ln.underline) {
        const up = io(pr(t, (ln.at ?? e.t0) + 0.18, 0.5)) * (1 - ex(k));
        if (up > 0) {
          const w = measure(ctx, ln.text, o.font), x0 = (al === 'right' ? x - w : x) + dx(k);
          ctx.save(); ctx.strokeStyle = ACC; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath();
          for (let s = 0; s <= 40 * up; s++) { const u = s / 40; const px = x0 + 6 + u * (w - 6), py = y + 24 + Math.sin(u * Math.PI) * 7 - u * 6; s ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
          ctx.stroke(); ctx.restore(); drew = true;
        }
      }
      if (ln.style === 'sans') y += 8;
    });
  };

  E.nameTitle = (ctx, t, e) => {
    const x = sideX(e.side), al = sideAlign(e.side), po = exitP(t, e);
    const lw = 380 * eo(pr(t, e.t0, 0.8)), y = e.y ? BH * e.y : 425;
    if (lw > 0 && po < 1) {
      ctx.save(); ctx.fillStyle = ACC;
      const x0 = al === 'right' ? x - lw : x + 380 * po;
      ctx.fillRect(x0, y + 27, Math.max(0, lw - 380 * po), 3); ctx.restore(); drew = true;
    }
    slot(ctx, e.name, x, y, 100, { font: font(SERIF, 100), color: PAPER, align: al }, eo(pr(t, (e.at ?? e.t0 + 0.3) - 0.06, 0.75)) * (1 - po));
    slot(ctx, e.role, x + (al === 'right' ? -2 : 2), y + 75, 22, { font: font(SANS, 22, 600), track: 9, color: PAPER, alpha: 0.75, align: al }, eo(pr(t, (e.at ?? e.t0) + 0.5, 0.6)) * (1 - po));
  };

  E.sideWord = (ctx, t, e) => {
    const al = sideAlign(e.side), x = e.side === 'right' ? 1196 : 724, po = exitP(t, e);
    const X = al === 'right' ? x : x; const align = e.side === 'right' ? 'left' : 'right';
    if (e.kicker) slot(ctx, e.kicker, X + (align === 'left' ? 4 : -4), 268, 22, { font: font(SANS, 22, 600), track: 9, color: PAPER, alpha: 0.75 * (1 - po), align }, eo(pr(t, e.t0 - 0.05, 0.6)));
    const p = eo(pr(t, e.t0 - 0.04, 0.7));
    text(ctx, e.word, X, 425, { font: font(SERIF, 176, 400, true), color: ACC, align, alpha: clamp(pr(t, e.t0 - 0.04, 0.25)) * (1 - po), blur: (1 - p) * 14 + po * 12, scale: lerp(1.22, 1, p), ox: X, oy: 380 });
    if (e.sub) slot(ctx, e.sub, X, 530, 96, { font: font(SERIF, 96), color: PAPER, alpha: 0.85 * (1 - po), align }, eo(pr(t, (e.subAt ?? e.t0 + 0.5) - 0.04, 0.6)));
  };

  function checkCard(ctx, x, y, w, h, label, main, pIn, pChk, pOut) {
    const a = clamp(pIn * 1.4) * (1 - pOut); if (a <= 0.004) return; drew = true;
    const sc = lerp(0.95, 1, pIn), dy = (1 - pIn) * 40 + pOut * 26;
    ctx.save(); ctx.globalAlpha = a;
    ctx.translate(x + w / 2, y + h / 2 + dy); ctx.scale(sc, sc); ctx.translate(-(x + w / 2), -(y + h / 2));
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
    rrect(ctx, x, y, w, h, 24); ctx.fillStyle = 'rgba(14,15,17,0.78)'; ctx.fill();
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(242,239,234,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
    const cx = x + 62, cy = y + h / 2, r = 28;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.strokeStyle = pChk > 0 ? ACC : 'rgba(242,239,234,0.35)'; ctx.lineWidth = 2.5; ctx.stroke();
    if (pChk > 0) {
      const b = bo(clamp(pChk * 1.4));
      ctx.save(); ctx.translate(cx, cy); ctx.scale(b, b); ctx.translate(-cx, -cy); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill(); ctx.restore();
      const L1 = Math.hypot(8, 8), L2 = Math.hypot(15, 17), L = (L1 + L2) * clamp((eo(pChk) - 0.2) / 0.8);
      ctx.beginPath(); ctx.moveTo(cx - 11, cy + 1);
      if (L <= L1) ctx.lineTo(cx - 11 + (8 * L) / L1, cy + 1 + (8 * L) / L1);
      else { ctx.lineTo(cx - 3, cy + 9); const u = (L - L1) / L2; ctx.lineTo(cx - 3 + 15 * u, cy + 9 - 17 * u); }
      ctx.strokeStyle = INK; ctx.lineWidth = 4.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    ctx.font = font(SANS, 18, 600); ctx.letterSpacing = '5px'; ctx.fillStyle = 'rgba(242,239,234,0.62)'; ctx.fillText(label || '', x + 114, y + 60);
    ctx.font = font(SERIF, 54); ctx.letterSpacing = '0px'; ctx.fillStyle = PAPER; ctx.fillText(main, x + 112, y + 112);
    ctx.restore();
  }
  E.cards = (ctx, t, e) => {
    (e.items || []).forEach((it, i) => {
      const w = Math.max(420, 150 + measure(ctx, it.text, font(SERIF, 54))), h = 150;
      const right = (it.side || (i % 2 ? 'right' : 'left')) === 'right';
      checkCard(ctx, right ? BW - 112 - w : 112, 250 + (it.row || 0) * 170, w, h, it.label, it.text,
        eo(pr(t, (it.at ?? e.t0) - 0.06, 0.65)), it.checkAt != null ? pr(t, it.checkAt, 0.45) : 0, ci(pr(t, e.t1 - 0.4 + i * 0.06, 0.4)));
    });
  };

  E.splitWords = (ctx, t, e, layer) => {
    const po = exitP(t, e), pop = (ts) => eo(pr(t, ts - 0.04, 0.6));
    if (layer === 'behind') {
      const f = font(SANS, 300, 800);
      const yo = (p) => ({ font: f, track: -6, color: PAPER, alpha: clamp(p * 2.5) * (1 - po), blur: (1 - p) * 16 + po * 12, scale: lerp(1.3, 1, p) });
      text(ctx, e.left, 738, 480, { ...yo(pop(e.leftAt ?? e.t0)), align: 'right', ox: 600, oy: 370 });
      text(ctx, e.right, 1188, 480, { ...yo(pop(e.rightAt ?? e.t0 + 0.3)), ox: 1300, oy: 370 });
    } else if (e.mid) {
      const q = pr(t, (e.midAt ?? e.t0 + 0.15) - 0.04, 0.55);
      if (q > 0) text(ctx, e.mid, 960, 790, { font: font(SERIF, 250, 400, true), color: ACC, align: 'center', alpha: clamp(q * 3) * (1 - po), scale: Math.max(0, bo(q, 1.3)), rot: (1 - eo(q)) * -0.35, ox: 960, oy: 700 });
    }
  };

  E.bigLetters = (ctx, t, e, layer) => {
    const s = e.text, size = fitBig(ctx, s), f = font(SANS, size, 800), track = -0.02 * size;
    const x0 = 960 - measure(ctx, s, f, track) / 2, base = BH * (e.y ?? 0.307) + 0.365 * size;
    const words = s.split(' '); let wi = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === ' ') { wi++; continue; }
      const at = (e.wordsAt && e.wordsAt[wi] != null ? e.wordsAt[wi] : (e.at ?? e.t0) + wi * 0.25) + i * 0.03 - 0.05;
      const p = eo(pr(t, at, 0.6)), po = ci(pr(t, e.t1 - 0.4 + (s.length - i) * 0.01, 0.3));
      const a = clamp(pr(t, at, 0.2)) * (1 - po);
      const x = x0 + measure(ctx, s.slice(0, i), f, track) + (i ? track : 0);
      text(ctx, s[i], x, base + (1 - p) * 110 - po * 90, { font: f, color: PAPER, alpha: layer === 'front' ? a * 0.14 : a, blur: (1 - p) * 10 + po * 14, stroke: layer === 'front' ? 1.8 : 0 });
    }
    void words;
  };

  const PATH = [[110, 940], [330, 880], [520, 905], [700, 790], [880, 815], [1060, 660], [1230, 690], [1400, 520], [1570, 470], [1810, 215]];
  E.graph = (ctx, t, e) => {
    const fade = 1 - exitP(t, e), g = clamp(pr(t, e.t0 - 0.1, 0.5)) * fade;
    if (g <= 0) return; drew = true;
    ctx.save(); ctx.globalAlpha = g * 0.07; ctx.strokeStyle = PAPER; ctx.lineWidth = 1;
    for (let x = 160; x < BW; x += 160) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x, 980); ctx.stroke(); }
    for (let y = 190; y < 1000; y += 130) { ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(1830, y); ctx.stroke(); }
    ctx.restore();
    const p = io(pr(t, e.t0 + 0.05, Math.min(1.6, (e.t1 - e.t0) * 0.7)));
    const segs = []; let L = 0;
    for (let i = 1; i < PATH.length; i++) { const l = Math.hypot(PATH[i][0] - PATH[i - 1][0], PATH[i][1] - PATH[i - 1][1]); segs.push(l); L += l; }
    let rem = L * p; const pts = [PATH[0]];
    for (let i = 1; i < PATH.length && rem > 0; i++) { const u = Math.min(1, rem / segs[i - 1]); pts.push([lerp(PATH[i - 1][0], PATH[i][0], u), lerp(PATH[i - 1][1], PATH[i][1], u)]); rem -= segs[i - 1]; }
    ctx.save(); ctx.translate(0, (1 - fade) * 30); ctx.globalAlpha = fade;
    const grad = ctx.createLinearGradient(0, 200, 0, 1000); grad.addColorStop(0, hexA(ACC, 0.28)); grad.addColorStop(1, hexA(ACC, 0));
    ctx.beginPath(); ctx.moveTo(pts[0][0], 1000); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.lineTo(pts[pts.length - 1][0], 1000); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.strokeStyle = ACC; ctx.lineWidth = 6; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.shadowColor = hexA(ACC, 0.8); ctx.shadowBlur = 24; ctx.stroke(); ctx.shadowBlur = 0;
    const hd = pts[pts.length - 1];
    if (p < 1) { ctx.beginPath(); ctx.arc(hd[0], hd[1], 10, 0, Math.PI * 2); ctx.fillStyle = PAPER; ctx.fill(); }
    else { const a = Math.atan2(PATH[9][1] - PATH[8][1], PATH[9][0] - PATH[8][0]); ctx.translate(hd[0], hd[1]); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-18, -16); ctx.lineTo(-10, 0); ctx.lineTo(-18, 16); ctx.closePath(); ctx.fillStyle = ACC; ctx.fill(); }
    ctx.restore();
  };

  E.chips = (ctx, t, e) => {
    const po = exitP(t, e);
    (e.items || []).forEach((it, i) => {
      const p = eo(pr(t, (it.at ?? e.t0) - 0.06, 0.5)) * (1 - po), a = clamp(p * 2); if (a <= 0.004) return; drew = true;
      const f = font(SANS, 30, 600), w = 74 + measure(ctx, it.text, f) + 30, h = 68;
      const right = (it.side || (i % 2 ? 'right' : 'left')) === 'right';
      const lx = right ? BW - 112 - w : 112, y = right ? 300 : 560, s = Math.max(0, bo(p, 1.4));
      ctx.save(); ctx.globalAlpha = a; const ox = right ? lx + w : lx;
      ctx.translate(ox, y + h / 2); ctx.scale(s, s); ctx.translate(-ox, -(y + h / 2));
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; rrect(ctx, lx, y, w, h, h / 2); ctx.fillStyle = PAPER; ctx.fill(); ctx.shadowColor = 'transparent';
      const cx = lx + 36, cy = y + h / 2; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill();
      ctx.strokeStyle = PAPER; ctx.lineWidth = 3.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath();
      ctx.moveTo(cx, cy + 10); ctx.lineTo(cx, cy - 10); ctx.moveTo(cx - 8, cy - 2); ctx.lineTo(cx, cy - 10); ctx.lineTo(cx + 8, cy - 2); ctx.stroke();
      ctx.font = f; ctx.fillStyle = INK; ctx.fillText(it.text, lx + 72, y + 44); ctx.restore();
    });
  };

  const ICONS = {
    business(c, x, y) { rrect(c, x - 12, y - 6, 24, 16, 3); c.stroke(); rrect(c, x - 5, y - 11, 10, 5, 2); c.stroke(); c.beginPath(); c.moveTo(x - 12, y + 1); c.lineTo(x + 12, y + 1); c.stroke(); },
    health(c, x, y) { c.beginPath(); [[-13, 1], [-6, 1], [-3, -8], [2, 9], [5, 1], [13, 1]].forEach(([a, b], i) => (i ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b))); c.stroke(); },
    heart(c, x, y) { c.beginPath(); c.moveTo(x, y + 10); c.bezierCurveTo(x - 16, y - 1, x - 9, y - 14, x, y - 6); c.bezierCurveTo(x + 9, y - 14, x + 16, y - 1, x, y + 10); c.stroke(); },
    family(c, x, y) { c.beginPath(); c.arc(x - 5, y - 7, 4, 0, 7); c.stroke(); c.beginPath(); c.arc(x - 5, y + 11, 9, 3.6, 5.8); c.stroke(); c.beginPath(); c.arc(x + 8, y - 1, 3, 0, 7); c.stroke(); c.beginPath(); c.arc(x + 8, y + 12, 6.5, 3.6, 5.8); c.stroke(); },
    star(c, x, y) { c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 5 : 12, a = -Math.PI / 2 + (i * Math.PI) / 5; c.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } c.closePath(); c.stroke(); },
    money(c, x, y) { c.beginPath(); c.arc(x, y, 11, 0, 7); c.stroke(); c.font = '700 14px sans-serif'; c.fillStyle = INK; c.textAlign = 'center'; c.fillText('$', x, y + 5); c.textAlign = 'left'; },
    chat(c, x, y) { rrect(c, x - 12, y - 9, 24, 16, 5); c.stroke(); c.beginPath(); c.moveTo(x - 4, y + 7); c.lineTo(x - 7, y + 12); c.lineTo(x + 2, y + 7); c.stroke(); },
    idea(c, x, y) { c.beginPath(); c.arc(x, y - 3, 8, 0.7, Math.PI - 0.7, true); c.stroke(); c.beginPath(); c.moveTo(x - 4, y + 8); c.lineTo(x + 4, y + 8); c.moveTo(x - 3, y + 12); c.lineTo(x + 3, y + 12); c.stroke(); },
  };
  E.pills = (ctx, t, e) => {
    const items = e.items || [];
    items.forEach((it, i) => {
      const at = it.at ?? e.t0 + i * 0.6, next = items[i + 1] ? items[i + 1].at ?? at + 0.6 : Infinity;
      const pIn = eo(pr(t, at - 0.06, 0.55)), dim = io(pr(t, next - 0.06, 0.3)) * 0.9, pOut = ci(pr(t, e.t1 - 0.4 + i * 0.05, 0.32));
      const a = clamp(pIn * 1.8) * (1 - pOut) * lerp(1, 0.5, dim); if (a <= 0.004) return; drew = true;
      const f = font(SANS, 34, 600), h = 86, w = 96 + measure(ctx, it.text, f) + 38, x = 112, y = 214 + i * 106, s = lerp(0.9, 1, pIn);
      ctx.save(); ctx.globalAlpha = a; ctx.translate(-(1 - pIn) * 50 - pOut * 70, 0);
      ctx.translate(x, y + h / 2); ctx.scale(s, s); ctx.translate(-x, -(y + h / 2));
      ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 10; rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(14,15,17,0.8)'; ctx.fill();
      ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(242,239,234,0.16)'; ctx.lineWidth = 1.5; ctx.stroke();
      const cx = x + 45, cy = y + h / 2; ctx.beginPath(); ctx.arc(cx, cy, 31, 0, Math.PI * 2); ctx.fillStyle = ACC; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1.12, 1.12); ctx.translate(-cx, -cy); (ICONS[it.icon] || ICONS.star)(ctx, cx, cy); ctx.restore();
      ctx.font = f; ctx.fillStyle = PAPER; ctx.fillText(it.text, x + 96, y + 55); ctx.restore();
    });
  };

  E.splitType = (ctx, t, e) => {
    const po = exitP(t, e);
    const typed = (s, f, x, y, t0, t1, color, align) => {
      const w = measure(ctx, s, f), lx = align === 'right' ? x - w : x;
      for (let i = 0; i < s.length; i++) {
        const ts = lerp(t0, t1, i / s.length) - 0.03, p = eo(pr(t, ts, 0.5));
        text(ctx, s[i], lx + measure(ctx, s.slice(0, i), f), y + (1 - p) * 44, { font: f, color, alpha: clamp(pr(t, ts, 0.14)) * (1 - po), blur: (1 - p) * 8 + po * 10 });
      }
      return w;
    };
    const fq = font(SERIF, 214, 400, true), fo = font(SERIF, 112, 400, true);
    if (e.kicker) slot(ctx, e.kicker, 780, 238, 22, { ...STYLE.kicker(), align: 'right', alpha: 1 - po }, eo(pr(t, e.t0 - 0.05, 0.6)));
    const la = e.leftAt ?? e.t0;
    typed(e.left || '', fq, 782, 425, la, la + 0.5, PAPER, 'right');
    const ma = e.midAt ?? la + 0.5;
    const wo = e.mid ? typed(e.mid, fo, 1172, 425, ma, ma + 0.1, ACC) : 0;
    const ra = e.rightAt ?? ma + 0.1;
    typed(e.right || '', fq, 1172 + (wo ? wo + 24 : 0), 425, ra, ra + 0.26, PAPER);
  };

  E.image = (ctx, t, e, layer) => {
    const img = IMG[e.src]; if (!img) return;
    const mode = e.mode || 'pip';
    if ((mode === 'behind') !== (layer === 'behind')) return;
    const pin = eo(pr(t, e.t0, 0.6)), po = exitP(t, e), a = clamp(pin * 1.5) * (1 - po); if (a <= 0.004) return; drew = true;
    const u = pr(t, e.t0, e.t1 - e.t0);
    ctx.save(); ctx.globalAlpha = a;
    const cover = (x, y, w, h, zoom) => {
      const r = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * r, ih = img.height * r;
      ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    };
    if (mode === 'fullscreen' || mode === 'behind') {
      ctx.beginPath(); ctx.rect(0, 0, BW, BH); ctx.clip();
      if (mode === 'fullscreen') ctx.filter = `blur(${((1 - pin) * 12 + po * 12).toFixed(1)}px)`;
      cover(0, 0, BW, BH, lerp(1.08, 1.0, eo(u)) * (mode === 'behind' ? 1.02 : 1));
      if (mode === 'behind') { ctx.filter = 'none'; ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(0, 0, BW, BH); }
    } else {
      const right = e.side !== 'left', w = mode === 'polaroid' ? 520 : 600, ih = mode === 'polaroid' ? 520 : w * (img.height / img.width);
      const h = Math.min(ih, 640), x = right ? BW - 112 - w : 112, y = (BH - h) / 2 - 40;
      const s = lerp(0.92, 1, pin), rot = mode === 'polaroid' ? (right ? 0.05 : -0.05) * (1 - 0.3 * u) : 0;
      ctx.translate(x + w / 2, y + h / 2 + (1 - pin) * 40); ctx.rotate(rot); ctx.scale(s, s); ctx.translate(-(x + w / 2), -(y + h / 2));
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 20;
      if (mode === 'polaroid') { ctx.fillStyle = PAPER; ctx.fillRect(x - 18, y - 18, w + 36, h + 90); ctx.shadowColor = 'transparent'; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); cover(x, y, w, h, lerp(1.06, 1, u)); }
      else { rrect(ctx, x, y, w, h, 22); ctx.fillStyle = INK; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.clip(); cover(x, y, w, h, lerp(1.06, 1, u)); }
    }
    ctx.restore();
  };

  E.endCard = (ctx, t, e) => {
    const r = (k, d = 0.75) => eo(pr(t, e.t0 + k, d));
    if (e.kicker) slot(ctx, e.kicker, 960, 390, 24, { font: font(SANS, 24, 600), track: 12, color: ACC, align: 'center' }, r(0.1));
    if (e.pre) slot(ctx, e.pre, 960, 462, 40, { font: font(SANS, 40, 500), color: PAPER, alpha: 0.78, align: 'center' }, r(0.25));
    const words = (e.title || '').split(' '), na = e.accentWords ?? 1;
    const a1 = words.slice(0, na).join(' '), a2 = words.slice(na).join(' ');
    const fi = font(SERIF, 112, 400, true), fn = font(SERIF, 112);
    const w1 = a1 ? measure(ctx, a1 + ' ', fi) : 0, w2 = measure(ctx, a2, fn), lx = 960 - (w1 + w2) / 2;
    if (a1) slot(ctx, a1, lx, 588, 112, { font: fi, color: ACC }, r(0.38, 0.85));
    slot(ctx, a2, lx + w1, 588, 112, { font: fn, color: PAPER }, r(0.46, 0.85));
    const lw = 240 * io(pr(t, e.t0 + 0.75, 0.6));
    if (lw > 0) { ctx.save(); ctx.fillStyle = 'rgba(242,239,234,0.35)'; ctx.fillRect(960 - lw / 2, 640, lw, 1.5); ctx.restore(); drew = true; }
    if (e.sub) slot(ctx, e.sub, 960, 702, 28, { font: font(SANS, 28, 500), color: PAPER, alpha: 0.72, align: 'center' }, r(0.85));
  };

  function glow(ctx, t) {
    for (const f of S.fx || []) {
      if (f.type !== 'glow') continue;
      const g = io(pr(t, f.t0, Math.max(0.5, (f.t1 - f.t0) * 0.7))) * (f.amount ?? 0.3) * (1 - ci(pr(t, f.t1 + 0.2, 0.8)));
      if (g <= 0.004) continue; drew = true;
      const rg = ctx.createRadialGradient(980, 430, 0, 980, 430, 1150);
      rg.addColorStop(0, hexA(f.color || '#FF8046', g)); rg.addColorStop(0.45, hexA(ACC, g * 0.42)); rg.addColorStop(1, hexA(ACC, 0));
      ctx.fillStyle = rg; ctx.fillRect(0, 0, BW, BH);
    }
  }
  function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a.toFixed(3)})`; }

  // ---------- captions ----------
  function captions(ctx, t) {
    const C = S.captions; if (!C || !C.enabled || !C.groups) return;
    if ((C.hide || []).some(([a, b]) => t >= a && t <= b)) return;
    const G = C.groups, Wd = S.words;
    let gi = -1; for (let i = 0; i < G.length; i++) if (Wd[G[i][0]].s - 0.06 <= t) gi = i;
    if (gi < 0) return;
    const g = G[gi], last = Wd[g[g.length - 1]], nextStart = G[gi + 1] ? Wd[G[gi + 1][0]].s - 0.06 : Infinity;
    if (t > Math.min(nextStart, last.e + 0.45)) return;
    const f = font(SANS, 46, 600), sp = measure(ctx, ' ', f), ws = g.map((k) => measure(ctx, Wd[k].w, f));
    const total = ws.reduce((a, b) => a + b, 0) + sp * (g.length - 1), p = eo(pr(t, Wd[g[0]].s - 0.06, 0.35));
    const acc = new Set((C.accentWords || []).map((w) => w.toLowerCase()));
    let x = 960 - total / 2;
    g.forEach((k, i) => {
      const w = Wd[k], said = t >= w.s - 0.02, now = said && t < w.e + 0.02;
      text(ctx, w.w, x, 1002 + (1 - p) * 16, { font: f, color: acc.has(w.key) && said ? ACC : PAPER, alpha: p * (said ? 1 : 0.42), shadow: 'rgba(0,0,0,0.65)', scale: now ? 1.04 : 1 });
      x += ws[i] + sp;
    });
  }

  // ---------- layers ----------
  const BEHIND = new Set(['bigWord', 'titleStack', 'nameTitle', 'sideWord', 'splitWords', 'bigLetters', 'graph', 'splitType', 'image']);
  const FRONT = new Set(['bigWord', 'bigLetters', 'cards', 'splitWords', 'chips', 'pills', 'image', 'endCard']);
  function draw(ctx, t, layer) {
    ctx.save(); ctx.scale(S.base.w / BW, S.base.h / BH);
    if (layer === 'behind') glow(ctx, t);
    for (const e of S.elements || []) {
      if (!E[e.type] || !(layer === 'behind' ? BEHIND : FRONT).has(e.type)) continue;
      if (t < e.t0 - 0.3 || t > (e.type === 'endCard' ? Infinity : e.t1 + 0.05)) continue;
      try { E[e.type](ctx, t, e, layer); } catch (err) { console.error(e.type, err); }
    }
    if (layer === 'front') captions(ctx, t);
    ctx.restore();
  }

  window.renderFrame = function (i, layer, n = 5) {
    const t = S.tv[i], dt = 0.5 / S.fps;
    OX.clearRect(0, 0, out.width, out.height); OX.globalCompositeOperation = 'lighter';
    let any = false;
    for (let k = 0; k < n; k++) {
      SX.clearRect(0, 0, out.width, out.height); drew = false;
      draw(SX, t - dt / 2 + (dt * (k + 0.5)) / n, layer);
      any = any || drew; OX.globalAlpha = 1 / n; OX.drawImage(scratch, 0, 0);
    }
    OX.globalAlpha = 1; OX.globalCompositeOperation = 'source-over';
    return any;
  };
  window.drawAt = (ctx, t, layer) => draw(ctx, t, layer); // live preview hook

  const srcs = [...new Set((S.elements || []).filter((e) => e.type === 'image' && e.src).map((e) => e.src))];
  window.ready = Promise.all([
    ...[[SANS, 400], [SANS, 500], [SANS, 600], [SANS, 800], [SERIF, 400]].map(([f, w]) => document.fonts.load(`${w} 40px ${f}`)),
    document.fonts.load(`italic 400 40px ${SERIF}`),
    ...srcs.map((s) => new Promise((res) => { const im = new Image(); im.onload = () => { IMG[s] = im; res(); }; im.onerror = res; im.src = (S.assetBase || '') + s; })),
  ]).then(() => true);
})();
