// Canvas2D "oil/gouache" brush primitives. Everything is seeded and, for wrapping
// textures, each mark is replayed at +/- width so the left and right edges match exactly.

export type RGB = [number, number, number];
export type Pt = [number, number];

const TAU = Math.PI * 2;

export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const c255 = (v: number): number => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v));

export const css = (c: RGB, a = 1): string =>
  `rgba(${c255(c[0])},${c255(c[1])},${c255(c[2])},${a < 0 ? 0 : a > 1 ? 1 : a.toFixed(3)})`;

export const mixc = (a: RGB, b: RGB, t: number): RGB => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

export const mulc = (c: RGB, k: number): RGB => [c[0] * k, c[1] * k, c[2] * k];

export function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface StrokeOpts {
  bristles?: number; // number of bristle lines
  taper?: number; // 0..1, how much the bristles converge at the ends
  dry?: number; // 0..1, how much bristles start late / end early
  vary?: number; // colour variation per bristle
  steps?: number; // samples along the path
  jitter?: number; // random bristle offset
  body?: boolean; // underlying soft body line
}

type Op = { kind: 0 | 1; style: string | CanvasGradient; lw: number; p: Path2D };

const cr = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
  0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);

function samplePath(pts: Pt[], n: number): Pt[] {
  const out: Pt[] = [];
  if (pts.length === 2) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      out.push([pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t]);
    }
    return out;
  }
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * segs;
    const k = Math.min(segs - 1, Math.floor(u));
    const t = u - k;
    const p0 = pts[Math.max(0, k - 1)], p1 = pts[k], p2 = pts[k + 1], p3 = pts[Math.min(segs, k + 2)];
    out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]);
  }
  return out;
}

function polyLen(pts: Pt[]): number {
  let l = 0;
  for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return l;
}

export class Painter {
  readonly cv: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  r: () => number;

  constructor(readonly w: number, readonly h: number, seed: number, readonly wrap = false) {
    this.cv = document.createElement('canvas');
    this.cv.width = w;
    this.cv.height = h;
    this.ctx = this.cv.getContext('2d')!;
    this.r = mulberry(seed);
  }

  reseed(seed: number): void {
    this.r = mulberry(seed);
  }

  rand(a = 0, b = 1): number {
    return a + (b - a) * this.r();
  }

  chance(p: number): boolean {
    return this.r() < p;
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.r() * arr.length) % arr.length];
  }

  // brightness jitter plus a small warm/cool temperature shift
  vary(c: RGB, amt: number): RGB {
    const k = 1 + (this.r() - 0.5) * 2 * amt;
    const t = (this.r() - 0.5) * amt * 55;
    return [c[0] * k + t, c[1] * k + t * 0.25, c[2] * k - t];
  }

  private emit(ops: Op[], minX: number, maxX: number): void {
    const ctx = this.ctx;
    const offs = [0];
    if (this.wrap) {
      if (minX < 0) offs.push(this.w);
      if (maxX > this.w) offs.push(-this.w);
    }
    for (const ox of offs) {
      if (ox) {
        ctx.save();
        ctx.translate(ox, 0);
      }
      for (const op of ops) {
        if (op.kind === 0) {
          ctx.fillStyle = op.style;
          ctx.fill(op.p);
        } else {
          ctx.strokeStyle = op.style;
          ctx.lineWidth = op.lw;
          ctx.stroke(op.p);
        }
      }
      if (ox) ctx.restore();
    }
  }

  stroke(pts: Pt[], width: number, col: RGB, alpha: number, o: StrokeOpts = {}): void {
    if (alpha <= 0.003 || width <= 0) return;
    const len = polyLen(pts);
    const steps = o.steps ?? Math.max(2, Math.min(14, Math.round(len / 12)));
    const S = samplePath(pts, steps);
    const N: Pt[] = S.map((_, i) => {
      const a = S[Math.max(0, i - 1)], b = S[Math.min(steps, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      return [-dy / l, dx / l];
    });
    const nb = o.bristles ?? Math.max(1, Math.min(6, Math.round(width / 3.2)));
    const taper = o.taper ?? 0.7, dry = o.dry ?? 0.15, vary = o.vary ?? 0.06, jit = o.jitter ?? 0.14;
    const ops: Op[] = [];
    let minX = Infinity, maxX = -Infinity;
    for (const s of S) {
      if (s[0] < minX) minX = s[0];
      if (s[0] > maxX) maxX = s[0];
    }
    minX -= width;
    maxX += width;
    if (nb > 1 && o.body !== false) {
      const p = new Path2D();
      for (let i = 0; i <= steps; i++) (i ? p.lineTo : p.moveTo).call(p, S[i][0], S[i][1]);
      ops.push({ kind: 1, style: css(this.vary(col, vary * 0.5), alpha * 0.5), lw: width * 0.5, p });
    }
    for (let b = 0; b < nb; b++) {
      const u = nb === 1 ? 0 : b / (nb - 1) - 0.5;
      const off = u * width * 0.82 + (this.r() - 0.5) * width * jit;
      const bw = nb === 1 ? width : Math.max(0.5, (width / nb) * (1.1 + this.r() * 0.9));
      const style = css(this.vary(col, vary), alpha * (0.5 + this.r() * 0.5));
      const s0 = Math.floor(this.r() * dry * steps), s1 = steps - Math.floor(this.r() * dry * steps);
      if (s1 <= s0) continue;
      const p = new Path2D();
      for (let i = s0; i <= s1; i++) {
        const t = i / steps;
        const tp = 1 - taper * Math.pow(Math.abs(2 * t - 1), 2);
        const x = S[i][0] + N[i][0] * off * tp, y = S[i][1] + N[i][1] * off * tp;
        if (i === s0) p.moveTo(x, y);
        else p.lineTo(x, y);
      }
      ops.push({ kind: 1, style, lw: bw, p });
    }
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.emit(ops, minX, maxX);
  }

  dab(x: number, y: number, len: number, width: number, ang: number, col: RGB, alpha: number, o: StrokeOpts = {}): void {
    const dx = (Math.cos(ang) * len) / 2, dy = (Math.sin(ang) * len) / 2;
    this.stroke([[x - dx, y - dy], [x + dx, y + dy]], width, col, alpha, { steps: 3, ...o });
  }

  poly(pts: Pt[], col: RGB | CanvasGradient, alpha = 1): void {
    const p = new Path2D();
    let minX = Infinity, maxX = -Infinity;
    pts.forEach((q, i) => {
      if (i) p.lineTo(q[0], q[1]);
      else p.moveTo(q[0], q[1]);
      if (q[0] < minX) minX = q[0];
      if (q[0] > maxX) maxX = q[0];
    });
    p.closePath();
    const style = Array.isArray(col) ? css(col, alpha) : col;
    if (!Array.isArray(col)) this.ctx.globalAlpha = alpha;
    this.emit([{ kind: 0, style, lw: 0, p }], minX, maxX);
    this.ctx.globalAlpha = 1;
  }

  ellipse(x: number, y: number, rx: number, ry: number, col: RGB, alpha: number, rot = 0): void {
    const p = new Path2D();
    p.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot, 0, TAU);
    this.emit([{ kind: 0, style: css(col, alpha), lw: 0, p }], x - rx, x + rx);
  }

  radial(x: number, y: number, r: number, col: RGB, a0: number, a1 = 0): void {
    const g = this.ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, css(col, a0));
    g.addColorStop(1, css(col, a1));
    const p = new Path2D();
    p.rect(x - r, y - r, r * 2, r * 2);
    this.emit([{ kind: 0, style: g, lw: 0, p }], x - r, x + r);
  }

  vgrad(x: number, y: number, w: number, h: number, stops: Array<[number, RGB, number]>): void {
    const g = this.ctx.createLinearGradient(0, y, 0, y + h);
    for (const [t, c, a] of stops) g.addColorStop(t, css(c, a));
    this.ctx.fillStyle = g;
    this.ctx.fillRect(x, y, w, h);
  }

  clip(pts: Pt[], fn: () => void): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
    ctx.closePath();
    ctx.clip();
    fn();
    ctx.restore();
  }

  // irregular rounded blob outline; flat makes the lower half sit flat on the ground
  blobPts(cx: number, cy: number, rx: number, ry: number, rough = 0.16, n = 24, flat = 0): Pt[] {
    const ph = this.r() * 10, ph2 = this.r() * 10;
    const pts: Pt[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const k = 1 + rough * (Math.sin(a * 3 + ph) * 0.55 + Math.sin(a * 5 + ph2) * 0.3 + (this.r() - 0.5) * 0.5);
      let x = cx + Math.cos(a) * rx * k;
      let y = cy + Math.sin(a) * ry * k;
      if (flat > 0 && y > cy) y = cy + (y - cy) * (1 - flat) + ry * flat * Math.min(1, Math.sin(a) * 1.4);
      if (flat > 0 && y > cy + ry) y = cy + ry;
      x = Math.round(x * 10) / 10;
      pts.push([x, y]);
    }
    return pts;
  }

  // paint the inside of a closed shape with directional strokes (clipped)
  fillStrokes(pts: Pt[], base: RGB, light: RGB, dark: RGB, density: number, o: { ang?: number; len?: [number, number]; w?: [number, number]; alpha?: number; lightDir?: Pt } = {}): void {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const q of pts) {
      x0 = Math.min(x0, q[0]);
      x1 = Math.max(x1, q[0]);
      y0 = Math.min(y0, q[1]);
      y1 = Math.max(y1, q[1]);
    }
    const ld = o.lightDir ?? [0.6, -0.8];
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hw = Math.max(1, (x1 - x0) / 2), hh = Math.max(1, (y1 - y0) / 2);
    const area = (x1 - x0) * (y1 - y0);
    const n = Math.max(3, Math.round((area / 260) * density));
    const ang = o.ang ?? 0;
    const [l0, l1] = o.len ?? [8, 22];
    const [w0, w1] = o.w ?? [3, 7];
    const alpha = o.alpha ?? 0.55;
    this.clip(pts, () => {
      for (let i = 0; i < n; i++) {
        const x = this.rand(x0, x1), y = this.rand(y0, y1);
        const lit = ((x - cx) / hw) * ld[0] + ((y - cy) / hh) * ld[1];
        const c = lit > 0 ? mixc(base, light, Math.min(1, lit * 0.9)) : mixc(base, dark, Math.min(1, -lit * 0.9));
        this.dab(x, y, this.rand(l0, l1), this.rand(w0, w1), ang + this.rand(-0.35, 0.35), c, alpha * this.rand(0.6, 1));
      }
    });
  }

  flipX(): HTMLCanvasElement {
    const c = document.createElement('canvas');
    c.width = this.w;
    c.height = this.h;
    const x = c.getContext('2d')!;
    x.translate(this.w, 0);
    x.scale(-1, 1);
    x.drawImage(this.cv, 0, 0);
    return c;
  }
}

// smooth periodic profile across a wrapping width (integer frequencies keep the seam exact)
export function periodic(rnd: () => number, w: number, terms: Array<[number, number]>): (x: number) => number {
  const ph = terms.map(() => rnd() * TAU);
  return (x: number) => {
    let s = 0;
    terms.forEach(([k, a], i) => (s += a * Math.sin((TAU * k * x) / w + ph[i])));
    return s;
  };
}
