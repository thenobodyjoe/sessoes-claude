// ============================================================
// The soundtrack: an original score, synthesised live with WebAudio and locked to the picture.
// A smoky room tone, a heartbeat, a walking groove that grows into a full funk band (rolling bass riff,
// off-beat stabs, bells, brass), hits that land exactly on the dancers' flung arms, a thin section for the
// tap dance, a full stop, and a final swell for the lean. G minor, 112 BPM, 14 bars = 30 seconds.
// No samples, and nothing borrowed.
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
const VOICE = [];     // [start, end] of every sung note (kept for the mouth follower; unused in this piece)
const ev = (beat, fn, ...a) => SCORE.push({ t: beat * BEAT, fn, a });
// chords: r = bass root, s = stab voicing, arp = sparkle notes, third = 3 (minor) or 4 (major) for the bass line
const CHD = {
  Gm: { r: 31, s: [55, 58, 62, 67], arp: [67, 70, 74, 79], third: 3 },
  Eb: { r: 39, s: [55, 58, 63, 67], arp: [67, 70, 75, 79], third: 4 },
  F: { r: 41, s: [57, 60, 65, 69], arp: [69, 72, 77, 81], third: 4 },
  Cm: { r: 36, s: [55, 60, 63, 67], arp: [67, 72, 75, 79], third: 3 },
  D7: { r: 38, s: [57, 60, 66, 69], arp: [69, 72, 78, 81], third: 4 }
};
// the riff: root, third, fifth, fourth in a syncopated figure [beat, semitones above root, length, velocity]
const RIFF = [[0, 0, 0.4, 1], [0.75, 0, 0.2, 0.7], [1.5, 'T', 0.3, 0.8], [2, 0, 0.4, 0.9], [2.5, 7, 0.3, 0.8], [3, 5, 0.3, 0.8], [3.5, 7, 0.4, 0.9]];
function riff(bar, ch, v) {
  for (const [bt, iv, len, vel] of RIFF) ev(bar * 4 + bt, I.bass, ch.r + (iv === 'T' ? ch.third : iv), BEAT * len, vel * (v || 1));
}
// off-beat comping: short stabs on the "ands"
const COMP = [[0.5, 0.3, 0.9], [1.5, 0.3, 0.8], [2.5, 0.3, 0.9], [3.25, 0.18, 0.7], [3.75, 0.18, 0.7]];
function comp(bar, ch, v) { for (const [bt, d, vv] of COMP) ev(bar * 4 + bt, I.stab, ch.s, d * BEAT, vv * (v || 1)); }
function drums(bar, o) {
  const b0 = bar * 4;
  for (let q = 0; q < 4; q++) {
    ev(b0 + q, I.kick, (o.kick === undefined ? 1 : o.kick));
    if (q % 2 === 1 && !o.noSnare) { ev(b0 + q, I.snare, 0.9); if (o.clap) ev(b0 + q, I.clap, 0.6); }
    ev(b0 + q + 0.5, I.hat, 0.8, q === 3 && !!o.open);
    if (!o.light) { ev(b0 + q + 0.25, I.hat, 0.28); ev(b0 + q + 0.75, I.hat, 0.4); }
  }
}
function tune(bar, notes, inst, tr, v, extra) { for (const [bt, n, d] of notes) ev(bar * 4 + bt, inst, n + (tr || 0), d * BEAT, v || 1, ...(extra || [])); }
function arpeggio(bar, ch, v) {
  for (let i = 0; i < 16; i++) ev(bar * 4 + i * 0.25, I.pluck, ch.arp[i % 4] + (i % 8 >= 4 ? 12 : 0), (v || 1) * (i % 4 === 0 ? 1 : 0.7), i % 2 ? 0.45 : -0.45);
}
// the two-bar bell motif over Gm / Eb
const M_GM = [[0, 79, 0.75], [0.75, 77, 0.25], [1, 74, 0.5], [1.5, 70, 0.5], [2, 74, 0.75], [2.75, 77, 0.25], [3, 79, 1]];
const M_EB = [[0, 75, 0.75], [0.75, 74, 0.25], [1, 70, 0.5], [1.5, 67, 0.5], [2, 70, 0.75], [2.75, 74, 0.25], [3, 75, 1]];
const M_CM = [[0, 79, 0.75], [0.75, 75, 0.25], [1, 72, 0.5], [1.5, 75, 0.5], [2, 79, 0.75], [2.75, 84, 0.25], [3, 82, 1]];
const M_D7 = [[0, 81, 0.5], [0.5, 78, 0.5], [1, 74, 0.5], [1.5, 72, 0.5], [2, 69, 0.5], [2.5, 72, 0.5], [3, 74, 0.5], [3.5, 78, 0.5]];

function buildScore() {
  // ---- bars 0-1 (beats 0-8): the room. A low pad, a heartbeat, smoke, the odd finger-snap and a glass.
  ev(0, I.brush, 3.6);
  ev(0, I.pad, CHD.Gm.s, BEAT * 8, 0.9);
  for (const bt of [0, 4]) ev(bt, I.upright, 31, 0.9);
  for (const bt of [2.5, 6.5]) ev(bt, I.upright, 34, 0.55);
  for (const bt of [2, 3, 6, 7]) ev(bt, I.snap, 0.55);
  [4, 5, 6, 7].forEach((bt, i) => ev(bt, I.kick, 0.3 + i * 0.06));
  for (let i = 0; i < 8; i++) ev(i + 0.5, I.hat, 0.16 + i * 0.015);
  ev(1.2, I.ding, 103, 0.45); ev(5.3, I.ding, 98, 0.4);             // a glass somewhere
  ev(6.15, I.swish, 0.5, 0.6); ev(6.9, I.ding, 96, 0.7);            // the brim, and the glint on it

  // ---- bars 2-3 (8-16): the walk. The groove wakes up: a footfall on every beat, the riff, thin stabs.
  const walk = [['Gm', 2], ['Eb', 3]];
  for (const [nm, bar] of walk) {
    const ch = CHD[nm];
    for (let q = 0; q < 4; q++) { ev(bar * 4 + q, I.kick, 0.85); if (q % 2) ev(bar * 4 + q, I.snap, 0.9); ev(bar * 4 + q + 0.5, I.hat, 0.6); }
    riff(bar, ch, 0.9);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.8);
    if (bar === 3) comp(bar, ch, 0.7);
  }
  ev(12, I.upright, 39, 0.8);
  // the lead-in: D7 stabs and a snare build into the spotlight
  ev(14, I.stab, CHD.D7.s, BEAT * 0.4, 0.9); ev(14.5, I.stab, CHD.D7.s, BEAT * 0.3, 0.8); ev(15, I.stab, CHD.D7.s, BEAT * 0.3, 0.9);
  for (let i = 0; i < 8; i++) ev(14 + i * 0.25, I.snare, 0.22 + i * 0.09);
  ev(14, I.riser, BEAT * 2, 0.8);
  ev(13.5, I.bell, 91, 0.6, 0.6, 2.5, 1);

  // ---- bars 4-5 (16-24): in the light. Full groove, brass on the "ands", the bell motif.
  ev(16, I.crash, 1.0);
  ev(16, I.timp, 43, 1.0);
  const sp = [['Gm', 4], ['Eb', 5]];
  for (const [nm, bar] of sp) {
    const ch = CHD[nm];
    drums(bar, { clap: bar === 5, open: true });
    riff(bar, ch, 1.0); comp(bar, ch, 1.0);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.85);
  }
  tune(4, M_GM, I.bell, 0, 1, [1, 3]); tune(5, M_EB, I.bell, 0, 1, [1, 3]);
  tune(4, M_GM, I.brass, -12, 0.55); tune(5, M_EB, I.brass, -12, 0.55);
  ev(20.3, I.whoosh, 0.7, 0.7, 0.6);            // the spin
  ev(22.3, I.ding, 100, 0.7);                   // up on the toes

  // ---- bars 6-7 (24-32): the line marches in, then glides. Cm and D7, pluck arpeggios, thicker brass.
  const gl = [['Cm', 6], ['D7', 7]];
  for (const [nm, bar] of gl) {
    const ch = CHD[nm];
    drums(bar, { clap: true, open: true });
    riff(bar, ch, 1.0); comp(bar, ch, 1.0); arpeggio(bar, ch, 0.8);
    ev(bar * 4, I.pad, ch.s, BEAT * 4, 0.9);
  }
  tune(6, M_CM, I.bell, 0, 1, [1, 3]); tune(7, M_D7, I.bell, 0, 1, [1, 3]);
  tune(6, M_CM, I.brass, -12, 0.65); tune(7, M_D7, I.brass, -12, 0.65);
  ev(31, I.riser, BEAT * 1.0, 0.7);
  for (let i = 0; i < 4; i++) ev(31 + i * 0.25, I.snare, 0.3 + i * 0.15);

  // ---- bars 8-9 (32-40): the hits. Brass and snare land on the even beats, exactly with the flung arms.
  ev(32, I.crash, 1.0); ev(32, I.timp, 43, 1.0);
  const ht = [['Gm', 8, 32], ['Eb', 8, 34], ['F', 9, 36], ['D7', 9, 38]];
  for (const [nm, bar, bt] of ht) {
    const ch = CHD[nm];
    ev(bt, I.brass, ch.s[3] + 12, BEAT * 0.5, 1.15); ev(bt, I.brass, ch.s[1] + 12, BEAT * 0.5, 0.9); ev(bt, I.stab, ch.s, BEAT * 0.45, 1.2);
    ev(bt, I.snare, 1.0); ev(bt, I.clap, 0.8); ev(bt, I.kick, 1.0);
    ev(bt + 1, I.kick, 0.9); ev(bt + 0.5, I.hat, 0.9, true); ev(bt + 1.5, I.hat, 0.7);
    for (let i = 0; i < 8; i++) ev(bt + i * 0.25, I.bass, ch.r + (i % 2 ? 12 : 0), BEAT * 0.2, i % 4 === 0 ? 1 : 0.7);
    ev(bt, I.pad, ch.s, BEAT * 2, 0.8);
  }
  ev(36, I.crash, 0.7);
  ev(35.3, I.whoosh, 0.8, 0.8, -0.6);            // the spin winds up
  for (let i = 0; i < 6; i++) ev(39 + i * 0.16, I.tom, [55, 52, 50, 47, 45, 43][i], 0.8);

  // ---- bars 10-11 (40-48): the feet. The band thins to snaps and taps; an upright walks underneath.
  ev(40, I.crash, 0.6);
  const up = [31, 34, 36, 38, 39, 38, 36, 34];
  for (let i = 0; i < 8; i++) ev(40 + i, I.upright, up[i], 0.95);
  for (let i = 0; i < 16; i++) {
    ev(40.5 + i * 0.5, i % 2 ? I.snap : I.hat, i % 2 ? 0.8 : 0.5);      // taps on the eighth notes, left then right
    if (i % 4 === 0) ev(40.5 + i * 0.5 + 0.25, I.hat, 0.35);
  }
  for (let q = 0; q < 8; q++) ev(40 + q, I.kick, 0.55);
  ev(40, I.pad, CHD.Gm.s, BEAT * 4, 0.6); ev(44, I.pad, CHD.Cm.s, BEAT * 4, 0.6);
  for (const [bt, n] of [[41, 79], [43, 77], [45, 75], [47, 74]]) ev(bt + 0.5, I.piano, n, BEAT * 0.8, 0.7);
  ev(46, I.riser, BEAT * 2, 0.6);
  for (let i = 0; i < 6; i++) ev(46 + i * 0.33, I.snap, 0.5 + i * 0.1);

  // ---- bar 12 (48-50): everything stops. One low hit as he drops, then a held chord and a heartbeat.
  ev(47.9, I.timp, 38, 1.1); ev(47.9, I.tom, 36, 1.0);
  ev(48.4, I.pad, [50, 55, 58, 62, 65], BEAT * 3.4, 1.0);
  [48.5, 49, 49.5].forEach((bt, i) => ev(bt, I.kick, 0.45 + i * 0.12));
  ev(49.6, I.swish, 0.9, 0.6);

  // ---- bar 12-13 (50-53.6): the lean. A sustained brass chord swells; bells shiver; a low pedal underneath.
  ev(50, I.timp, 31, 1.2); ev(50, I.crash, 0.55);
  for (const n of [55, 58, 62, 67, 70]) ev(50, I.brass, n, BEAT * 3.1, 0.55);
  ev(50, I.pad, [43, 50, 55, 58, 62], BEAT * 4, 1.0);
  ev(50, I.whoosh, 1.4, 0.7, 0.3);
  for (let i = 0; i < 12; i++) ev(50.9 + i * 0.25, I.bell, 91 + (i % 4) * 3 + (i > 7 ? 5 : 0), 0.3, 0.35 + i * 0.04, 3.5, 1.5);
  for (const bt of [51, 52, 53]) ev(bt, I.kick, 0.5);
  ev(52, I.riser, BEAT * 1.6, 0.9);
  // he snaps back up: a snare roll, and the whole band lands on the hat tip
  for (let i = 0; i < 8; i++) ev(53.0 + i * 0.075, I.snare, 0.3 + i * 0.09);
  ev(53.6, I.crash, 1.2); ev(53.6, I.kick, 1.1); ev(53.6, I.timp, 31, 1.2); ev(53.6, I.clap, 0.9);
  ev(53.6, I.stab, [43, 55, 58, 62, 67, 70], BEAT * 1.6, 1.3);
  ev(53.6, I.brass, 79, BEAT * 1.6, 1.15); ev(53.6, I.brass, 74, BEAT * 1.6, 0.9);
  ev(53.6, I.bass, 31, BEAT * 1.6, 1.1);
  // the tail: a glint on the brim, one snap, and the room breathing out
  ev(54.4, I.ding, 103, 0.9); ev(54.9, I.ding, 98, 0.6); ev(55.2, I.snap, 0.9);
  ev(53.6, I.pad, [55, 58, 62, 67, 70], BEAT * 2.4, 1.1);

  SCORE.sort((a, b) => a.t - b.t);
}
buildScore();

// Beat-accurate hit lists for the picture: lights, stars and camera answer the drums.
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

// his mouth, following whatever he is singing
function voiceMouth(t) {
  for (const [a, e] of VOICE) {
    if (t >= a - 0.03 && t <= e + 0.08) {
      const k = smoothstep(a - 0.03, a + 0.04, t) * (1 - smoothstep(e - 0.02, e + 0.08, t));
      const syl = 0.62 + 0.38 * Math.abs(Math.sin(Math.PI * (t - a) / (BEAT * 0.5)));
      return 0.18 + 0.72 * k * syl;
    }
  }
  return 0.12;
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
