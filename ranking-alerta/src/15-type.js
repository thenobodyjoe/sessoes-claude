// ============================================================
// Kinetic type. Lines are laid out letter by letter (advances measured from prefixes, so Poppins'
// kerning survives) and every letter animates on its own clock: masked rises, slams, pops.
// ============================================================
const _adv = new Map();
function layoutLine(ctx, text, weight, size, track) {
  const key = `${weight}|${size}|${track}|${text}`;
  let L = _adv.get(key);
  if (L) return L;
  ctx.save();
  ctx.font = FONT(weight, size);
  const xs = [];
  for (let i = 0; i < text.length; i++) xs.push(ctx.measureText(text.slice(0, i)).width + i * track);
  const w = ctx.measureText(text).width + (text.length - 1) * track;
  const ws = [];
  for (let i = 0; i < text.length; i++) ws.push(ctx.measureText(text[i]).width);
  ctx.restore();
  L = { xs, ws, w };
  _adv.set(key, L);
  return L;
}
// the largest size <= size at which the line fits in maxW
function fitSize(ctx, text, weight, size, track, maxW) {
  const L = layoutLine(ctx, text, weight, size, track);
  return L.w <= maxW ? size : Math.floor(size * maxW / L.w);
}

// o: { text, x, y (baseline), size, weight, color, align ('center'|'left'|'right'), track,
//      tIn, tOut (beats), style ('rise'|'slam'|'pop'|'drop'), stagger (beats), dur (beats),
//      mask (clip rises to the line box), maxW, hl: {from, to, color, text, b} marker highlight }
// b: current beat. Returns the laid-out box (for leaders, markers...).
function kLine(ctx, b, o) {
  const weight = o.weight || 800, track = o.track || 0;
  let size = o.size;
  if (o.maxW) size = fitSize(ctx, o.text, weight, size, track, o.maxW);
  const L = layoutLine(ctx, o.text, weight, size, track);
  const x0 = o.align === 'left' ? o.x : o.align === 'right' ? o.x - L.w : o.x - L.w / 2;
  const box = { x: x0, y: o.y, w: L.w, size, top: o.y - size * 0.78, bot: o.y + size * 0.22 };
  if (b < o.tIn - 0.01 || (o.tOut !== undefined && b > o.tOut + (o.outDur || 0.6) + 0.2)) return box;
  const style = o.style || 'rise', st = o.stagger === undefined ? 0.045 : o.stagger, dur = o.dur || 0.9;
  const n = o.text.length;
  ctx.save();
  ctx.font = FONT(weight, size);
  ctx.textBaseline = 'alphabetic';
  if (o.mask) {
    ctx.beginPath();
    ctx.rect(x0 - size, o.y - size * 1.05, L.w + size * 2, size * 1.42);
    ctx.clip();
  }
  // highlight marker behind a span of letters
  if (o.hl && b >= o.hl.b) {
    const h = o.hl, p = pr(b, h.b, h.b + 0.55, E.outExpo);
    const hx0 = x0 + L.xs[h.from] - size * 0.12, hx1 = x0 + L.xs[h.to - 1] + L.ws[h.to - 1] + size * 0.12;
    ctx.fillStyle = h.color;
    ctx.save();
    ctx.transform(1, 0, -0.18, 1, o.y * 0.18, 0);
    ctx.fillRect(hx0, o.y - size * 0.8, (hx1 - hx0) * p, size * 0.98);
    ctx.restore();
  }
  for (let i = 0; i < n; i++) {
    const ch = o.text[i];
    if (ch === ' ') continue;
    const bi = o.ats ? o.ats[i] : o.tIn + i * st;
    const pIn = seg(b, bi, bi + dur);
    let pOut = 0;
    if (o.tOut !== undefined) { const bo = o.tOut + i * (o.outStagger === undefined ? st * 0.6 : o.outStagger); pOut = seg(b, bo, bo + (o.outDur || 0.5)); }
    if (pIn <= 0 || pOut >= 1) continue;
    let dx = 0, dy = 0, sc = 1, al = 1, rot = 0;
    if (style === 'rise') { dy = (1 - E.outExpo(pIn)) * size * 1.1; }
    else if (style === 'drop') { dy = -(1 - E.outExpo(pIn)) * size * 1.1; }
    else if (style === 'pop') { sc = E.outBack(pIn, 2.2); al = Math.min(1, pIn * 4); rot = (1 - E.outCubic(pIn)) * (hash(i + n) - 0.5) * 0.9; }
    else if (style === 'slam') { const q = E.outExpo(pIn); sc = lerp(2.6, 1, q); al = Math.min(1, pIn * 5); }
    else if (style === 'hit') { sc = lerp(1.35, 1, E.outExpo(pIn)); al = Math.min(1, pIn * 9); }
    if (pOut > 0) {
      const q = E.inExpo(pOut);
      if (o.outStyle === 'fall') dy += q * size * 1.2;
      else if (o.outStyle === 'fade') al *= 1 - q;
      else dy -= q * size * 1.15;
    }
    if (al <= 0.001 || sc <= 0.001) continue;
    const cx = x0 + L.xs[i] + L.ws[i] / 2, cy = o.y - size * 0.35;
    ctx.save();
    ctx.globalAlpha *= al;
    ctx.translate(cx + dx, cy + dy);
    if (rot) ctx.rotate(rot);
    if (sc !== 1) ctx.scale(sc, sc);
    let col = o.color || C.white;
    if (o.hl && i >= o.hl.from && i < o.hl.to && b >= o.hl.b && o.hl.text) col = mix(col, o.hl.text, pr(b, o.hl.b, o.hl.b + 0.3));
    if (o.colors && o.colors[i]) col = o.colors[i];
    ctx.fillStyle = col;
    ctx.fillText(ch, -L.ws[i] / 2, size * 0.35);
    // slam smear: a couple of fading ghosts trailing the letter as it lands
    if (style === 'slam' && pIn < 0.45) {
      ctx.globalAlpha *= 0.25;
      ctx.scale(1.18, 1.18); ctx.fillText(ch, -L.ws[i] / 2, size * 0.35);
      ctx.scale(1.18, 1.18); ctx.fillText(ch, -L.ws[i] / 2, size * 0.35);
    }
    ctx.restore();
  }
  ctx.restore();
  return box;
}

// small caps label with wide tracking
function label(ctx, text, x, y, size, color, align, track, weight) {
  ctx.save();
  ctx.font = FONT(weight || 700, size);
  const L = layoutLine(ctx, text, weight || 700, size, track || 0);
  const x0 = align === 'left' ? x : align === 'right' ? x - L.w : x - L.w / 2;
  ctx.fillStyle = color;
  if (!track) ctx.fillText(text, x0, y);
  else for (let i = 0; i < text.length; i++) ctx.fillText(text[i], x0 + L.xs[i], y);
  ctx.restore();
  return L.w;
}
