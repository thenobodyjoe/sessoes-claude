// ============================================================
// The soundtrack: an original samba-electronic cue, synthesised with WebAudio, no samples.
// A bateria (surdo, caixa, tamborim, agogô, ganzá) over a four-on-the-floor kick and a pumping bass,
// the mestre's whistle calling the drop, a cuíca, brass stabs on every cut, and the sound design
// locked to the picture: the failing lamp, the counters, the typing, the stopwatch, the urna's beeps.
// A minor, then F, C, G (the hemiola bars), a breakdown for the urna, and a resolution to C major
// on the logo. The whole score is rendered offline once, then played (or written to WAV).
// ============================================================
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
const SCORE = [];
let A = null;       // the active desk while rendering

function buildDesk(ctx) {
  const out = ctx.createGain(); out.gain.value = 0.55;
  const lowS = ctx.createBiquadFilter(); lowS.type = 'lowshelf'; lowS.frequency.value = 90; lowS.gain.value = 2;
  const highS = ctx.createBiquadFilter(); highS.type = 'highshelf'; highS.frequency.value = 7000; highS.gain.value = 3;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3.5; comp.attack.value = 0.004; comp.release.value = 0.16;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  out.connect(lowS); lowS.connect(highS); highS.connect(comp); comp.connect(lim); lim.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 2.4, 3.2);
  const revG = ctx.createGain(); revG.gain.value = 0.3; rev.connect(revG); revG.connect(out);
  // everything tonal goes through the pump (ducked by the kick)
  const pump = ctx.createGain(); pump.connect(out);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nb.getChannelData(0), r = mulberry(99);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  return { ctx, out, rev, pump, noise: nb };
}
function impulse(ctx, dur, decay) {
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate), r = mulberry(11);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}

// ---------- building blocks
function G(v) { const g = A.ctx.createGain(); g.gain.value = v; return g; }
function osc(type, f, t, end) { f = Math.min(f, A.ctx.sampleRate * 0.45); const o = A.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(end); return o; }
function noise(t, end) { const s = A.ctx.createBufferSource(); s.buffer = A.noise; s.loop = true; s.start(t, (t * 7.31) % 1.5); s.stop(end); return s; }
function filt(type, f, q) { const x = A.ctx.createBiquadFilter(); x.type = type; x.frequency.value = f; if (q) x.Q.value = q; return x; }
function pan(p) { const x = A.ctx.createStereoPanner(); x.pan.value = p; return x; }
function perc(g, t, v, dec, att) {
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(v, t + (att || 0.002));
  g.gain.exponentialRampToValueAtTime(0.0001, t + (att || 0.002) + dec);
}
function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
function sendRev(node, amt) { if (amt > 0) { const g = G(amt); node.connect(g); g.connect(A.rev); } }
const DEST = () => A.out;

// ---------- the bateria
function kickD(t, v) {
  const o = osc('sine', 150, t, t + 0.5);
  o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  const g = G(0); perc(g, t, v, 0.42);
  chain(o, g, DEST());
  const n = noise(t, t + 0.03), f = filt('highpass', 2500), g2 = G(0); perc(g2, t, v * 0.25, 0.012);
  chain(n, f, g2, DEST());
  // duck the tonal bus
  A.pump.gain.cancelScheduledValues(t);
  A.pump.gain.setValueAtTime(1, t); A.pump.gain.linearRampToValueAtTime(0.4, t + 0.012); A.pump.gain.linearRampToValueAtTime(1, t + 0.2);
}
function surdo(t, v, open) {
  const o = osc('sine', 100, t, t + 1.2);
  o.frequency.setValueAtTime(112, t); o.frequency.exponentialRampToValueAtTime(64, t + 0.07);
  const g = G(0); perc(g, t, v, open ? 0.8 : 0.16);
  const p = pan(-0.12);
  chain(o, g, p, DEST());
  const o2 = osc('triangle', 128, t, t + 0.3), g2 = G(0); perc(g2, t, v * 0.25, 0.1);
  chain(o2, g2, p);
  const n = noise(t, t + 0.08), f = filt('lowpass', 500), g3 = G(0); perc(g3, t, v * 0.5, 0.04);
  chain(n, f, g3, p);
  sendRev(g, open ? 0.15 : 0);
}
function caixa(t, v) {
  const n = noise(t, t + 0.12), f = filt('bandpass', 3400, 0.8), hp = filt('highpass', 1400), g = G(0); perc(g, t, v, 0.075);
  const p = pan(0.16);
  chain(n, f, hp, g, p, DEST());
  const o = osc('triangle', 250, t, t + 0.06), g2 = G(0); perc(g2, t, v * 0.3, 0.035);
  o.frequency.exponentialRampToValueAtTime(190, t + 0.04);
  chain(o, g2, p);
}
function tamborim(t, v) {
  const o = osc('triangle', 880, t, t + 0.1);
  o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(760, t + 0.03);
  const g = G(0); perc(g, t, v, 0.06);
  const p = pan(0.45);
  chain(o, g, p, DEST());
  const n = noise(t, t + 0.03), f = filt('bandpass', 5200, 1.2), g2 = G(0); perc(g2, t, v * 0.6, 0.018);
  chain(n, f, g2, p);
  sendRev(g, 0.08);
}
function agogo(t, v, hi) {
  const f0 = hi ? 1245 : 932, p = pan(-0.42);
  for (const [m, k] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
    const o = osc('sine', f0 * m, t, t + 0.5), g = G(0); perc(g, t, v * k, 0.3 / m + 0.05);
    chain(o, g, p);
  }
  p.connect(DEST());
  sendRev(p, 0.12);
}
function ganza(t, v, pp) {
  const n = noise(t, t + 0.08), f = filt('highpass', 6800), g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  chain(n, f, g, pan(pp || 0), DEST());
}
function clap(t, v) {
  const n = noise(t, t + 0.25), f = filt('bandpass', 1500, 1.1), g = G(0);
  g.gain.setValueAtTime(0, t);
  for (let k = 0; k < 3; k++) { g.gain.setValueAtTime(v, t + k * 0.011); g.gain.exponentialRampToValueAtTime(v * 0.2, t + k * 0.011 + 0.009); }
  g.gain.setValueAtTime(v * 0.8, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  chain(n, f, g, DEST());
  sendRev(g, 0.25);
}
function hat(t, v, open) {
  const n = noise(t, t + 0.4), f = filt('highpass', 8500), g = G(0); perc(g, t, v, open ? 0.2 : 0.04);
  chain(n, f, g, pan(0.3), DEST());
}
function crash(t, v) {
  const n = noise(t, t + 2.2), f = filt('highpass', 4200), g = G(0); perc(g, t, v, 1.6);
  const f2 = filt('peaking', 9000, 1); f2.gain.value = 6;
  chain(n, f, f2, g, DEST());
  sendRev(g, 0.35);
}
const rollD = (t, dur, v0, v1) => roll(t, t + dur, v0, v1);
function roll(t0, t1, v0, v1) {
  // a caixa roll that speeds from 16ths to 32nds and swells
  let t = t0;
  while (t < t1) {
    const u = (t - t0) / (t1 - t0);
    caixa(t, lerp(v0, v1, u * u));
    t += u < 0.5 ? BEAT / 4 : BEAT / 8;
  }
}

// ---------- tonal
function bass(t, m, dur, v) {
  const f = mtof(m);
  const o1 = osc('sawtooth', f, t, t + dur + 0.1), o2 = osc('square', f / 2, t, t + dur + 0.1);
  const lp = filt('lowpass', 1500, 6);
  lp.frequency.setValueAtTime(1600, t); lp.frequency.exponentialRampToValueAtTime(240, t + dur);
  const g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006);
  g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
  const g2 = G(0.55);
  o1.connect(lp); o2.connect(g2); g2.connect(lp);
  chain(lp, g, A.pump);
}
function brass(t, notes, dur, v, rev) {
  const p = G(1);
  for (const m of notes) {
    for (const det of [-7, 6]) {
      const o = osc('sawtooth', mtof(m), t, t + dur + 0.3); o.detune.value = det;
      const lp = filt('lowpass', 400, 1.5);
      lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(3600, t + 0.035); lp.frequency.exponentialRampToValueAtTime(1300, t + dur);
      const g = G(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v / notes.length, t + 0.012);
      g.gain.setValueAtTime(v / notes.length * 0.8, t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.14);
      chain(o, lp, g, p);
    }
  }
  p.connect(A.pump);
  sendRev(p, rev === undefined ? 0.25 : rev);
}
function pad(t, notes, dur, v, cutoff) {
  const p = G(1);
  for (const m of notes) {
    for (const det of [-11, 0, 12]) {
      const o = osc('sawtooth', mtof(m), t, t + dur + 1); o.detune.value = det;
      const g = G(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v / notes.length / 3, t + 0.3);
      g.gain.setValueAtTime(v / notes.length / 3, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.7);
      chain(o, g, p);
    }
  }
  const lp = filt('lowpass', cutoff || 1100, 0.7);
  chain(p, lp, A.pump);
  sendRev(lp, 0.45);
}
function pluck(t, m, v, dec) {
  const o = osc('sawtooth', mtof(m), t, t + 1.2), o2 = osc('triangle', mtof(m + 12), t, t + 1.2);
  const lp = filt('lowpass', 5000, 3);
  lp.frequency.setValueAtTime(6000, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.35);
  const g = G(0); perc(g, t, v, dec || 0.6);
  o.connect(lp); o2.connect(lp);
  chain(lp, g, A.out);
  sendRev(g, 0.35);
}
function plink(t, m, v, p) {
  const f = mtof(m), q = pan(p || 0);
  for (const [k, a, d] of [[1, 1, 0.22], [3.01, 0.25, 0.08], [5.2, 0.08, 0.05]]) {
    const o = osc('sine', f * k, t, t + 0.4), g = G(0); perc(g, t, v * a, d);
    chain(o, g, q);
  }
  q.connect(A.out);
  sendRev(q, 0.25);
}
function bell(t, m, v) {
  for (const [k, a, d] of [[1, 1, 1.4], [2.0, 0.4, 0.9], [2.76, 0.3, 0.6], [5.4, 0.12, 0.3]]) {
    const o = osc('sine', mtof(m) * k, t, t + 2), g = G(0); perc(g, t, v * a, d);
    chain(o, g, A.out); sendRev(g, 0.4);
  }
}

// ---------- sound design
function whoosh(t, dur, v, up, pp0, pp1) {
  if (pp0 === undefined) pp0 = -0.6;
  const n = noise(t, t + dur + 0.05), f = filt('bandpass', 800, 1.4), g = G(0), p = pan(pp0);
  f.frequency.setValueAtTime(up === false ? 5000 : 350, t); f.frequency.exponentialRampToValueAtTime(up === false ? 350 : 5500, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  p.pan.setValueAtTime(pp0, t); p.pan.linearRampToValueAtTime(pp1 === undefined ? 0.6 : pp1, t + dur);
  chain(n, f, g, p, A.out);
  sendRev(g, 0.2);
}
function swell(tEnd, dur, v) {
  // reversed-cymbal style rise that stops dead on tEnd
  const t = tEnd - dur, n = noise(t, tEnd), f = filt('highpass', 2500), g = G(0);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, tEnd - 0.005); g.gain.setValueAtTime(0, tEnd);
  f.frequency.setValueAtTime(1500, t); f.frequency.exponentialRampToValueAtTime(7000, tEnd);
  chain(n, f, g, A.out);
}
function impact(t, v) {
  const o = osc('sine', 70, t, t + 1.6), g = G(0);
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.1);
  perc(g, t, v, 1.3);
  chain(o, g, A.out);
  const n = noise(t, t + 0.6), f = filt('lowpass', 1200), g2 = G(0); perc(g2, t, v * 0.7, 0.35);
  chain(n, f, g2, A.out);
  sendRev(g2, 0.6);
}
function whistle(t, dur, v, trill) {
  // the mestre's apito: a bright tone warbling between two pitches (the pea in the whistle)
  const o = osc('sine', 2900, t, t + dur + 0.05);
  const lfo = osc('square', trill || 27, t, t + dur + 0.05), lg = G(170);
  lfo.connect(lg); lg.connect(o.frequency);
  const g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.012);
  g.gain.setValueAtTime(v, t + dur - 0.03); g.gain.linearRampToValueAtTime(0, t + dur);
  const lp = filt('lowpass', 6000);
  chain(o, lp, g, pan(0.1), A.out);
  const n = noise(t, t + dur), bp = filt('bandpass', 3000, 2), g2 = G(0);
  g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(v * 0.25, t + 0.01); g2.gain.linearRampToValueAtTime(0, t + dur);
  chain(n, bp, g2, A.out);
  sendRev(g, 0.2);
}
function cuica(t, dur, v, f0, f1) {
  // the cuíca's squeaky "uói": a glide up and back through a nasal formant
  const o = osc('sawtooth', f0, t, t + dur + 0.05);
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.4); o.frequency.exponentialRampToValueAtTime(f0 * 1.1, t + dur);
  const bp = filt('bandpass', f1 * 1.5, 6);
  bp.frequency.setValueAtTime(f0 * 1.6, t); bp.frequency.exponentialRampToValueAtTime(f1 * 1.8, t + dur * 0.4); bp.frequency.exponentialRampToValueAtTime(f0 * 1.7, t + dur);
  const g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.03); g.gain.setValueAtTime(v, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  chain(o, bp, g, pan(-0.3), A.out);
  sendRev(g, 0.2);
}
function click(t, v, f) {
  const n = noise(t, t + 0.03), bp = filt('bandpass', f || 3000, 2), g = G(0); perc(g, t, v, 0.014);
  chain(n, bp, g, A.out);
  const o = osc('square', (f || 3000) * 0.6, t, t + 0.02), g2 = G(0); perc(g2, t, v * 0.25, 0.008);
  chain(o, g2, A.out);
}
function beep(t, dur, v, f) {
  const o = osc('square', f || 1050, t, t + dur + 0.01), lp = filt('lowpass', 3500), g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.004); g.gain.setValueAtTime(v, t + dur - 0.006); g.gain.linearRampToValueAtTime(0, t + dur);
  chain(o, lp, g, A.out);
}
function zap(t, v) {
  const o = osc('sawtooth', 110, t, t + 0.07), n = noise(t, t + 0.07), bp = filt('bandpass', 1800, 0.8), g = G(0); perc(g, t, v, 0.05);
  o.connect(bp); n.connect(bp); chain(bp, g, A.out);
}
function hum(t, dur, v) {
  const o = osc('sawtooth', 100, t, t + dur), lp = filt('lowpass', 700), g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.1); g.gain.setValueAtTime(v, t + dur - 0.1); g.gain.linearRampToValueAtTime(0, t + dur);
  chain(o, lp, g, A.out);
}
function pop(t, v, m) {
  const o = osc('sine', mtof(m || 79), t, t + 0.12), g = G(0);
  o.frequency.setValueAtTime(mtof((m || 79) - 12), t); o.frequency.exponentialRampToValueAtTime(mtof(m || 79), t + 0.04);
  perc(g, t, v, 0.09);
  chain(o, g, A.out);
}
function slurp(t, dur, v) {
  const o = osc('sine', 1400, t, t + dur), g = G(0);
  o.frequency.setValueAtTime(1600, t); o.frequency.exponentialRampToValueAtTime(140, t + dur);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  chain(o, g, A.out);
  sendRev(g, 0.3);
}
function shimmer(t, dur, v, notes) {
  notes.forEach((m, i) => {
    const o = osc('sine', mtof(m), t, t + dur + 0.5), trem = osc('sine', 5 + i, t, t + dur + 0.5), tg = G(0.4);
    const g = G(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v / notes.length, t + 0.2 + i * 0.05); g.gain.linearRampToValueAtTime(0, t + dur);
    trem.connect(tg); tg.connect(g.gain);
    chain(o, g, A.out); sendRev(g, 0.7);
  });
}

// ---------- the score
// Sound effects are written in story beats (ev) and land wherever the picture puts that moment on
// the 45-second clock; the music is written in output beats (evO) on 24 bars of 128 BPM.
const evO = (ob, fn, ...a) => SCORE.push({ t: ob * BEAT, fn, a });
const ev = (sb, fn, ...a) => evO(outBeat(sb), fn, ...a);
const span = (sb0, sb1) => (outBeat(sb1) - outBeat(sb0)) * BEAT;     // seconds between two story beats
const CH = {
  Am: { root: 45, pad: [57, 60, 64, 69] },
  F: { root: 41, pad: [57, 60, 65, 69] },
  C: { root: 48, pad: [55, 60, 64, 67] },
  G: { root: 43, pad: [55, 59, 62, 67] },
};
// chord and arrangement for output bar k (beats 4k..4k+4)
function barPlan(k) {
  if (k < 3) return { ch: CH.Am, mode: 'hook' };
  if (k < 16) {
    const ch = [CH.Am, CH.F, CH.C, CH.G][(k - 3) % 4];
    if (k === 9 || k === 10) return { ch, mode: 'verse' };       // "consulte o ranking": lighter
    if (k >= 14) return { ch, mode: 'clock' };                    // the stopwatch
    return { ch, mode: 'full' };
  }
  if (k < 19) return { ch: CH.Am, mode: k === 18 ? 'build' : 'urna' };
  if (k < 22) return { ch: k === 20 ? CH.G : CH.F, mode: 'logo', ch2: k === 21 ? CH.G : null };
  return { ch: CH.C, mode: 'outro' };
}
function groove(k) {
  const P = barPlan(k), m = P.mode;
  if (m === 'hook' || m === 'outro') return;
  for (let s = 0; s < 16; s++) {
    const ob = k * 4 + s / 4;
    const ch = P.ch2 && s >= 8 ? P.ch2 : P.ch;
    const drums = m === 'full' || m === 'logo' || m === 'verse';
    if (s % 4 === 0 && m !== 'urna') evO(ob, kickD, m === 'build' ? 0.6 : 0.95);
    if (s === 4 || s === 12) evO(ob, surdo, m === 'urna' ? 0.6 : 0.85, true);
    if (s === 0 || s === 8) evO(ob, surdo, m === 'urna' ? 0.5 : 0.4, false);
    if (drums) evO(ob, caixa, [2, 3, 6, 10, 11, 14].includes(s) ? (m === 'verse' ? 0.2 : 0.3) : (m === 'verse' ? 0.06 : 0.1));
    if (drums && [0, 2, 3, 5, 7, 9, 10, 12, 14].includes(s)) evO(ob, tamborim, [0, 3, 7, 10, 14].includes(s) ? 0.3 : 0.16);
    if ((m === 'full' || m === 'logo') && k % 2 === 1) { const ag = { 0: 0, 3: 1, 6: 1, 10: 0, 12: 1 }; if (s in ag) evO(ob, agogo, 0.16, ag[s]); }
    evO(ob, ganza, s % 2 ? 0.16 : 0.07, s % 4 < 2 ? -0.25 : 0.25);
    if ((s === 4 || s === 12) && drums) evO(ob, clap, 0.32);
    if (s % 4 === 2 && drums) evO(ob, hat, 0.1, true);
    if (m !== 'urna') { const pat = { 0: 0, 3: 12, 6: 0, 8: 7, 11: 12, 14: 0 }; if (s in pat) evO(ob, bass, ch.root + pat[s], s === 14 ? 0.1 : 0.16, 0.34); }
    if (m === 'logo' && [0, 3, 6, 10, 12].includes(s)) evO(ob, brass, ch.pad.map(n => n + 12).slice(1), 0.1, s === 0 ? 0.34 : 0.2);
  }
  if (m !== 'logo') evO(k * 4, pad, P.ch.pad, 4 * BEAT, m === 'urna' || m === 'build' ? 0.26 : 0.1, m === 'urna' ? 1100 : 1400);
  else { evO(k * 4, pad, P.ch.pad, (P.ch2 ? 2 : 4) * BEAT, 0.12, 1600); if (P.ch2) evO(k * 4 + 2, pad, P.ch2.pad, 2 * BEAT, 0.12, 1600); }
}

function buildScore() {
  SCORE.length = 0;
  for (let k = 0; k < OUT_BEATS / 4; k++) groove(k);
  // ===== the hook: a drone, a heartbeat, the lamp
  evO(0, whistle, 0.42, 0.22, 26);
  evO(0, pad, [45, 57, 60, 64], 12 * BEAT - 0.3, 0.3, 750);
  for (let ob = 0.5; ob < 10; ob += 2) { evO(ob, surdo, 0.5, false); evO(ob + 0.4, surdo, 0.36, false); }
  ev(0.05, hum, span(0.05, 0.9), 0.035);
  ev(0.1, shimmer, span(0.1, 0.9), 0.05, [88, 93]);
  evO(outBeat(1), swell, 0.45, 0.12);
  ev(1, surdo, 1, true); ev(1, impact, 0.35); ev(1, brass, [45, 57, 64], 0.16, 0.22, 0.4);
  ev(2, surdo, 1, true); ev(2, impact, 0.55); ev(2, brass, [45, 57, 60, 64], 0.2, 0.28, 0.45);
  ev(2.06, hum, span(2.06, 3.5), 0.05);
  let prev = 0;
  for (let b = 2.0; b < 3.5; b += 1 / 16) { const l = lampAt(b); if (Math.abs(l - prev) > 0.3) ev(b, zap, 0.16 + 0.06 * hash(b * 16)); prev = l; }
  for (let ob = 6; ob < 10; ob += 0.5) evO(ob, hat, 0.06 + (ob - 6) * 0.012, false);
  evO(8, surdo, 0.5, true);
  ev(3.0, rollD, span(3.0, 3.5), 0.1, 0.45);
  ev(3.0, swell, span(3.0, 3.5), 0.2);
  ev(3.5, whistle, 0.09, 0.34, 30);
  ev(3.75, whistle, 0.19, 0.38, 30);
  evO(12, swell, span(3.6, 4), 0.3);
  // ===== the cuts: brass + crash on every scene change
  ev(4, impact, 0.9); ev(4, crash, 0.34); ev(4, brass, [57, 64, 69, 72], 0.26, 0.5);
  for (const [b, ch] of [[8, CH.Am], [11, CH.F], [14, CH.Am], [17, CH.Am], [20, CH.Am]]) {
    ev(b, brass, ch.pad.map(m => m + 12).slice(1), 0.18, 0.38); ev(b, crash, 0.14); ev(b, impact, 0.3);
  }
  // scene 2: flag and Congress
  for (let i = 0; i < 4; i++) ev(4.08 + i * 0.07, click, 0.1, 1800 + i * 300);
  const penta = [69, 72, 74, 76, 79, 81, 84, 86, 88];
  for (let i = 0; i < 27; i++) ev(4.6 + i * 0.028, plink, penta[i % 9] + (i > 17 ? 12 : 0) - 12, 0.05, (i % 5) / 2.5 - 0.8);
  ev(5.5, whoosh, span(5.5, 6.3), 0.3, true);
  ev(6.0, whoosh, span(6.0, 6.75), 0.25, true, 0, 0);
  ev(6.75, surdo, 0.5, true);
  for (let b = 6.4; b < 7.3; b += 1 / 16) ev(b, click, 0.05, 4200);
  ev(6.4, brass, [64, 69, 72], 0.1, 0.24); ev(6.55, brass, [69, 72, 76], 0.1, 0.24);
  ev(7.25, whoosh, span(7.25, 8.0), 0.34, true);
  // scene 3: the plenary pops in, then drains into the ranking
  for (let i = 0; i < 24; i++) ev(8.05 + i * 0.037, plink, penta[i % 9] - 12 + Math.floor(i / 9) * 12, 0.04, i / 12 - 1);
  ev(9.05, whoosh, span(9.05, 9.9), 0.12, true);
  ev(9.3, pop, 0.2, 76); ev(9.45, pop, 0.2, 72);
  ev(10.3, slurp, span(10.3, 10.95), 0.14);
  ev(10.4, whoosh, span(10.4, 10.9), 0.25, false);
  // scene 4: the ranking card
  ev(10.85, whoosh, span(10.85, 11.4), 0.3, true, 0.2, -0.2);
  ev(11.55, click, 0.28, 2400); ev(13.35, click, 0.28, 2400); ev(16.2, click, 0.28, 2400);
  for (let i = 0; i < 18; i++) ev(11.65 + i * 0.075, click, 0.08 + 0.04 * hash(i), 3600 + 800 * hash(i * 3));
  for (let b = 12.2; b < 13.5; b += 1 / 16) ev(b, click, 0.04, 5200);
  for (let i = 0; i < 5; i++) ev(11.05 + i * 0.12, pop, 0.06, 67 + i * 2);
  CRIT.forEach(k => { ev(k.b, pop, 0.24, k.s === '+' ? 79 : 70); ev(k.b + 0.08, plink, k.s === '+' ? 84 : 67, 0.08, 0); });
  for (let i = 0; i < 5; i++) { const d = ROWS[i].s1 - ROWS[i].s0; ev(14.45 + i * 0.14, plink, d > 0 ? 81 + i : 64 - i, 0.05, 0.4); }
  ev(15.2, whoosh, span(15.2, 16.0), 0.26, true, -0.4, 0.4);
  ev(16.0, bell, 84, 0.12); ev(16.06, bell, 88, 0.1); ev(16.12, bell, 91, 0.08);
  // scene 5: the stopwatch
  ev(16.7, whoosh, span(16.7, 17.3), 0.22, false);
  ev(17.3, click, 0.3, 1500);
  for (let i = 0; i < 12; i++) ev(17.35 + i * 0.066, click, 0.07, 2600 + i * 90);
  for (let ob = 56.5; ob < 59; ob += 0.5) evO(ob, click, 0.16, (ob * 2) % 2 < 1 ? 5200 : 4300);
  ev(19.25, bell, 88, 0.16); ev(19.25, brass, [67, 71, 74, 79], 0.14, 0.3);
  // wipe
  ev(19.45, whoosh, span(19.45, 19.95), 0.35, true, -0.8, 0.8);
  ev(19.98, whoosh, span(19.98, 20.4), 0.25, true, 0.8, -0.8);
  // scene 6: the urna (a tone on each key, as the real machine does)
  FILLS.forEach(f => { ev(f, beep, 0.07, 0.07, 1220); ev(f, click, 0.12, 1600); });
  ev(CONFIRM_B, click, 0.3, 1200);
  for (let i = 0; i < 5; i++) evO(outBeat(CONFIRM_B) + 0.12 + i * 0.23, beep, 0.05, 0.11, 1060);
  evO(outBeat(CONFIRM_B) + 1.3, beep, 0.3, 0.11, 1060);
  ev(22.25, impact, 0.75); ev(22.25, brass, [57, 60, 64, 69], 0.2, 0.42); ev(22.25, surdo, 1, true);
  ev(22.4, impact, 0.5); ev(22.4, brass, [60, 64, 69, 72], 0.26, 0.45); ev(22.4, crash, 0.2);
  evO(73, cuica, 0.3, 0.13, 420, 820);
  evO(74.5, cuica, 0.22, 0.12, 460, 900);
  evO(74, rollD, 2 * BEAT, 0.08, 0.5);
  ev(23.3, whoosh, span(23.3, 24), 0.28, true, 0, 0);
  evO(75, whistle, 0.09, 0.3, 30); evO(75.5, whistle, 0.2, 0.34, 30);
  evO(76, swell, span(23.3, 24), 0.28);
  // ===== the logo
  ev(24, impact, 1); ev(24, crash, 0.34);
  for (let i = 0; i < 24; i++) ev(24.5 + (i / 24) * 0.55 + 0.3, plink, 72 + [0, 2, 4, 7, 9][i % 5] + Math.floor(i / 5) * 12 - 12, 0.05, (i % 7) / 3.5 - 1);
  ev(24.0, whoosh, span(24, 25.1), 0.16, true, -0.5, 0.5);
  ev(25.25, surdo, 0.6, false); ev(25.25, click, 0.2, 900);
  ev(25.5, surdo, 0.5, false); ev(25.5, click, 0.18, 1100);
  ev(25.75, pluck, 72, 0.3); ev(26.0, pluck, 76, 0.3); ev(26.25, pluck, 79, 0.32);
  ev(26.25, whoosh, span(26.25, 26.95), 0.3, true, 0.4, -0.4);
  for (let i = 0; i < 19; i++) ev(26.6 + (i < 7 ? i * 0.07 : 0.35 + (i - 7) * 0.045) + 0.2, plink, 84 + [0, 4, 7, 12][i % 4], 0.025, (i / 9) - 1);
  ev(27.4, pop, 0.3, 74); ev(27.55, pop, 0.12, 81);
  ev(27.95, shimmer, span(27.95, 28.65), 0.08, [91, 96, 100]);
  evO(88, swell, 0.6, 0.3);
  // ===== the end card: resolve to C major; a soft bateria keeps it breathing while it is read
  ev(28, impact, 1); ev(28, crash, 0.4); ev(28, kickD, 1); ev(28, surdo, 1, true);
  ev(28, brass, [48, 60, 64, 67, 72, 76], 0.9, 0.7, 0.5);
  evO(88, pad, [48, 55, 60, 64, 67, 72], 7.2 * BEAT, 0.2, 2200);
  evO(88, bass, 36, 1.2, 0.35);
  evO(88.1, shimmer, 7 * BEAT, 0.06, [84, 88, 91, 96]);
  ev(28.25, whistle, 0.12, 0.2, 30);
  ev(29.65, click, 0.3, 2000); ev(29.7, bell, 96, 0.1);
  for (let ob = 89; ob < 95.5; ob += 0.5) {
    const fade = 1 - (ob - 89) / 7;
    evO(ob, ganza, 0.1 * fade, (ob * 2) % 2 < 1 ? -0.25 : 0.25);
    if (ob % 2 === 1) evO(ob, surdo, 0.45 * fade, true);
    if (ob % 2 === 0) evO(ob, surdo, 0.25 * fade, false);
    if ((ob * 2) % 4 === 3) evO(ob, tamborim, 0.12 * fade);
  }
  evO(92, bell, 91, 0.06); evO(94, bell, 96, 0.05);
}

// Render the score offline through the desk. Returns an AudioBuffer (plus an error count).
async function renderScore(sr) {
  const off = new OfflineAudioContext(2, Math.ceil(sr * (DUR + 1.5)), sr);
  A = buildDesk(off);
  if (!SCORE.length) buildScore();
  let errs = 0;
  SCORE.sort((x, y) => x.t - y.t);
  for (const e of SCORE) { try { e.fn(e.t + 0.02, ...e.a); } catch (x) { if (errs++ < 3) console.error(x); } }
  const buf = await off.startRendering();
  A = null;
  return { buf, errs };
}
// 16-bit stereo WAV of exactly DUR seconds (base64), normalised to peakDb, for tools/render.py
async function audioWav(sr, peakDb) {
  sr = sr || 48000;
  const { buf, errs } = await renderScore(sr);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const skip = Math.round(sr * 0.02), len = Math.round(sr * DUR);
  let pk = 0;
  for (let i = skip; i < skip + len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const gain = Math.pow(10, (peakDb === undefined ? -1 : peakDb) / 20) / (pk || 1);
  const fade = Math.round(sr * 0.35);
  const bytes = new Uint8Array(44 + len * 4), dv = new DataView(bytes.buffer);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); dv.setUint32(4, 36 + len * 4, true); wr(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
  wr(36, 'data'); dv.setUint32(40, len * 4, true);
  for (let i = 0; i < len; i++) {
    const f = i > len - fade ? (len - i) / fade : 1;
    dv.setInt16(44 + i * 4, clamp(L[i + skip] * gain * f, -1, 1) * 32767, true);
    dv.setInt16(46 + i * 4, clamp(R[i + skip] * gain * f, -1, 1) * 32767, true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { errs, events: SCORE.length, peakDb: +(20 * Math.log10(pk + 1e-12)).toFixed(2), seconds: +(len / sr).toFixed(3), b64: btoa(bin) };
}
// loudness per beat (debug)
async function audioMeasure() {
  const sr = 22050, { buf, errs } = await renderScore(sr);
  const L = buf.getChannelData(0), R = buf.getChannelData(1), spb = Math.round(BEAT * sr), skip = Math.round(sr * 0.02), out = [];
  let pk = 0;
  for (let k = 0; k < OUT_BEATS; k++) {
    let s2 = 0, p = 0;
    for (let i = skip + k * spb; i < skip + (k + 1) * spb; i++) { s2 += L[i] * L[i] + R[i] * R[i]; p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); }
    pk = Math.max(pk, p);
    out.push(+(10 * Math.log10(s2 / (2 * spb) + 1e-12)).toFixed(1));
  }
  return { errs, events: SCORE.length, peakDb: +(20 * Math.log10(pk)).toFixed(2), beatsRms: out };
}

// ---------- live playback: render once, then loop the buffer against the audio clock
const PLAY = { ctx: null, src: null, t0: 0, buf: null, muted: false, gain: null };
async function audioStart() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!PLAY.ctx) { PLAY.ctx = new AC(); PLAY.gain = PLAY.ctx.createGain(); PLAY.gain.connect(PLAY.ctx.destination); }
  if (PLAY.ctx.state === 'suspended') await PLAY.ctx.resume();
  if (!PLAY.buf) {
    const { buf } = await renderScore(PLAY.ctx.sampleRate);
    // trim the scheduling lead-in so buffer time 0 is piece time 0
    const skip = Math.round(PLAY.ctx.sampleRate * 0.02), len = Math.round(PLAY.ctx.sampleRate * DUR);
    const b = PLAY.ctx.createBuffer(2, len, PLAY.ctx.sampleRate);
    for (let c = 0; c < 2; c++) b.getChannelData(c).set(buf.getChannelData(c).subarray(skip, skip + len));
    PLAY.buf = b;
  }
  const src = PLAY.ctx.createBufferSource();
  src.buffer = PLAY.buf; src.loop = true;
  src.connect(PLAY.gain);
  PLAY.t0 = PLAY.ctx.currentTime + 0.08;
  src.start(PLAY.t0);
  PLAY.src = src;
  return true;
}
const audioTime = () => (PLAY.src ? ((PLAY.ctx.currentTime - PLAY.t0) % DUR + DUR) % DUR : null);
function audioMute(m) { PLAY.muted = m; if (PLAY.gain) PLAY.gain.gain.value = m ? 0 : 1; }
