// ============================================================
// Sound. The voice-over (narracao.mp3, embedded by tools/build.mjs as VOICE_SRC) leads; under it an
// original score synthesised with WebAudio, no samples. The broadcast half is a D minor drone, a
// heartbeat and sound design locked to the picture (the switch-on, the spotlight, the claws, the
// scanner, the snarl); a riser dies into silence before the turn, and the Ranking's world opens in
// D major with a soft pulse that lands on the logo. Music and effects duck under every phrase.
// Everything is rendered offline through one desk, so the player and the MP4 sound the same.
// ============================================================
const mtof = n => 440 * Math.pow(2, (n - 69) / 12);
const SCORE = [];
let A = null;       // the active desk while rendering
// levels, calibrated against the voice (-14.5 LUFS integrated)
const MIX = { music: 0.085, fx: 0.11, voice: 0.68, duckM: 0.42, duckFx: 0.62 };

function buildDesk(ctx) {
  const master = ctx.createGain();
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -1.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.08;
  master.connect(lim); lim.connect(ctx.destination);
  // music + effects are glued together, then sit under the voice
  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -18; glue.knee.value = 8; glue.ratio.value = 2.5; glue.attack.value = 0.01; glue.release.value = 0.2;
  const bus = ctx.createGain(); bus.connect(glue); glue.connect(master);
  const mk = (lvl) => { const g = ctx.createGain(), d = ctx.createGain(), l = ctx.createGain(); l.gain.value = lvl; g.connect(d); d.connect(l); l.connect(bus); return [g, d, l]; };
  const [mus, musDuck, musLvl] = mk(MIX.music), [fx, fxDuck, fxLvl] = mk(MIX.fx);
  // the reverb return rides the music bus: same level, ducked with it
  const rev = ctx.createConvolver(); rev.buffer = impulse(ctx, 2.8, 3.0);
  const revG = ctx.createGain(); revG.gain.value = 0.4; rev.connect(revG); revG.connect(musDuck);
  const voice = ctx.createGain(); voice.gain.value = MIX.voice; voice.connect(master);
  const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0), r = mulberry(99);
  for (let i = 0; i < nd.length; i++) nd[i] = r() * 2 - 1;
  return { ctx, master, bus, mus, musDuck, musLvl, fx, fxDuck, fxLvl, rev, voice, noise: nb };
}
function impulse(ctx, dur, decay) {
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(2, n, ctx.sampleRate), r = mulberry(11);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay); }
  return b;
}
// the music and effects buses dip under every phrase of the voice (phrases closer than 0.35 s merge)
function duck(param, depth, lead) {
  const iv = [];
  for (const [a, b] of VO) { if (iv.length && a - iv[iv.length - 1][1] < 0.35) iv[iv.length - 1][1] = b; else iv.push([a, b]); }
  param.setValueAtTime(1, 0);
  for (const [a, b] of iv) {
    param.setValueAtTime(1, Math.max(0, a - 0.12 + lead));
    param.linearRampToValueAtTime(depth, a + lead);
    param.setValueAtTime(depth, b + 0.06 + lead);
    param.linearRampToValueAtTime(1, b + 0.45 + lead);
  }
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
function env(g, t, dur, v, att, rel) {
  att = att || 0.01; rel = rel || 0.1;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + att);
  g.gain.setValueAtTime(v, t + Math.max(att, dur - rel)); g.gain.linearRampToValueAtTime(0, t + dur);
}
function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
function sendRev(node, amt) { if (amt > 0) { const g = G(amt); node.connect(g); g.connect(A.rev); } }

// ---------- the bed
function drone(t, dur, notes, v, cut, att, rel) {
  // detuned saws through a slowly breathing lowpass, with a sub an octave under the root
  const p = G(0); env(p, t, dur, v / notes.length, att || 1.5, rel || 0.8);
  for (const m of notes) for (const det of [-8, 7]) { const o = osc('sawtooth', mtof(m), t, t + dur + 0.05); o.detune.value = det; o.connect(p); }
  const lp = filt('lowpass', cut, 1.1);
  const lfo = osc('sine', 0.11, t, t + dur + 0.05), lg = G(cut * 0.3); lfo.connect(lg); lg.connect(lp.frequency);
  chain(p, lp, A.mus); sendRev(lp, 0.25);
  const sub = osc('sine', mtof(notes[0] - 12), t, t + dur + 0.05), sg = G(0); env(sg, t, dur, v * 0.55, att || 1.5, rel || 0.8);
  chain(sub, sg, A.mus);
}
function tension(t, dur, notes, v) {
  // a high, thin cluster that beats against itself
  notes.forEach((m, i) => {
    const o = osc('sine', mtof(m), t, t + dur + 0.05), vib = osc('sine', 4.5 + i, t, t + dur), vg = G(3);
    vib.connect(vg); vg.connect(o.detune);
    const g = G(0); env(g, t, dur, v / notes.length, 1.8, 1.0);
    chain(o, g, A.mus); sendRev(g, 0.6);
  });
}
function heart(t, v) {
  // lub-dub
  for (const [dt, k] of [[0, 1], [0.19, 0.62]]) {
    const o = osc('sine', 60, t + dt, t + dt + 0.35);
    o.frequency.setValueAtTime(82, t + dt); o.frequency.exponentialRampToValueAtTime(40, t + dt + 0.13);
    const g = G(0); perc(g, t + dt, v * k, 0.24, 0.006);
    chain(o, g, A.mus);
    const n = noise(t + dt, t + dt + 0.05), f = filt('lowpass', 260), g2 = G(0); perc(g2, t + dt, v * k * 0.35, 0.03);
    chain(n, f, g2, A.mus);
  }
}
function heartbeat(t0, t1, bpm, v) { for (let t = t0; t < t1; t += 60 / bpm) heart(t, v); }
function pad(t, notes, dur, v, cutoff, att) {
  const p = G(1);
  for (const m of notes) for (const det of [-10, 0, 11]) {
    const o = osc('sawtooth', mtof(m), t, t + dur + 1.2); o.detune.value = det;
    const g = G(0); env(g, t, dur + 0.9, v / notes.length / 3, att || 0.5, 0.9);
    chain(o, g, p);
  }
  const lp = filt('lowpass', cutoff || 1200, 0.7);
  chain(p, lp, A.mus); sendRev(lp, 0.45);
}
function pluck(t, m, v, dec, p) {
  const o = osc('sawtooth', mtof(m), t, t + 1.4), o2 = osc('triangle', mtof(m + 12), t, t + 1.4);
  const lp = filt('lowpass', 4000, 2);
  lp.frequency.setValueAtTime(4500, t); lp.frequency.exponentialRampToValueAtTime(420, t + 0.3);
  const g = G(0); perc(g, t, v, dec || 0.55);
  o.connect(lp); o2.connect(lp);
  chain(lp, g, pan(p || 0), A.mus); sendRev(g, 0.35);
}
function bassN(t, m, dur, v) {
  const o = osc('triangle', mtof(m), t, t + dur + 0.1), o2 = osc('sine', mtof(m - 12), t, t + dur + 0.1);
  const lp = filt('lowpass', 900, 1);
  const g = G(0); env(g, t, dur, v, 0.008, Math.min(0.12, dur * 0.4));
  o.connect(lp); o2.connect(lp); chain(lp, g, A.mus);
}
function kickS(t, v) {
  const o = osc('sine', 120, t, t + 0.4);
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
  const g = G(0); perc(g, t, v, 0.32);
  chain(o, g, A.mus);
}
function clapS(t, v) {
  const n = noise(t, t + 0.25), f = filt('bandpass', 1600, 1.1), g = G(0);
  g.gain.setValueAtTime(0, t);
  for (let k = 0; k < 3; k++) { g.gain.setValueAtTime(v, t + k * 0.011); g.gain.exponentialRampToValueAtTime(v * 0.2, t + k * 0.011 + 0.009); }
  g.gain.setValueAtTime(v * 0.8, t + 0.033); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
  chain(n, f, g, A.mus); sendRev(g, 0.3);
}
function shaker(t, v, p) {
  const n = noise(t, t + 0.08), f = filt('highpass', 7000), g = G(0);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  chain(n, f, g, pan(p || 0), A.mus);
}
function hat(t, v) {
  const n = noise(t, t + 0.1), f = filt('highpass', 9000), g = G(0); perc(g, t, v, 0.035);
  chain(n, f, g, pan(0.25), A.mus);
}
function roll(t0, t1, v0, v1, step) {
  let t = t0;
  while (t < t1) {
    const u = (t - t0) / (t1 - t0);
    const n = noise(t, t + 0.1), f = filt('bandpass', 3000, 0.8), g = G(0); perc(g, t, lerp(v0, v1, u * u), 0.06);
    chain(n, f, g, A.fx);
    t += u < 0.5 ? step : step / 2;
  }
}

// ---------- sound design (effects bus)
function impact(t, v, f0) {
  const o = osc('sine', 70, t, t + 1.8), g = G(0);
  o.frequency.setValueAtTime(f0 || 85, t); o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
  perc(g, t, v, 1.4);
  chain(o, g, A.fx);
  const n = noise(t, t + 0.6), f = filt('lowpass', 1100), g2 = G(0); perc(g2, t, v * 0.6, 0.3);
  chain(n, f, g2, A.fx); sendRev(g2, 0.5);
}
function braam(t, v, root, dur) {
  // a low brass-like blast: detuned saws, the filter opens and closes
  dur = dur || 1.6;
  const p = G(0); perc(p, t, v, dur, 0.03);
  for (const m of [root, root + 7, root + 12]) for (const det of [-12, 0, 13]) { const o = osc('sawtooth', mtof(m), t, t + dur + 0.2); o.detune.value = det; o.connect(p); }
  const lp = filt('lowpass', 200, 3);
  lp.frequency.setValueAtTime(180, t); lp.frequency.exponentialRampToValueAtTime(1500, t + 0.09); lp.frequency.exponentialRampToValueAtTime(260, t + dur);
  const g = G(0.33);
  chain(p, lp, g, A.fx); sendRev(g, 0.5);
}
function whoosh(t, dur, v, up, p0, p1) {
  const n = noise(t, t + dur + 0.05), f = filt('bandpass', 800, 1.3), g = G(0), p = pan(p0 === undefined ? -0.5 : p0);
  f.frequency.setValueAtTime(up === false ? 4500 : 350, t); f.frequency.exponentialRampToValueAtTime(up === false ? 350 : 4800, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur * 0.75); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  p.pan.setValueAtTime(p0 === undefined ? -0.5 : p0, t); p.pan.linearRampToValueAtTime(p1 === undefined ? 0.5 : p1, t + dur);
  chain(n, f, g, p, A.fx); sendRev(g, 0.2);
}
function swell(tEnd, dur, v, hard) {
  // reversed-cymbal rise; `hard` stops it dead on tEnd
  const t = tEnd - dur, n = noise(t, tEnd + (hard ? 0 : 0.2)), f = filt('highpass', 2000), g = G(0);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, tEnd - 0.01);
  if (hard) g.gain.setValueAtTime(0, tEnd); else g.gain.exponentialRampToValueAtTime(0.0001, tEnd + 0.15);
  f.frequency.setValueAtTime(1200, t); f.frequency.exponentialRampToValueAtTime(7500, tEnd);
  chain(n, f, g, A.fx);
}
function riser(t, dur, v) {
  // pitch climbing under the noise swell, cut dead at the end
  const o = osc('sawtooth', 110, t, t + dur), o2 = osc('sawtooth', 111.5, t, t + dur);
  o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(420, t + dur);
  o2.frequency.setValueAtTime(91, t); o2.frequency.exponentialRampToValueAtTime(425, t + dur);
  const lp = filt('lowpass', 500, 4); lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(3000, t + dur);
  const g = G(0); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + dur - 0.01); g.gain.setValueAtTime(0, t + dur);
  o.connect(lp); o2.connect(lp); chain(lp, g, A.fx);
  swell(t + dur, dur, v * 0.8, true);
}
function click(t, v, f, p) {
  const n = noise(t, t + 0.03), bp = filt('bandpass', f || 3000, 2), g = G(0); perc(g, t, v, 0.014);
  chain(n, bp, g, pan(p || 0), A.fx);
}
function typeClicks(t0, t1, n, v) { for (let i = 0; i < n; i++) click(t0 + (i / n) * (t1 - t0) + hash(i) * 0.02, v * (0.6 + 0.4 * hash(i * 3)), 2600 + 1600 * hash(i * 7), (hash(i * 5) - 0.5) * 0.3); }
function zap(t, v) {
  const o = osc('sawtooth', 110, t, t + 0.08), n = noise(t, t + 0.08), bp = filt('bandpass', 1800, 0.8), g = G(0); perc(g, t, v, 0.06);
  o.connect(bp); n.connect(bp); chain(bp, g, A.fx);
}
function staticN(t, dur, v) {
  const n = noise(t, t + dur), bp = filt('bandpass', 2500, 0.6), g = G(0); env(g, t, dur, v, 0.005, dur * 0.6);
  chain(n, bp, g, A.fx);
}
function hum(t, dur, v) {
  const o = osc('sawtooth', 100, t, t + dur), lp = filt('lowpass', 520), g = G(0); env(g, t, dur, v, 0.03, 0.05);
  chain(o, lp, g, A.fx);
}
function clack(t, v) {
  // a big theatre lamp: a mechanical thunk and the arc striking
  const o = osc('square', 70, t, t + 0.15), lp = filt('lowpass', 400), g = G(0); perc(g, t, v, 0.12);
  chain(o, lp, g, A.fx);
  const n = noise(t, t + 0.12), bp = filt('bandpass', 1800, 1.5), g2 = G(0); perc(g2, t, v * 0.7, 0.05);
  chain(n, bp, g2, A.fx); sendRev(g2, 0.4);
}
function shutter(t, v, p) {
  click(t, v, 4200, p); click(t + 0.045, v * 0.7, 3000, p);
}
function tvOffSnd(t, v) {
  const o = osc('sine', 1400, t, t + 0.35), g = G(0);
  o.frequency.setValueAtTime(1500, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
  perc(g, t, v * 0.5, 0.3);
  chain(o, g, A.fx);
  zap(t, v * 0.6); staticN(t, 0.22, v * 0.5);
}
function slash(t, v) {
  // three claws in quick succession, each a bright tearing swipe
  [-0.35, 0, 0.35].forEach((p, i) => {
    const tt = t + i * 0.028, n = noise(tt, tt + 0.3), bp = filt('bandpass', 7000, 2.2), g = G(0);
    bp.frequency.setValueAtTime(9000, tt); bp.frequency.exponentialRampToValueAtTime(1100, tt + 0.16);
    g.gain.setValueAtTime(0, tt); g.gain.linearRampToValueAtTime(v, tt + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.2);
    chain(n, bp, g, pan(p), A.fx); sendRev(g, 0.3);
  });
  impact(t, v * 0.45, 70);
}
function tearSnd(t, dur, v) {
  const r = mulberry(51);
  for (let k = 0; k < 26; k++) {
    const tt = t + Math.pow(k / 26, 1.3) * dur, n = noise(tt, tt + 0.03), bp = filt('bandpass', 1400 + r() * 3600, 3), g = G(0);
    perc(g, tt, v * (0.5 + 0.5 * r()), 0.018);
    chain(n, bp, g, pan((r() - 0.5) * 0.6), A.fx);
  }
  const n = noise(t, t + dur), lp = filt('lowpass', 3000), g = G(0); env(g, t, dur, v * 0.35, 0.01, dur * 0.7);
  lp.frequency.setValueAtTime(3500, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
  chain(n, lp, g, A.fx);
}
function growl(t, dur, v) {
  const o = osc('sawtooth', 52, t, t + dur), o2 = osc('sawtooth', 77, t, t + dur);
  const am = osc('sine', 19, t, t + dur), ag = G(0.45 * v); am.connect(ag);
  const g = G(0); env(g, t, dur, v, 0.12, 0.4);
  ag.connect(g.gain);
  const lp = filt('lowpass', 700, 2); lp.frequency.setValueAtTime(400, t); lp.frequency.linearRampToValueAtTime(900, t + 0.3); lp.frequency.exponentialRampToValueAtTime(300, t + dur);
  o.connect(lp); o2.connect(lp); chain(lp, g, A.fx);
  const n = noise(t, t + dur), bp = filt('bandpass', 380, 2.5), g2 = G(0); env(g2, t, dur, v * 0.5, 0.1, 0.4);
  chain(n, bp, g2, A.fx); sendRev(g, 0.3);
}
function scanner(t, dur, v, p0, p1) {
  const o = osc('sine', 700, t, t + dur), o2 = osc('square', 350, t, t + dur);
  o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(900, t + dur);
  const lp = filt('lowpass', 1400), trem = osc('sine', 14, t, t + dur), tg = G(0.4 * v), g = G(0), p = pan(p0);
  trem.connect(tg); tg.connect(g.gain);
  env(g, t, dur, v, 0.15, 0.3);
  p.pan.setValueAtTime(p0, t); p.pan.linearRampToValueAtTime(p1, t + dur);
  const g2 = G(0.15); o2.connect(g2); g2.connect(lp); o.connect(lp);
  chain(lp, g, p, A.fx);
}
function tom(t, m, v, p) {
  const o = osc('sine', mtof(m), t, t + 0.6), g = G(0);
  o.frequency.setValueAtTime(mtof(m + 5), t); o.frequency.exponentialRampToValueAtTime(mtof(m), t + 0.05);
  perc(g, t, v, 0.4);
  chain(o, g, pan(p || 0), A.fx); sendRev(g, 0.25);
  click(t, v * 0.25, 1800, p);
}
function bell(t, m, v, bus) {
  for (const [k, a, d] of [[1, 1, 1.6], [2.0, 0.4, 1.0], [2.76, 0.28, 0.7], [5.4, 0.1, 0.35]]) {
    const o = osc('sine', mtof(m) * k, t, t + 2.2), g = G(0); perc(g, t, v * a, d);
    chain(o, g, bus || A.fx); sendRev(g, 0.45);
  }
}
function plink(t, m, v, p) {
  const f = mtof(m), q = pan(p || 0);
  for (const [k, a, d] of [[1, 1, 0.25], [3.01, 0.22, 0.08], [5.2, 0.07, 0.05]]) {
    const o = osc('sine', f * k, t, t + 0.4), g = G(0); perc(g, t, v * a, d);
    chain(o, g, q);
  }
  q.connect(A.fx); sendRev(q, 0.3);
}
function pop(t, v, m) {
  const o = osc('sine', mtof(m || 79), t, t + 0.12), g = G(0);
  o.frequency.setValueAtTime(mtof((m || 79) - 12), t); o.frequency.exponentialRampToValueAtTime(mtof(m || 79), t + 0.04);
  perc(g, t, v, 0.09);
  chain(o, g, A.fx);
}
function tick(t, v, hi) {
  const o = osc('square', hi ? 2400 : 1900, t, t + 0.02), bp = filt('bandpass', hi ? 2400 : 1900, 4), g = G(0); perc(g, t, v, 0.02);
  chain(o, bp, g, A.fx);
  click(t, v * 0.6, 5000);
}
function shimmer(t, dur, v, notes, bus) {
  notes.forEach((m, i) => {
    const o = osc('sine', mtof(m), t, t + dur + 0.5), trem = osc('sine', 5 + i, t, t + dur + 0.5), tg = G(0.35 * v / notes.length), g = G(0);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v / notes.length, t + 0.3 + i * 0.06); g.gain.linearRampToValueAtTime(0, t + dur);
    trem.connect(tg); tg.connect(g.gain);
    chain(o, g, bus || A.mus); sendRev(g, 0.7);
  });
}
function brassChord(t, notes, dur, v) {
  const p = G(1);
  for (const m of notes) for (const det of [-7, 6]) {
    const o = osc('sawtooth', mtof(m), t, t + dur + 0.4); o.detune.value = det;
    const lp = filt('lowpass', 400, 1.2);
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.05); lp.frequency.exponentialRampToValueAtTime(900, t + dur);
    const g = G(0); env(g, t, dur + 0.3, v / notes.length, 0.015, 0.4);
    chain(o, lp, g, p);
  }
  p.connect(A.fx); sendRev(p, 0.5);
}

// ---------- the score (seconds on the piece clock)
const ev = (t, fn, ...a) => SCORE.push({ t, fn, a });
// the Ranking's pulse: 7 bars from the method's first word to the logo (59.17 lands on a downbeat)
const G0 = 41.95, GB = (59.17 - 41.95) / 28;
const gt = (bar, beat) => G0 + (bar * 4 + beat) * GB;
const CHD = { D: { r: 38, pad: [57, 62, 66, 69], arp: [62, 66, 69, 74] }, Bm: { r: 35, pad: [54, 59, 62, 66], arp: [59, 62, 66, 71] },
  G: { r: 43, pad: [55, 59, 62, 67], arp: [59, 62, 67, 71] }, A: { r: 45, pad: [57, 61, 64, 69], arp: [61, 64, 69, 73] } };
const PROG = ['D', 'Bm', 'G', 'A', 'D', 'Bm', 'G'];

function buildScore() {
  SCORE.length = 0;
  // ===== 1. the broadcast switches on; a D minor drone and a slow heart
  ev(0.12, zap, 0.3); ev(0.12, staticN, 0.35, 0.18); ev(0.3, click, 0.25, 1500);
  ev(0.2, drone, 9.5, [38, 45], 0.3, 360, 2.5, 0.2);
  ev(0.5, heartbeat, 9.5, 62, 0.42);
  ev(0.25, whoosh, 2.7, 0.05, true, -0.4, 0.4);                     // the flag being drawn
  ev(3.05, pop, 0.18, 62); ev(3.05, click, 0.12, 2200);
  ev(4.70, braam, 0.55, 38, 1.3); ev(4.70, impact, 0.6);           // NÃO
  ev(5.27, impact, 0.35, 75);                                        // VÁ
  ev(5.55, braam, 0.8, 38, 2.4); ev(5.55, impact, 0.9); ev(5.55, tearSnd, 0.35, 0.3);   // VOTAR.
  ev(5.5, tension, 4.1, [74, 75], 0.05);
  ev(6.46, zap, 0.12);
  ev(6.55, typeClicks, 9.2, 30, 0.06);
  ev(9.5, tvOffSnd, 0.5);
  // ===== 2. the stage: a lamp strikes, phones go up, the lamp dies
  ev(10.07, clack, 0.55); ev(10.07, hum, 3.15, 0.055); ev(10.0, drone, 3.7, [26, 38], 0.4, 220, 0.4, 0.2);
  ev(10.3, whoosh, 0.8, 0.05, true, -0.2, 0.2);
  for (const [i, t0] of FLASHES) ev(t0, shutter, 0.2, (PHONES[i][0] - 540) / 600);
  ev(12.4, typeClicks, 12.95, 24, 0.05);
  ev(13.22, clack, 0.35);
  // ===== 3. the eyes, the Congress, the claws
  ev(13.70, impact, 0.8, 60); ev(13.70, growl, 1.0, 0.12);
  ev(13.62, drone, 12.05, [38, 45, 53], 0.5, 480, 0.5, 0.25);
  ev(14.0, heartbeat, 25.3, 74, 0.36);
  ev(14.0, whoosh, 2.4, 0.04, true, 0.3, -0.3);
  ev(16.0, tension, 9.4, [69, 70], 0.04);
  for (const [t0, ts] of CARDS) { ev(t0, whoosh, 0.5, 0.06, true, 0, 0); ev(ts, slash, 0.5); }
  ev(21.9, bell, 78, 0.06);                                         // "garante"
  ev(22.89, tearSnd, 0.55, 0.4); ev(22.89, impact, 0.55);           // "ou tira"
  ev(24.9, riser, 0.55, 0.1);
  ev(25.45, zap, 0.35); ev(25.45, staticN, 0.2, 0.3);
  // ===== 4. the rows walk in on the count
  ev(25.63, drone, 6.8, [38, 45, 50], 0.3, 420, 0.6, 0.4);
  ROW_T.forEach((t0, ri) => ev(t0, tom, 38 + ri * 2, 0.34, (ri % 2 ? -0.2 : 0.2)));
  ev(29.73, typeClicks, 31.1, 34, 0.045);
  ev(31.8, swell, 1.4, 0.08);                                        // the shadows on the wall
  // ===== 5. the scan
  ev(32.32, drone, 5.56, [38, 44, 50], 0.36, 620, 0.3, 0.02);
  ev(32.45, heartbeat, 37.8, 94, 0.4);
  ev(32.45, scanner, 1.5, 0.05, -0.8, 0.05);
  ev(35.18, scanner, 1.42, 0.05, 0.05, 0.8);
  ev(34.17, bell, 81, 0.07); ev(34.3, bell, 86, 0.05);              // the lambs
  ev(36.69, growl, 1.1, 0.3); ev(36.69, impact, 0.4, 60);            // the wolves
  ev(35.3, tension, 2.58, [74, 75, 80], 0.05);
  ev(36.6, riser, 1.26, 0.16);                                       // ...and silence at 37.86
  // ===== 6. the turn: D major opens up
  ev(38.31, pad, [50, 57, 62, 66, 69], 3.6, 0.18, 1600, 0.9);
  ev(38.31, shimmer, 3.8, 0.035, [81, 86, 90]);
  ev(38.31, bassN, 38, 3.4, 0.2);
  ev(38.5, whoosh, 0.7, 0.05, true, 0, 0);
  ev(39.18, swell, 0.7, 0.07);
  ev(39.18, bell, 86, 0.1); ev(39.24, bell, 90, 0.07); ev(39.18, impact, 0.25, 55);
  ev(39.2, whoosh, 1.3, 0.07, true, -0.7, 0.4);
  ev(40.1, pluck, 74, 0.12); ev(40.1, pluck, 78, 0.1); ev(40.32, pluck, 81, 0.12);
  ev(41.75, whoosh, 0.4, 0.1, true, 0, 0);
  // ===== 7-8. the method, the stopwatch: a light pulse
  for (let bar = 0; bar < 7; bar++) {
    const halves = bar === 6 ? ['G', 'A'] : [PROG[bar], PROG[bar]];
    halves.forEach((c, h) => ev(gt(bar, h * 2), pad, CHD[c].pad, 2 * GB, bar === 4 ? 0.14 : 0.17, 1300, 0.08));
    for (let e = 0; e < 8; e++) {
      const c = CHD[halves[e < 4 ? 0 : 1]], tt = gt(bar, e / 2);
      ev(tt, bassN, c.r + (e % 2 ? 12 : 0), GB * 0.42, 0.16);
      ev(tt, shaker, e % 2 ? 0.05 : 0.025, e % 2 ? 0.2 : -0.2);
      if (bar >= 2 && bar !== 4) ev(tt, pluck, c.arp[e % 4] + 12, 0.035, 0.3, (e % 4) / 2 - 0.75);
    }
    for (const b of bar === 4 ? [0] : [0, 2]) ev(gt(bar, b), kickS, 0.4);
    if (bar >= 2 && bar !== 4) for (const b of [1, 3]) ev(gt(bar, b), clapS, 0.1);
    if (bar >= 5) for (let s = 0; s < 16; s++) ev(gt(bar, s / 4), hat, 0.02 + 0.025 * ((bar - 5) * 16 + s) / 32);
  }
  ev(gt(6, 2), roll, gt(7, 0) - 0.02, 0.03, 0.2, GB / 4);
  ev(gt(7, 0), swell, gt(7, 0) - gt(6, 2.5), 0.1);
  CRIT7.forEach(([, t0], i) => { ev(t0, pluck, [74, 78, 81, 86][i], 0.12, 0.5); ev(t0, pop, 0.08, 79 + i * 2); });
  ev(47.27, whoosh, 0.6, 0.08, true, -0.6, 0.1); ev(47.5, whoosh, 0.6, 0.08, true, 0.6, -0.1);
  for (let i = 0; i < 4; i++) ev(47.95 + i * 0.15, plink, 81 + i * 2, 0.04, 0);
  for (let i = 0; i < 16; i++) ev(48.99 + (1 - Math.cbrt(1 - i / 16)) * 1.11, click, 0.08, 3800, 0);   // the count, one tick per step of the number
  ev(50.1, bell, 86, 0.08);
  ev(50.42, impact, 0.28, 60); ev(50.42, pluck, 62, 0.1); ev(51.69, impact, 0.3, 65); ev(51.69, pluck, 69, 0.12);
  ev(52.6, whoosh, 0.4, 0.08, false, 0.4, -0.4);
  ev(52.98, whoosh, 0.5, 0.06, false, 0, 0);
  ev(53.12, typeClicks, 54.5, 23, 0.04);
  for (let t = 53.4; t < 55.3; t += 0.5) ev(t, tick, 0.5, false);
  ev(55.3, click, 0.2, 1400);
  for (let i = 0; i < 14; i++) ev(55.36 + E.inOutCubic(i / 14) * 0.83, tick, 0.32, true);
  ev(56.19, bell, 81, 0.08);
  ev(56.19, whoosh, 0.4, 0.04, false, 0, 0);
  YEARS_T.forEach((t0, i) => { ev(t0, pluck, [74, 78, 81, 86][i], 0.12, 0.5, (i - 1.5) / 2); ev(t0 + 0.12, plink, [86, 90, 93, 98][i], 0.03, (i - 1.5) / 2); });
  // ===== 9. the mark
  ev(59.17, impact, 0.6, 70); ev(59.17, brassChord, [50, 57, 62, 66, 69], 1.6, 0.25); ev(59.17, kickS, 0.6);
  ev(59.17, pad, [50, 57, 62, 66, 69, 74], 5.6, 0.14, 1800, 0.3);
  ev(59.17, bassN, 38, 5.8, 0.2);
  ev(59.17, shimmer, 5.9, 0.035, [86, 90, 93, 98]);
  CUTS9.forEach(([n, i], k) => { const T = n === 'bars' ? CUT_T.bars[i] : CUT_T[n]; ev(T[2], pop, 0.14, 67 + k * 3); });
  ev(60.05, whoosh, 0.6, 0.06, true, 0.3, -0.5);
  for (let j = 0; j < 19; j++) ev((j < 7 ? 60.3 + j * 0.045 : 60.5 + (j - 7) * 0.03) + 0.1, plink, 86 + [0, 4, 7, 12][j % 4], 0.018, j / 9 - 1);
  ev(60.55, click, 0.22, 2200); ev(60.55, pop, 0.16, 74);
  ev(61.4, shimmer, 0.8, 0.04, [93, 98, 102], null);
  for (let i = 0; i < 7; i++) { const t0 = 61.85 + (i < 4 ? 3 - i : i - 4) * 0.12; ev(t0 + 0.3, plink, [74, 78, 81, 86, 81, 78, 74][i], 0.02, i / 3 - 1); }
  for (const b of [4, 8, 12]) ev(gt(7, b), kickS, 0.3 * (1 - b / 16));
  for (let s = 0; s < 20; s++) ev(gt(7, s / 2), shaker, 0.025 * (1 - s / 20), s % 2 ? 0.2 : -0.2);
  ev(64.72, bell, 86, 0.09); ev(64.72, pad, [50, 57, 62, 66, 69], 0.7, 0.1, 2200, 0.2);
}

// ---------- rendering
const VOICE = { bytes: null, bufs: new Map() };
async function voiceBuffer(ctx) {
  if (typeof VOICE_SRC === 'undefined') return null;
  if (VOICE.bufs.has(ctx.sampleRate)) return VOICE.bufs.get(ctx.sampleRate);
  if (!VOICE.bytes) {
    const bin = atob(VOICE_SRC.slice(VOICE_SRC.indexOf(',') + 1)), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    VOICE.bytes = u.buffer;
  }
  const b = await ctx.decodeAudioData(VOICE.bytes.slice(0));
  VOICE.bufs.set(ctx.sampleRate, b);
  return b;
}
const LEAD = 0.02;
// Render offline. parts: 'mix' (voice + score), 'score', 'music', 'fx', 'voice'.
async function renderAudio(sr, parts) {
  parts = parts || 'mix';
  const off = new OfflineAudioContext(2, Math.ceil(sr * (DUR + 1.5)), sr);
  A = buildDesk(off);
  duck(A.musDuck.gain, MIX.duckM, LEAD); duck(A.fxDuck.gain, MIX.duckFx, LEAD);
  let errs = 0;
  if (parts === 'music') A.fxLvl.gain.value = 0;
  if (parts === 'fx') A.musLvl.gain.value = 0;
  if (parts !== 'voice') {
    if (!SCORE.length) buildScore();
    SCORE.sort((x, y) => x.t - y.t);
    for (const e of SCORE) { try { e.fn(e.t + LEAD, ...e.a); } catch (x) { if (errs++ < 3) console.error(x); } }
  }
  if (parts === 'mix' || parts === 'voice') {
    const vb = await voiceBuffer(off);
    if (vb) { const s = off.createBufferSource(); s.buffer = vb; s.connect(A.voice); s.start(LEAD); }
  }
  const buf = await off.startRendering();
  A = null;
  return { buf, errs };
}
// 16-bit stereo WAV of exactly DUR seconds (base64) for tools/render.py; a short fade at the very end
async function audioWav(sr, parts) {
  sr = sr || 48000;
  const { buf, errs } = await renderAudio(sr, parts);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  const skip = Math.round(sr * LEAD), len = Math.round(sr * DUR), fade = Math.round(sr * 0.1);
  let pk = 0;
  for (let i = skip; i < skip + len; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const bytes = new Uint8Array(44 + len * 4), dv = new DataView(bytes.buffer);
  const wr = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  wr(0, 'RIFF'); dv.setUint32(4, 36 + len * 4, true); wr(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
  dv.setUint16(22, 2, true); dv.setUint32(24, sr, true); dv.setUint32(28, sr * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true);
  wr(36, 'data'); dv.setUint32(40, len * 4, true);
  for (let i = 0; i < len; i++) {
    const f = i > len - fade ? (len - i) / fade : 1;
    dv.setInt16(44 + i * 4, clamp(L[i + skip] * f, -1, 1) * 32767, true);
    dv.setInt16(46 + i * 4, clamp(R[i + skip] * f, -1, 1) * 32767, true);
  }
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return { errs, events: SCORE.length, peakDb: +(20 * Math.log10(pk + 1e-12)).toFixed(2), seconds: +(len / sr).toFixed(3), b64: btoa(bin) };
}

// ---------- live playback: the whole mix is rendered once (in the background, right after load),
// then played against the audio clock
const PLAY = { ctx: null, src: null, t0: 0, buf: null, muted: false, gain: null, pending: null };
function audioPrepare() {
  if (!PLAY.pending) PLAY.pending = renderAudio(48000, 'mix').then(({ buf }) => {
    const skip = Math.round(48000 * LEAD), len = Math.round(48000 * DUR);
    const b = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: 48000 });
    for (let c = 0; c < 2; c++) b.getChannelData(c).set(buf.getChannelData(c).subarray(skip, skip + len));
    PLAY.buf = b;
    return b;
  });
  return PLAY.pending;
}
async function audioStart(from) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  if (!PLAY.ctx) { PLAY.ctx = new AC(); PLAY.gain = PLAY.ctx.createGain(); PLAY.gain.gain.value = PLAY.muted ? 0 : 1; PLAY.gain.connect(PLAY.ctx.destination); }
  if (PLAY.ctx.state === 'suspended') await PLAY.ctx.resume();
  await audioPrepare();
  audioStop();
  const src = PLAY.ctx.createBufferSource();
  src.buffer = PLAY.buf; src.connect(PLAY.gain);
  PLAY.t0 = PLAY.ctx.currentTime + 0.1 - (from || 0);
  src.start(PLAY.ctx.currentTime + 0.1, from || 0);
  PLAY.src = src;
  return true;
}
function audioStop() { if (PLAY.src) { try { PLAY.src.stop(); } catch (e) { /* already stopped */ } PLAY.src = null; } }
const audioTime = () => (PLAY.src ? Math.max(0, PLAY.ctx.currentTime - PLAY.t0) : null);
function audioMute(m) { PLAY.muted = m; if (PLAY.gain) PLAY.gain.gain.value = m ? 0 : 1; }
