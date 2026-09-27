"""Spec-driven sound: voice cleanup + retime, music (generated / file / none) at background or foreground
level, SFX cues, ducking and loudness normalization to -14 LUFS / -1 dBTP."""
import json
import os
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
rng = np.random.default_rng(3)


def run(*a):
    subprocess.run([str(x) for x in a], check=True)


def decode(path, mono=True):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-vn", "-ac", "1" if mono else "2", "-ar", str(SR),
                          "-f", "f32le", "-"], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32)
    return a if mono else a.reshape(-1, 2).T


def lp(x, fc, o=2):
    return sosfilt(butter(o, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, o=2):
    return sosfilt(butter(o, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, o=2):
    return sosfilt(butter(o, [lo, min(hi, SR / 2 - 100)], "band", fs=SR, output="sos"), x)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self, n):
        self.b = np.zeros((2, n), np.float32)
        self.n = n

    def add(self, t0, sig, gain=1.0, pan=0.0):
        i = int(t0 * SR)
        if i >= self.n or i + len(sig) <= 0:
            return
        s = sig[max(0, -i):self.n - i] * gain
        i = max(0, i)
        self.b[0, i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
        self.b[1, i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def env(n, a, r):
    e = np.ones(n, np.float32)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def saw(f, n):
    t = np.arange(n) / SR
    return (2 * ((f * t + rng.random()) % 1.0) - 1).astype(np.float32)


def pad(m, dur, g, bright=1400):
    n = int(dur * SR)
    L, R = np.zeros(n, np.float32), np.zeros(n, np.float32)
    for cents, pan in ((-8, -0.7), (0, 0), (7, 0.7)):
        s = saw(mtof(m) * 2 ** (cents / 1200), n)
        L += s * np.sqrt(0.5 * (1 - pan))
        R += s * np.sqrt(0.5 * (1 + pan))
    e = env(n, 0.9, 1.2) * g
    return lp(L, bright, 4) * e, lp(R, bright, 4) * e


def key(m, dur=1.2, bright=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    body = np.sin(2 * np.pi * f * t + bright * np.exp(-t / 0.12) * np.sin(2 * np.pi * f * t))
    tine = 0.18 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.03)
    return ((body + tine) * np.exp(-t / 0.45) * np.minimum(1, t / 0.003)).astype(np.float32)


def kick():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * np.cumsum(45 + 75 * np.exp(-t / 0.04)) / SR
    return (np.sin(ph) * np.exp(-t / 0.28) + rng.normal(0, 1, n) * np.exp(-t / 0.004) * 0.3).astype(np.float32) * 0.9


def hat():
    n = int(0.08 * SR)
    return (hp(rng.normal(0, 1, n), 7000, 4) * np.exp(-np.arange(n) / SR / 0.018)).astype(np.float32)


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    e = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.011, 0.022)) + 0.5 * np.exp(-np.maximum(0, t - 0.03) / 0.09) * (t >= 0.03)
    return (bp(rng.normal(0, 1, n), 900, 3500) * e * 0.5).astype(np.float32)


def boom(dur=2.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * np.cumsum(32 + 38 * np.exp(-t / 0.18)) / SR) * np.exp(-t / 0.9)
    return np.tanh((sub + lp(rng.normal(0, 1, n), 900) * np.exp(-t / 0.25) * 0.6) * 1.4).astype(np.float32)


def riser(dur):
    n = max(int(dur * SR), 2048)
    u = np.arange(n) / n
    noise, out = rng.normal(0, 1, n), np.zeros(n)
    for i in range(0, n, 1024):
        c = 300 * (20 ** u[i])
        out[i:i + 1024] = bp(noise[max(0, i - 2048):i + 1024], c * 0.7, c * 1.4)[-min(1024, n - i):]
    tone = np.sin(2 * np.pi * np.cumsum(180 * 4 ** u) / SR) * 0.25
    return ((out + tone) * u ** 2.2).astype(np.float32)


def whoosh(dur=0.45):
    n = int(dur * SR)
    u = np.arange(n) / n
    noise = rng.normal(0, 1, n)
    return ((bp(noise, 400, 1600) * (1 - u) + bp(noise, 1800, 7000) * u) * np.sin(np.pi * u) ** 2 * (1 - u) ** 0.3).astype(np.float32)


def tick(f=2000):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + rng.normal(0, 1, n) * np.exp(-t / 0.002) * 0.25).astype(np.float32)


def thump():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t / 0.05) + 50) / SR) * np.exp(-t / 0.08)).astype(np.float32)


def pop():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(900 * np.exp(-t / 0.02) + 300) / SR) * np.exp(-t / 0.03)).astype(np.float32)


def reverb(bus, n):
    m = int(2.4 * SR)
    t = np.arange(m) / SR
    ir = rng.normal(0, 1, (2, m)) * np.exp(-t * (6.9 / 2.2))
    ir = np.stack([lp(ir[0], 5000), lp(ir[1], 5200)])
    ir /= np.abs(ir).sum(1, keepdims=True) / 40
    return np.stack([fftconvolve(bus[c], ir[c])[:n] for c in range(2)]).astype(np.float32)


MOODS = {  # bpm, chord set, drums
    "cinematic": (98, [([57, 60, 64, 67, 71], 33), ([53, 57, 60, 64, 67], 29), ([55, 60, 62, 64, 67], 36), ([55, 59, 62, 64, 69], 31)], True),
    "upbeat": (118, [([60, 64, 67, 71], 36), ([57, 60, 64, 67], 33), ([53, 57, 60, 65], 29), ([55, 59, 62, 67], 31)], True),
    "calm": (80, [([60, 64, 67, 71], 36), ([57, 60, 64, 69], 33), ([53, 57, 60, 64], 29), ([55, 60, 62, 67], 31)], False),
    "dark": (90, [([57, 60, 64], 33), ([53, 57, 60], 29), ([52, 55, 59], 28), ([57, 60, 64], 33)], True),
}


def generated_score(n, dur, mood, hits_out):
    mood_key = next((k for k in MOODS if k in (mood or "")), "cinematic")
    bpm, chords, drums = MOODS[mood_key]
    beat = 60 / bpm
    if len(hits_out) >= 2 and hits_out[-1] - hits_out[0] > 2:
        span = hits_out[-1] - hits_out[0]
        beat = span / max(1, round(span / beat))
    anchor = hits_out[0] if hits_out else 0.0
    b0 = anchor - math_floor(anchor / beat) * beat
    groove_from = hits_out[0] if hits_out else dur * 0.35
    final = hits_out[-1] if len(hits_out) >= 2 else max(0.0, dur - 3.0)
    mus, wet = Bus(n), Bus(n)
    k = 0
    while b0 + k * beat < final:
        t = b0 + k * beat
        notes, root = chords[(k // 4) % len(chords)]
        if k % 4 == 0:
            for m in notes:
                L, R = pad(m, beat * 4 + 1.4, 0.05 if t < groove_from else 0.065)
                mus.add(t - 0.15, L, 1, -0.3)
                mus.add(t - 0.15, R, 1, 0.3)
                wet.add(t - 0.15, (L + R) * 0.5, 0.8)
            if t >= groove_from:
                nn = int(beat * 4 * SR)
                bass = np.tanh(1.6 * np.sin(2 * np.pi * mtof(root + 12) * np.arange(nn) / SR)) * env(nn, 0.02, 0.3)
                mus.add(t, lp(bass, 300).astype(np.float32), 0.1)
        for h in (0, 1):
            step = k * 2 + h
            if t < groove_from and h == 1:
                continue
            m = [notes[0] + 12, notes[2 % len(notes)] + 12, notes[1] + 12, notes[3 % len(notes)] + 12][step % 4]
            s = key(m)
            vel = (0.075 if t < groove_from else 0.09) * (0.7 if h else 1)
            mus.add(t + h * beat / 2, s, vel, 0.35 if step % 2 else -0.35)
            wet.add(t + h * beat / 2, s, vel * 0.9)
        if drums and t >= groove_from and t < final - beat * 4:
            if k % 4 == 0:
                mus.add(t, kick(), 0.32)
            if k % 4 == 1:
                mus.add(t + beat / 2, kick(), 0.2)
            if k % 4 == 2:
                c = clap()
                mus.add(t, c, 0.1)
                wet.add(t, c, 0.1)
            mus.add(t + beat / 2, hat(), 0.05, 0.2)
        k += 1
    notes, _ = chords[0]
    for m in [48, 55] + [x for x in notes]:
        L, R = pad(m, 3.4, 0.055)
        mus.add(final, L, 1, -0.3)
        mus.add(final, R, 1, 0.3)
        wet.add(final, (L + R) * 0.5, 1)
    for i, m in enumerate([72, 76, 79, 84]):
        s = key(m, 2.5, 1.6)
        mus.add(final + i * beat / 4, s, 0.08, [-0.4, 0.4, -0.2, 0.2][i])
        wet.add(final + i * beat / 4, s, 0.1)
    out = mus.b + reverb(wet.b, n) * 0.55
    t = np.arange(n) / SR
    return out * np.clip(t / 0.6, 0, 1) * np.clip((dur - t) / 1.6, 0, 1)


def math_floor(x):
    return float(np.floor(x))


def voice_track(src, tl, n, work):
    v = decode(src)
    xf = int(0.012 * SR)
    pieces, last = [], 0
    for a, b in tl.drops:
        ia, ib = int(a * SR), int(b * SR)
        if ia - xf <= last or ib >= len(v):
            continue
        ramp = np.linspace(0, 1, xf, dtype=np.float32)
        pieces.append(v[last:ia - xf])
        pieces.append(v[ia - xf:ia] * (1 - ramp) + v[ib - xf:ib] * ramp)
        last = ib
    pieces.append(v[last:])
    v = np.concatenate(pieces)
    cut, proc = os.path.join(work, "voice_cut.wav"), os.path.join(work, "voice_proc.wav")
    wavfile.write(cut, SR, v.astype(np.float32))
    run("ffmpeg", "-v", "error", "-y", "-i", cut, "-af",
        "highpass=f=85,afftdn=nr=10:nf=-45,equalizer=f=250:t=q:w=1.2:g=-2,equalizer=f=3800:t=q:w=1.0:g=2.5,"
        "equalizer=f=11000:t=h:w=0.7:g=1.5,acompressor=threshold=-24dB:ratio=3:attack=8:release=90:makeup=5,"
        "deesser=i=0.35,alimiter=limit=0.89:attack=3:release=40", "-c:a", "pcm_f32le", proc)
    _, v = wavfile.read(proc)
    out = np.zeros(n, np.float32)
    out[:min(n, len(v))] = v[:n]
    return out


def voice_env(x):
    w = int(0.03 * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(w) / w, "same"))
    act = np.clip((20 * np.log10(rms + 1e-9) + 45) / 15, 0, 1)[::64]
    out, s = np.zeros_like(act), 0.0
    up, dn = np.exp(-64 / (0.03 * SR)), np.exp(-64 / (0.35 * SR))
    for i, v in enumerate(act):
        c = up if v > s else dn
        s = c * s + (1 - c) * v
        out[i] = s
    return np.interp(np.arange(len(x)), np.arange(len(out)) * 64, out)


def render_audio(d, spec, tl, out_wav):
    work = os.path.join(d, "work")
    dur = tl.duration
    n = int(dur * SR)
    v = voice_track(os.path.join(d, "source.mp4"), tl, n, work)
    au = spec.get("audio") or {}
    mu = au.get("music") or {"mode": "generated"}
    level = mu.get("level", "background")
    music = np.zeros((2, n), np.float32)
    if mu.get("mode") == "file" and mu.get("file") and os.path.exists(os.path.join(d, mu["file"])):
        m = decode(os.path.join(d, mu["file"]), mono=False)
        reps = int(np.ceil(n / max(1, m.shape[1])))
        music = np.tile(m, reps)[:, :n] * 0.5
        t = np.arange(n) / SR
        music *= np.clip(t / 1.0, 0, 1) * np.clip((dur - t) / 2.0, 0, 1)
    elif mu.get("mode", "generated") == "generated":
        hits = [tl.out_time(h) for h in mu.get("hits") or []]
        music = generated_score(n, dur, mu.get("mood", "cinematic"), hits)
    if mu.get("t0") is not None:
        t = np.arange(n) / SR
        a, b = tl.out_time(mu["t0"]), tl.out_time(mu.get("t1", tl.src_end))
        music *= np.clip((t - a) / 0.8, 0, 1) * np.clip((b - t) / 1.2, 0, 1)
    fx, wet = Bus(n), Bus(n)
    for s in au.get("sfx") or []:
        t = tl.out_time(s["t"])
        kind, g = s.get("kind", "whoosh"), float(s.get("gain", 1))
        sig = {"boom": lambda: boom(), "whoosh": lambda: whoosh(), "tick": lambda: tick(), "thump": lambda: thump(),
               "pop": lambda: pop(), "riser": lambda: riser(max(0.4, tl.out_time(s.get("t1", s["t"] + 1.2)) - t))}.get(kind, whoosh)()
        gain = {"boom": 0.55, "whoosh": 0.06, "tick": 0.07, "thump": 0.12, "pop": 0.1, "riser": 0.16}.get(kind, 0.08) * g
        t0 = t - 0.2 if kind == "whoosh" else t
        fx.add(t0, sig, gain)
        wet.add(t0, sig, gain * 0.4)
    fxb = fx.b + reverb(wet.b, n) * 0.35
    duck = 1 - (0.5 if level == "background" else 0.3) * voice_env(v)
    mgain = 0.55 if level == "background" else 1.1
    mix = np.stack([v, v]) * 0.9 + music * duck * mgain + fxb * 0.8
    pre = os.path.join(work, "mix_pre.wav")
    wavfile.write(pre, SR, mix.T.astype(np.float32))
    err = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1:LRA=9:print_format=json",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(err[err.rindex("{"):err.rindex("}") + 1])
    run("ffmpeg", "-v", "error", "-y", "-i", pre, "-af",
        f"loudnorm=I=-14:TP=-1:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:"
        f"measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", "-ar", str(SR), "-c:a", "pcm_s24le", out_wav)
