// ============================================================
// The soundtrack: an original score, synthesised live with WebAudio and locked to the picture.
// The reference clip is silent; its dancing sets the tempo and where the first beat falls (DATA.bpm,
// DATA.beat0). A noir jazz band in D minor: a dark room, a walking upright, the full groove with a brass
// melody, a bridge, a stop, the lead's section (up a tone to E minor), a break and a finale.
// No samples, and nothing borrowed. The instruments and the mixing desk are the painted engine's.
// ============================================================
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
const AUDIO = { ctx: null, out: null, rev: null, gate: null, noise: null, master: null, t0: 0, running: false, idx: 0, loop: 0, muted: false };

function audioSetup() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  let ctx;
  try { ctx = new AC({ latencyHint: 'interactive' }); } catch (e) { return false; }
  Object.assign(AUDIO, { ctx }, buildGraph(ctx));
  return true;
}
// the mixing desk: a bus into shelving EQ and a glue compressor; hall, gated and echo sends
function buildGraph(ctx) {
  const master = ctx.createGain(); master.gain.value = 0.8;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -15; comp.knee.value = 12; comp.ratio.value = 3.2; comp.attack.value = 0.004; comp.release.value = 0.2;
  const bus = ctx.createGain(); bus.gain.value = 0.5;
  const lowS = ctx.createBiquadFilter(); lowS.type = 'lowshelf'; lowS.frequency.value = 90; lowS.gain.value = 0.5;
  const highS = ctx.createBiquadFilter(); highS.type = 'highshelf'; highS.frequency.value = 6500; highS.gain.value = 4.5;
  bus.connect(lowS); lowS.connect(highS); highS.connect(comp); comp.connect(master); master.connect(ctx.destination);
  const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 2.6, 3.4, false);
  const revG = ctx.createGain(); revG.gain.value = 0.32; rev.connect(revG); revG.connect(bus);
  const gate = ctx.createConvolver(); gate.buffer = impulse(ctx, 0.33, 0, true);
  const gateG = ctx.createGain(); gateG.gain.value = 0.42; gate.connect(gateG); gateG.connect(bus);
  // an eighties dotted-eighth echo for the leads, bouncing left and right
  const echo = ctx.createGain();
  const dl = ctx.createDelay(2), dr = ctx.createDelay(2); dl.delayTime.value = BEAT * 0.75; dr.delayTime.value = BEAT * 0.75;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const tone = ctx.createBiquadFilter(); tone.type = 'lowpass'; tone.frequency.value = 3200;
  const pl = ctx.createStereoPanner(), pr = ctx.createStereoPanner(); pl.pan.value = -0.7; pr.pan.value = 0.7;
  const wet = ctx.createGain(); wet.gain.value = 0.26;
  echo.connect(tone); tone.connect(dl); dl.connect(pl); dl.connect(dr); dr.connect(pr); dr.connect(fb); fb.connect(dl);
  pl.connect(wet); pr.connect(wet); wet.connect(bus);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const nd = nb.getChannelData(0);
  const r = mulberry(99);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  return { out: bus, rev, gate, noise: nb, master, echo, comp };
}
// Debug: render beats [b0, b1) of the score offline through the same desk and measure it.
async function audioMeasure(b0, b1, only) {
  const sr = 22050, t0 = b0 * BEAT, t1 = b1 * BEAT;
  const off = new OfflineAudioContext(2, Math.ceil(sr * (t1 - t0 + 2)), sr);
  const saved = Object.assign({}, AUDIO);
  Object.assign(AUDIO, { ctx: off }, buildGraph(off));
  let errs = 0;
  for (const e of SCORE) if (e.t >= t0 && e.t < t1 && (!only || only.includes(e.fn))) { try { e.fn(e.t - t0 + 0.01, ...e.a); } catch (x) { errs++; } }
  const buf = await off.startRendering();
  Object.assign(AUDIO, saved);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const spb = Math.round(BAR * sr), bars = [];
  let pk = 0;
  for (let k = 0; k * spb < L.length - sr; k++) {
    let s2 = 0, p = 0;
    for (let i = k * spb; i < (k + 1) * spb && i < L.length; i++) { s2 += L[i] * L[i] + R[i] * R[i]; p = Math.max(p, Math.abs(L[i]), Math.abs(R[i])); }
    pk = Math.max(pk, p);
    bars.push(+(10 * Math.log10(s2 / (2 * spb) + 1e-12)).toFixed(1));
  }
  return { errs, peakDb: +(20 * Math.log10(pk + 1e-12)).toFixed(2), barsRms: bars, buf };
}
// Render the whole score offline (through the same desk) to a 16-bit stereo WAV, base64-encoded.
// Used by tools/render.py to put the soundtrack under the frame-by-frame video.
async function audioRenderWav(sr, peakDb) {
  sr = sr || 44100;
  const off = new OfflineAudioContext(2, Math.ceil(sr * (DUR + 3)), sr);
  const saved = Object.assign({}, AUDIO);
  Object.assign(AUDIO, { ctx: off }, buildGraph(off));
  let errs = 0;
  for (const e of SCORE) { try { e.fn(e.t + 0.01, ...e.a); } catch (x) { errs++; } }
  const buf = await off.startRendering();
  Object.assign(AUDIO, saved);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const n = Math.min(L.length, Math.round(sr * DUR) + Math.round(sr * 0.01));
  const skip = Math.round(sr * 0.01);            // drop the 10 ms lead-in used to schedule events
  const len = n - skip;
  let pk = 0;
  for (let i = skip; i < n; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const gain = Math.pow(10, (peakDb === undefined ? -1.5 : peakDb) / 20) / (pk || 1);
  const fade = Math.round(sr * 0.25);
  const bytes = new Uint8Array(44 + len * 4);
  const dv = new DataView(bytes.buffer);
  const wr = (o, str) => { for (let i = 0; i < str.length; i++) dv.setUint8(o + i, str.charCodeAt(i)); };
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
  return { errs, peakDb: +(20 * Math.log10(pk + 1e-12)).toFixed(2), seconds: +(len / sr).toFixed(3), b64: btoa(bin) };
}
function impulse(ctx, dur, decay, gated) {
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate);
  const r = mulberry(gated ? 7 : 11);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const x = i / n;
      const e = gated ? (x < 0.88 ? 1 - 0.35 * x : (1 - x) * 5.4) : Math.pow(1 - x, decay);
      d[i] = (r() * 2 - 1) * e;
    }
  }
  return b;
}
const A_gain = v => { const g = AUDIO.ctx.createGain(); g.gain.value = v; return g; };
function send(node, dest, amt) { if (amt > 0) { const g = A_gain(amt); node.connect(g); g.connect(dest); } }
function osc(type, f, t, end) {
  const o = AUDIO.ctx.createOscillator(); o.type = type; o.frequency.value = f; o.start(t); o.stop(end); return o;
}
function noiseSrc(t, end) {
  const s = AUDIO.ctx.createBufferSource(); s.buffer = AUDIO.noise; s.loop = true;
  s.start(t, (t * 7.31) % 1.5); s.stop(end); return s;
}
function noiseHit(t, dur, type, freq, v, q, sRev, sGate, pan) {
  const ctx = AUDIO.ctx;
  const s = noiseSrc(t, t + dur + 0.03);
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; if (q) f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
  s.connect(f); f.connect(g);
  let out = g;
  if (pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); out = p; }
  out.connect(AUDIO.out);
  send(out, AUDIO.rev, sRev || 0); send(out, AUDIO.gate, sGate || 0);
  return { s, f, g };
}

// ---------------------------------------------------------------- instruments
const I = {};
I.kick = (t, v = 1) => {
  const ctx = AUDIO.ctx;
  const o = osc('sine', 160, t, t + 0.45);
  o.frequency.setValueAtTime(165, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.12);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(1.05 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.42);
  o.connect(g); g.connect(AUDIO.out);
  noiseHit(t, 0.012, 'highpass', 2600, 0.22 * v);
};
I.snare = (t, v = 1) => {
  noiseHit(t, 0.19, 'bandpass', 1900, 0.8 * v, 0.7, 0.08, 1.0);
  noiseHit(t, 0.07, 'highpass', 4800, 0.4 * v, 0.7, 0.04, 0.35);
  const o = osc('triangle', 200, t, t + 0.15);
  o.frequency.setValueAtTime(205, t); o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0.5 * v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.gate, 0.5);
};
I.clap = (t, v = 1) => {
  for (let k = 0; k < 3; k++) noiseHit(t + k * 0.011, 0.012, 'bandpass', 1500, 1.8 * v, 1.2);
  noiseHit(t + 0.033, 0.17, 'bandpass', 1400, 1.5 * v, 1.0, 0.35);
};
I.snap = (t, v = 1) => noiseHit(t, 0.03, 'bandpass', 2700, 0.8 * v, 3, 0.25);
I.hat = (t, v = 1, open) => noiseHit(t, open ? 0.3 : 0.05, 'highpass', 7200, (open ? 0.75 : 0.66) * v, 0.8, 0.04, 0, 0.25);
I.crash = (t, v = 1) => noiseHit(t, 1.9, 'highpass', 4200, 0.42 * v, 0.5, 0.3);
I.tom = (t, n, v = 1) => {
  const f = mtof(n);
  const o = osc('sine', f, t, t + 0.42);
  o.frequency.setValueAtTime(f * 1.7, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.85 * v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.gate, 0.4);
};
I.timp = (t, n, v = 1) => {
  const f = mtof(n);
  const o = osc('sine', f, t, t + 1.6);
  o.frequency.setValueAtTime(f * 1.15, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.2);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.6 * v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.3);
  noiseHit(t, 0.08, 'lowpass', 500, 0.3 * v);
};
// the eighties octave bass
I.bass = (t, n, dur, v = 1) => {
  const ctx = AUDIO.ctx, f = mtof(n), end = t + dur + 0.08;
  const o1 = osc('sawtooth', f, t, end), o2 = osc('square', f, t, end); o2.detune.value = -8;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
  lp.frequency.setValueAtTime(300 + 2100 * v, t); lp.frequency.exponentialRampToValueAtTime(230, t + 0.13);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.34 * v, t + 0.004);
  g.gain.setTargetAtTime(0.2 * v, t + 0.005, 0.05); g.gain.setTargetAtTime(0, t + dur, 0.015);
  const m = A_gain(0.5);
  o1.connect(lp); o2.connect(m); m.connect(lp); lp.connect(g); g.connect(AUDIO.out);
};
// a plucked upright for the theatre's walking line
I.upright = (t, n, v = 1) => {
  const ctx = AUDIO.ctx, f = mtof(n), end = t + 0.7;
  const o1 = osc('triangle', f, t, end), o2 = osc('sine', f * 2, t, end);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.3);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.55 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.62);
  const m = A_gain(0.25);
  o1.connect(lp); o2.connect(m); m.connect(lp); lp.connect(g); g.connect(AUDIO.out);
  noiseHit(t, 0.02, 'lowpass', 900, 0.1 * v);
};
I.stab = (t, notes, dur, v = 1, bright = 1) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.25;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5;
  lp.frequency.setValueAtTime(1500 + 4500 * bright, t); lp.frequency.exponentialRampToValueAtTime(900, t + dur + 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18 * v, t + 0.006);
  g.gain.setTargetAtTime(0.105 * v, t + 0.01, dur * 0.4); g.gain.setTargetAtTime(0, t + dur, 0.03);
  lp.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.22);
  for (const n of notes) for (const dt of [-7, 7]) { const o = osc('sawtooth', mtof(n), t, end); o.detune.value = dt; o.connect(lp); }
};
I.pad = (t, notes, dur, v = 1) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.8;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1500; lp.Q.value = 0.7;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05 * v, t + 0.3); g.gain.setTargetAtTime(0, t + dur, 0.2);
  lp.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.5);
  for (const n of notes) for (const dt of [0, 11]) { const o = osc('sawtooth', mtof(n), t, end); o.detune.value = dt; o.connect(lp); }
};
// FM: a DX-style electric piano / bell
I.bell = (t, n, dur, v = 1, ratio = 1, index = 3) => {
  const ctx = AUDIO.ctx, f = mtof(n), len = Math.max(0.5, dur * 2.5), end = t + len + 0.05;
  const c = osc('sine', f, t, end), m = osc('sine', f * ratio, t, end);
  const mg = ctx.createGain(); mg.gain.setValueAtTime(f * index, t); mg.gain.exponentialRampToValueAtTime(f * 0.25, t + 0.6);
  m.connect(mg); mg.connect(c.frequency);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.36 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + len);
  c.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.3); send(g, AUDIO.echo, 0.5);
};
I.brass = (t, n, dur, v = 1) => {
  const ctx = AUDIO.ctx, f = mtof(n), end = t + dur + 0.2;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2.2;
  lp.frequency.setValueAtTime(500, t); lp.frequency.exponentialRampToValueAtTime(4200, t + 0.06); lp.frequency.setTargetAtTime(2400, t + 0.07, 0.1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.21 * v, t + 0.022); g.gain.setTargetAtTime(0.17 * v, t + 0.03, 0.1); g.gain.setTargetAtTime(0, t + dur, 0.03);
  lp.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.2); send(g, AUDIO.echo, 0.3);
  for (const dt of [-6, 6]) { const o = osc('sawtooth', f, t, end); o.detune.value = dt; o.connect(lp); }
  const sub = osc('square', f / 2, t, end), sg = A_gain(0.25); sub.connect(sg); sg.connect(lp);
};
// a wordless, formant-filtered "voice" for when he sings
I.voice = (t, n, dur, v = 1, vowel = 'a') => {
  const ctx = AUDIO.ctx, f = mtof(n), end = t + dur + 0.25;
  const o = osc('sawtooth', f, t, end), o2 = osc('sawtooth', f, t, end); o2.detune.value = 9;
  const lfo = osc('sine', 5.4, t, end), lg = ctx.createGain();
  lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(16, t + Math.min(0.3, dur));
  lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
  for (const oo of [o, o2]) { oo.frequency.setValueAtTime(f * 0.96, t); oo.frequency.exponentialRampToValueAtTime(f, t + 0.06); }
  const mix = A_gain(0.6); o.connect(mix); o2.connect(mix);
  // a baritone's vowels
  const F = { a: [[730, 1], [1090, 0.5], [2440, 0.2]], o: [[570, 1], [840, 0.45], [2410, 0.12]], e: [[530, 1], [1840, 0.4], [2480, 0.18]] }[vowel];
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7 * v, t + 0.045); g.gain.setTargetAtTime(0, t + dur, 0.05);
  for (const [ff, gg] of F) {
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = ff; bp.Q.value = ff / 110;
    const gn = A_gain(gg * 2.6); mix.connect(bp); bp.connect(gn); gn.connect(g);
  }
  g.connect(AUDIO.out); send(g, AUDIO.rev, 0.35); send(g, AUDIO.echo, 0.35);
};
I.piano = (t, n, dur, v = 1) => {
  const ctx = AUDIO.ctx, f = mtof(n);
  const g = ctx.createGain(); g.gain.value = 0.065 * v;
  g.connect(AUDIO.out); send(g, AUDIO.rev, 0.55);
  const amps = [1, 0.5, 0.28, 0.15, 0.08, 0.04];
  const damp = t + dur + 0.25;
  for (let k = 1; k <= 6; k++) {
    const T = 2.6 / Math.pow(k, 0.75) * (n < 55 ? 1.3 : 1);
    const end = Math.min(t + T + 0.1, damp + 0.35);
    const o = osc('sine', f * k * (1 + 0.0004 * k * k), t, end);
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(amps[k - 1], t + 0.004);
    pg.gain.exponentialRampToValueAtTime(0.0008, t + T);
    pg.gain.setTargetAtTime(0, damp, 0.08);
    o.connect(pg); pg.connect(g);
  }
  noiseHit(t, 0.02, 'lowpass', 1800, 0.02 * v);
};
I.mbox = (t, n, v = 1) => {
  const ctx = AUDIO.ctx, f = mtof(n);
  const g = ctx.createGain(); g.gain.value = 0.17 * v; g.connect(AUDIO.out); send(g, AUDIO.rev, 0.6); send(g, AUDIO.echo, 0.25);
  for (const [k, a, T] of [[1, 1, 1.4], [2.01, 0.3, 0.5], [5.4, 0.12, 0.12]]) {
    const o = osc('sine', f * k, t, t + T + 0.05), pg = ctx.createGain();
    pg.gain.setValueAtTime(0, t); pg.gain.linearRampToValueAtTime(a, t + 0.002); pg.gain.exponentialRampToValueAtTime(0.001, t + T);
    o.connect(pg); pg.connect(g);
  }
};
I.pluck = (t, n, v = 1, pan = 0) => {
  const ctx = AUDIO.ctx, f = mtof(n), end = t + 0.25;
  const o = osc('square', f, t, end);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.15);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.075 * v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
  const p = ctx.createStereoPanner(); p.pan.value = pan;
  o.connect(lp); lp.connect(g); g.connect(p); p.connect(AUDIO.out); send(p, AUDIO.rev, 0.3);
};
I.goofy = (t, n, dur, v = 1) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.1;
  const o = osc('square', mtof(n), t, end);
  const lfo = osc('sine', 9, t, end), lg = A_gain(45); lfo.connect(lg); lg.connect(o.detune);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1700;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * v, t + 0.01); g.gain.setTargetAtTime(0, t + dur, 0.02);
  o.connect(lp); lp.connect(g); g.connect(AUDIO.out);
};
// ---------------------------------------------------------------- sound effects
I.scratch = t => {
  const ctx = AUDIO.ctx, end = t + 0.5;
  const s = noiseSrc(t, end);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 4;
  const fr = [[0, 500], [0.08, 2700], [0.16, 600], [0.27, 2300], [0.42, 280]];
  for (const [dt, f] of fr) bp.frequency.linearRampToValueAtTime(f, t + dt);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.7, t + 0.01); g.gain.setValueAtTime(0.7, t + 0.36); g.gain.linearRampToValueAtTime(0, t + 0.46);
  s.connect(bp); bp.connect(g); g.connect(AUDIO.out);
  const o = osc('sawtooth', 150, t, end);
  for (const [dt, f] of fr) o.frequency.linearRampToValueAtTime(f * 0.3, t + dt);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.12, t + 0.01); g2.gain.setValueAtTime(0.12, t + 0.36); g2.gain.linearRampToValueAtTime(0, t + 0.46);
  o.connect(lp); lp.connect(g2); g2.connect(AUDIO.out);
};
I.bloop = (t, f0 = 500, v = 1) => {
  const o = osc('sine', f0, t, t + 0.12);
  o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.6, t + 0.07);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.4);
};
I.blip = (t, n) => {
  const o = osc('square', mtof(n), t, t + 0.07);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
  o.connect(g); g.connect(AUDIO.out);
};
I.ding = (t, n = 96, v = 1) => I.bell(t, n, 0.5, 0.8 * v, 3.5, 2.2);
I.whoosh = (t, dur = 0.5, v = 1, pan = 0) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.05;
  const s = noiseSrc(t, end);
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = 1.3;
  bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2600, t + dur * 0.55); bp.frequency.exponentialRampToValueAtTime(500, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42 * v, t + dur * 0.55); g.gain.linearRampToValueAtTime(0, t + dur);
  const p = ctx.createStereoPanner(); p.pan.setValueAtTime(-pan, t); p.pan.linearRampToValueAtTime(pan, t + dur);
  s.connect(bp); bp.connect(g); g.connect(p); p.connect(AUDIO.out); send(p, AUDIO.rev, 0.2);
};
I.riser = (t, dur, v = 1) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.05;
  const s = noiseSrc(t, end);
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.setValueAtTime(300, t); hp.frequency.exponentialRampToValueAtTime(7000, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28 * v, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  s.connect(hp); hp.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.3);
  const o = osc('sawtooth', 110, t, end); o.frequency.exponentialRampToValueAtTime(880, t + dur);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  const g2 = ctx.createGain(); g2.gain.setValueAtTime(0, t); g2.gain.linearRampToValueAtTime(0.05 * v, t + dur); g2.gain.linearRampToValueAtTime(0, t + dur + 0.03);
  o.connect(lp); lp.connect(g2); g2.connect(AUDIO.out);
};
I.splash = (t, v = 1) => {
  noiseHit(t, 0.75, 'lowpass', 2800, 0.6 * v, 0.7, 0.3);
  const n = noiseHit(t + 0.02, 0.4, 'bandpass', 1200, 0.4 * v, 0.9, 0.2);
  n.f.frequency.exponentialRampToValueAtTime(400, t + 0.4);
};
I.clunk = t => {
  const o = osc('sine', 80, t, t + 0.4);
  o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(55, t + 0.2);
  const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.7);
  noiseHit(t, 0.03, 'highpass', 1500, 0.5, 0.7, 0.5);
};
I.shutter = t => { noiseHit(t, 0.018, 'highpass', 3000, 0.45); noiseHit(t + 0.055, 0.024, 'highpass', 2400, 0.35); };
I.swish = (t, dur = 1.2, v = 1) => {
  const ctx = AUDIO.ctx, s = noiseSrc(t, t + dur + 0.05);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(1100, t + dur * 0.4); lp.frequency.linearRampToValueAtTime(300, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.5 * v, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur);
  s.connect(lp); lp.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.2);
};
I.brush = (t, v = 1) => {
  const n = noiseHit(t, 0.35, 'bandpass', 3000, 0.25 * v, 0.8, 0.2);
  n.f.frequency.exponentialRampToValueAtTime(1200, t + 0.3);
};
I.slide = (t, n0, n1, dur, v = 1) => {
  const ctx = AUDIO.ctx, end = t + dur + 0.1;
  const o = osc('sine', mtof(n0), t, end); o.frequency.exponentialRampToValueAtTime(mtof(n1), t + dur);
  const lfo = osc('sine', 6, t, end), lg = A_gain(25); lfo.connect(lg); lg.connect(o.detune);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * v, t + 0.03); g.gain.setTargetAtTime(0, t + dur, 0.03);
  o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.25);
};
I.cricket = t => {
  for (let k = 0; k < 3; k++) {
    const t1 = t + k * 0.075;
    const o = osc('sine', 4300, t1, t1 + 0.06);
    const am = osc('square', 42, t1, t1 + 0.06), ag = A_gain(0.5);
    const g = AUDIO.ctx.createGain(); g.gain.setValueAtTime(0, t1); g.gain.linearRampToValueAtTime(0.05, t1 + 0.01); g.gain.linearRampToValueAtTime(0, t1 + 0.055);
    am.connect(ag); ag.connect(g.gain);
    o.connect(g); g.connect(AUDIO.out); send(g, AUDIO.rev, 0.4);
  }
};
I.applause = (t, dur, v = 1) => {
  const r = mulberry(Math.floor(t * 1000));
  const n = Math.floor(dur * 9);
  for (let i = 0; i < n; i++) {
    const tt = t + r() * dur;
    const fade = 1 - (tt - t) / dur;
    noiseHit(tt, 0.05, 'bandpass', 900 + r() * 1400, 0.22 * v * fade, 1.2, 0.3, 0, (r() - 0.5) * 1.2);
  }
};

// ---------------------------------------------------------------- the score
const SCORE = [];
const VOICE = [];
// the grid starts on the dancers' first common beat (read from the clip's motion by tools/pack.py)
const BEAT0 = DATA.beat0 || 0;
const ev = (beat, fn, ...a) => { const t = BEAT0 + beat * BEAT; if (t >= 0 && t < DUR - 0.05) SCORE.push({ t, fn, a }); };
// chords: r = bass root, s = stab voicing, arp = sparkle notes, third = 3 (minor) or 4 (major) for the bass line
const CHD = {
  Dm: { r: 38, s: [57, 62, 65, 69], arp: [69, 74, 77, 81], third: 3 },
  Bb: { r: 34, s: [58, 62, 65, 70], arp: [70, 74, 77, 82], third: 4 },
  Gm: { r: 31, s: [55, 58, 62, 67], arp: [67, 70, 74, 79], third: 3 },
  A7: { r: 33, s: [55, 61, 64, 69], arp: [69, 73, 76, 79], third: 4 },
  C7: { r: 36, s: [58, 60, 64, 67], arp: [67, 70, 72, 76], third: 4 },
  F: { r: 41, s: [57, 60, 65, 69], arp: [69, 72, 77, 81], third: 4 }
};
const up = (ch, tr) => tr ? { r: ch.r + tr, s: ch.s.map(n => n + tr), arp: ch.arp.map(n => n + tr), third: ch.third } : ch;
// the bass figure: root, a pushed root, the third, a climb to the fifth and back [beat, interval, length, velocity]
const RIFF = [[0, 0, 0.45, 1], [0.75, 0, 0.2, 0.65], [1.5, 'T', 0.35, 0.85], [2, 7, 0.4, 0.9], [2.75, 5, 0.2, 0.7], [3, 7, 0.3, 0.8], [3.5, 10, 0.4, 0.85]];
function riff(bar, ch, v) {
  for (const [bt, iv, len, vel] of RIFF) ev(bar * 4 + bt, I.bass, ch.r + (iv === 'T' ? ch.third : iv), BEAT * len, vel * (v || 1));
}
// a walking upright: root, third, fifth, a chromatic step into the next chord
function walk(bar, ch, next, v) {
  const n = [ch.r, ch.r + ch.third, ch.r + 7, (next ? next.r : ch.r) + 1];
  for (let q = 0; q < 4; q++) ev(bar * 4 + q, I.upright, n[q] + 12, (v || 1) * (q === 0 ? 1 : 0.8));
}
const COMP = [[0.5, 0.3, 0.9], [1.75, 0.2, 0.75], [2.5, 0.3, 0.9], [3.5, 0.2, 0.7]];
function comp(bar, ch, v) { for (const [bt, d, vv] of COMP) ev(bar * 4 + bt, I.stab, ch.s, d * BEAT, vv * (v || 1)); }
function drums(bar, o) {
  const b0 = bar * 4;
  for (let q = 0; q < 4; q++) {
    ev(b0 + q, I.kick, (o.kick === undefined ? 1 : o.kick) * (q % 2 ? 0.8 : 1));
    if (q % 2 === 1 && !o.noSnare) { ev(b0 + q, I.snare, 0.85); if (o.clap) ev(b0 + q, I.clap, 0.55); }
    ev(b0 + q + 0.5, I.hat, 0.75, q === 3 && !!o.open);
    if (!o.light) { ev(b0 + q + 0.25, I.hat, 0.25); ev(b0 + q + 0.75, I.hat, 0.38); }
  }
  if (o.ghost) ev(b0 + 2.75, I.snare, 0.25);
}
function tune(bar, notes, inst, tr, v, extra) { for (const [bt, n, d] of notes) ev(bar * 4 + bt, inst, n + (tr || 0), d * BEAT, v || 1, ...(extra || [])); }
function arpeggio(bar, ch, v) {
  for (let i = 0; i < 16; i++) ev(bar * 4 + i * 0.25, I.pluck, ch.arp[i % 4] + (i % 8 >= 4 ? 12 : 0), (v || 1) * (i % 4 === 0 ? 1 : 0.7), i % 2 ? 0.45 : -0.45);
}
// Melodies (new for this piece). M1: a question over Dm and Bb, an answer over Gm and A7.
const M1A = [[0, 74, 0.5], [0.5, 77, 0.5], [1, 81, 0.75], [1.75, 79, 0.25], [2, 77, 0.5], [2.5, 76, 0.5], [3, 74, 1],
             [4, 70, 0.5], [4.5, 74, 0.5], [5, 77, 0.75], [5.75, 76, 0.25], [6, 74, 0.5], [6.5, 72, 0.5], [7, 70, 1]];
const M1B = [[0, 79, 0.5], [0.5, 82, 0.5], [1, 79, 0.5], [1.5, 77, 0.5], [2, 74, 1], [3, 72, 0.5], [3.5, 74, 0.5],
             [4, 73, 0.75], [4.75, 76, 0.25], [5, 79, 0.5], [5.5, 81, 0.5], [6, 85, 1.5], [7.5, 81, 0.5]];
// M2: the bridge, climbing in syncopation over Gm C7 F A7
const M2 = [[0.5, 79, 0.5], [1, 82, 0.5], [1.5, 86, 1], [2.5, 84, 0.5], [3, 82, 1],
            [4.5, 82, 0.5], [5, 84, 0.5], [5.5, 88, 1], [6.5, 86, 0.5], [7, 84, 1],
            [8.5, 84, 0.5], [9, 81, 0.5], [9.5, 77, 1], [10.5, 81, 0.5], [11, 84, 1],
            [12, 85, 0.5], [12.5, 81, 0.5], [13, 79, 0.5], [13.5, 76, 0.5], [14, 73, 1], [15, 76, 1]];
const PROG_A = ['Dm', 'Bb', 'Gm', 'A7'], PROG_B = ['Gm', 'C7', 'F', 'A7'];

function buildScore() {
  // ---- bars 0-1: the dark room. A low pad, a heartbeat on the upright, brushes, a glass.
  ev(0, I.brush, 3.4);
  ev(0, I.pad, CHD.Dm.s, BEAT * 8, 0.85);
  for (const bt of [0, 4]) ev(bt, I.upright, 38, 0.9);
  for (const bt of [2.5, 6.5]) ev(bt, I.upright, 41, 0.5);
  ev(1.3, I.ding, 105, 0.4); ev(5.6, I.ding, 100, 0.35);
  for (let i = 0; i < 8; i++) ev(i + 0.5, I.hat, 0.14 + i * 0.015);
  ev(6, I.riser, BEAT * 2, 0.5);

  // ---- bars 2-5: people arrive. Snaps on 2 and 4, a walking upright, muted piano, the melody hinted on bells.
  for (let bar = 2; bar < 6; bar++) {
    const ch = CHD[PROG_A[(bar - 2) % 4]], nx = CHD[PROG_A[(bar - 1) % 4]];
    walk(bar, ch, nx, 0.9);
    for (let q = 0; q < 4; q++) { ev(bar * 4 + q, I.kick, 0.55); if (q % 2) ev(bar * 4 + q, I.snap, 0.85); ev(bar * 4 + q + 0.5, I.hat, 0.45); }
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.6);
    ev(bar * 4 + 1.5, I.piano, ch.s[2] + 12, BEAT * 0.4, 0.5); ev(bar * 4 + 3.5, I.piano, ch.s[3] + 12, BEAT * 0.4, 0.45);
  }
  tune(2, M1A.slice(0, 7), I.bell, 0, 0.55, [1, 3]);
  tune(4, M1B.slice(0, 7), I.bell, 0, 0.55, [1, 3]);
  for (let i = 0; i < 8; i++) ev(22 + i * 0.25, I.snare, 0.2 + i * 0.08);

  // ---- bars 6-11: the floor fills. The full groove, M1 on brass and bells.
  ev(24, I.crash, 0.9); ev(24, I.timp, 38, 0.9);
  for (let bar = 6; bar < 12; bar++) {
    const ch = CHD[PROG_A[(bar - 6) % 4]];
    drums(bar, { clap: bar >= 8, open: bar % 2 === 1, ghost: true });
    riff(bar, ch, 0.95); comp(bar, ch, 0.9);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.7);
  }
  tune(6, M1A, I.brass, -12, 0.6); tune(6, M1A, I.bell, 0, 0.8, [1, 3]);
  tune(8, M1B, I.brass, -12, 0.65); tune(8, M1B, I.bell, 0, 0.8, [1, 3]);
  tune(10, M1A, I.piano, 0, 0.7);
  ev(46, I.riser, BEAT * 2, 0.7);
  for (let i = 0; i < 6; i++) ev(46.5 + i * 0.25, I.tom, [55, 52, 50, 47, 45, 43][i], 0.7);

  // ---- bars 12-16: the bridge. Gm C7 F A7, pluck arpeggios, M2 on brass; a stop at the end.
  ev(48, I.crash, 0.9);
  for (let bar = 12; bar < 17; bar++) {
    const ch = CHD[PROG_B[(bar - 12) % 4]];
    drums(bar, { clap: true, open: true });
    riff(bar, ch, 1.0); arpeggio(bar, ch, 0.65);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.75);
    if (bar === 16) comp(bar, ch, 1.0);
  }
  tune(12, M2, I.brass, -12, 0.7); tune(12, M2, I.bell, 0, 0.6, [1, 3]);
  // bar 16: a stop-time bar, hits on 1 and the "and" of 2, then silence into the spotlight
  ev(64, I.stab, CHD.A7.s, BEAT * 0.4, 1.1); ev(65.5, I.stab, CHD.A7.s, BEAT * 0.4, 1.1);
  ev(66, I.riser, BEAT * 2, 0.9);
  for (let i = 0; i < 8; i++) ev(66 + i * 0.25, I.snare, 0.3 + i * 0.09);

  // ---- bars 17-25: the lead in the light. The band at full strength, hits on the even beats,
  // then everything up a tone (E minor) from bar 21.
  ev(68, I.crash, 1.1); ev(68, I.timp, 38, 1.1);
  for (let bar = 17; bar < 26; bar++) {
    const tr = bar >= 21 ? 2 : 0;
    const ch = up(CHD[PROG_A[(bar - 17) % 4]], tr);
    drums(bar, { clap: true, open: true, ghost: true });
    riff(bar, ch, 1.05); comp(bar, ch, 1.0);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.8);
    if (bar % 2 === 0) {       // brass punches on 1 and 3
      for (const bt of [0, 2]) { ev(bar * 4 + bt, I.brass, ch.s[3] + 12, BEAT * 0.45, 1.0); ev(bar * 4 + bt, I.brass, ch.s[1] + 12, BEAT * 0.45, 0.8); }
    }
  }
  tune(17, M1A, I.bell, 0, 1, [1, 3]); tune(17, M1A, I.brass, -12, 0.7);
  tune(19, M1B, I.bell, 0, 1, [1, 3]); tune(19, M1B, I.brass, -12, 0.7);
  ev(84, I.crash, 1.0); ev(84, I.timp, 40, 1.0); ev(83.3, I.whoosh, 0.8, 0.8, -0.5);
  tune(21, M1A, I.bell, 2, 1, [1, 3]); tune(21, M1A, I.brass, -10, 0.75);
  tune(23, M1B, I.bell, 2, 1, [1, 3]); tune(23, M1B, I.brass, -10, 0.75);
  tune(25, M1A.slice(0, 7), I.piano, 2, 0.8);

  // ---- bars 26-30: the break. Upright, snaps, piano; the band creeps back in and builds.
  ev(104, I.crash, 0.6);
  for (let bar = 26; bar < 31; bar++) {
    const ch = up(CHD[PROG_B[(bar - 26) % 4]], 2), nx = up(CHD[PROG_B[(bar - 25) % 4]], 2);
    walk(bar, ch, nx, 1.0);
    for (let q = 0; q < 4; q++) { ev(bar * 4 + q + 0.5, q % 2 ? I.snap : I.hat, q % 2 ? 0.8 : 0.45); if (bar >= 28) ev(bar * 4 + q, I.kick, 0.4 + (bar - 28) * 0.2); }
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.55);
    ev(bar * 4 + 0.5, I.piano, ch.s[3] + 12, BEAT * 0.6, 0.6); ev(bar * 4 + 2.5, I.piano, ch.s[2] + 12, BEAT * 0.6, 0.5);
  }
  tune(26, M2.slice(0, 10), I.piano, 2, 0.65);
  ev(120, I.riser, BEAT * 4, 1.0);
  for (let i = 0; i < 16; i++) ev(120 + i * 0.25, I.snare, 0.2 + i * 0.05);

  // ---- bars 31-34: the finale. Everything, then a last chord that rings out.
  ev(124, I.crash, 1.2); ev(124, I.timp, 40, 1.2);
  for (let bar = 31; bar < 34; bar++) {
    const ch = up(CHD[PROG_A[(bar - 31) % 4]], 2);
    drums(bar, { clap: true, open: true, ghost: true });
    riff(bar, ch, 1.1); comp(bar, ch, 1.05); arpeggio(bar, ch, 0.6);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.9);
  }
  tune(31, M1A, I.bell, 2, 1.05, [1, 3]); tune(31, M1A, I.brass, -10, 0.8);
  tune(33, M1B.slice(0, 7), I.brass, -10, 0.85);
  for (let i = 0; i < 6; i++) ev(134.5 + i * 0.25, I.tom, [57, 54, 52, 49, 47, 45][i], 0.9);
  // the last chord: E minor with an added ninth, a crash, a low timpani, a glint
  ev(136, I.crash, 1.2); ev(136, I.kick, 1.1); ev(136, I.timp, 40, 1.2); ev(136, I.clap, 0.9);
  ev(136, I.stab, [52, 59, 64, 66, 67, 71], BEAT * 1.8, 1.25);
  ev(136, I.brass, 83, BEAT * 1.8, 1.0); ev(136, I.brass, 78, BEAT * 1.8, 0.8);
  ev(136, I.bass, 28, BEAT * 1.8, 1.1);
  ev(136, I.pad, [52, 59, 64, 66, 71], BEAT * 2, 1.0);
  ev(137.2, I.ding, 107, 0.7);

  SCORE.sort((a, b) => a.t - b.t);
}
buildScore();

const HITS = { kick: [], snare: [], hat: [], crash: [], clap: [], pluck: [], snap: [] };
for (const e of SCORE) {
  const k = e.fn === I.kick ? 'kick' : e.fn === I.snare ? 'snare' : e.fn === I.hat ? 'hat' : e.fn === I.crash ? 'crash' : e.fn === I.clap ? 'clap' : e.fn === I.pluck ? 'pluck' : e.fn === I.snap ? 'snap' : null;
  const v = k === 'pluck' ? e.a[1] : e.a[0];     // (a pluck's first argument is its note)
  if (k) HITS[k].push([e.t, typeof v === 'number' ? v : 1]);
}
// every hit of a kind in the last `span` seconds: [[age, strength, index], ...]
function recentHits(kind, t, span) {
  const L = HITS[kind], out = [];
  let lo = 0, hi = L.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (L[m][0] <= t + 1e-4) { k = m; lo = m + 1; } else hi = m - 1; }
  for (let i = k; i >= 0 && t - L[i][0] < span; i--) out.push([t - L[i][0], L[i][1], i]);
  return out;
}
// strength of the most recent hit of a kind, decaying with time constant `decay` (s)
function hitPulse(kind, t, decay) {
  const L = HITS[kind];
  let lo = 0, hi = L.length - 1, k = -1;
  while (lo <= hi) { const m = (lo + hi) >> 1; if (L[m][0] <= t + 1e-4) { k = m; lo = m + 1; } else hi = m - 1; }
  if (k < 0) return 0;
  return L[k][1] * Math.exp(-(t - L[k][0]) / decay);
}

// ---------------------------------------------------------------- transport
// Piece time t is ctxTime - t0. Events are scheduled a quarter of a second ahead.
function audioStart(pieceNow) {
  if (!AUDIO.ctx && !audioSetup()) return false;
  const ctx = AUDIO.ctx;
  if (ctx.state === 'suspended') ctx.resume();
  audioAnchor(pieceNow);
  AUDIO.running = true;
  audioPump();
  return true;
}
// line the score up so that piece time `pieceNow` is heard now; skip anything already past
function audioAnchor(pieceNow) {
  const ctx = AUDIO.ctx;
  AUDIO.t0 = ctx.currentTime - pieceNow;
  const tp = pieceNow < 0 ? pieceNow : modT(pieceNow);
  AUDIO.loop = pieceNow < 0 ? 0 : Math.floor(pieceNow / DUR);
  let i = 0;
  while (i < SCORE.length && SCORE[i].t < tp - 1e-6) i++;
  if (i >= SCORE.length) { i = 0; AUDIO.loop++; }
  AUDIO.idx = i;
}
function audioPump() {
  if (!AUDIO.running) return;
  const ctx = AUDIO.ctx, now = ctx.currentTime, horizon = now + 0.25;
  for (let guard = 0; guard < 4000; guard++) {
    const e = SCORE[AUDIO.idx];
    const when = AUDIO.t0 + AUDIO.loop * DUR + e.t;
    if (when > horizon) break;
    if (when > now - 0.03) { try { e.fn(Math.max(when, now), ...e.a); } catch (err) { /* keep the band playing */ } }
    AUDIO.idx++;
    if (AUDIO.idx >= SCORE.length) { AUDIO.idx = 0; AUDIO.loop++; }
  }
}
function audioPieceTime() {
  const ctx = AUDIO.ctx;
  let ct = ctx.currentTime;
  if (ctx.getOutputTimestamp) {
    const ts = ctx.getOutputTimestamp();
    if (ts && ts.contextTime > 0) ct = ts.contextTime + Math.max(0, (performance.now() - ts.performanceTime) / 1000);
  }
  return ct - AUDIO.t0;
}
function audioMute(m) {
  if (!AUDIO.ctx) return;
  AUDIO.muted = m;
  AUDIO.master.gain.setTargetAtTime(m ? 0 : 0.8, AUDIO.ctx.currentTime, 0.05);
}
setInterval(audioPump, 50);
