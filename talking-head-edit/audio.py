"""Voice cleanup + retime, an original synthesized score locked to the cuts, SFX, mix.

Writes work/mix.wav (48 kHz stereo, -14 LUFS integrated, -1 dBTP).
"""
import json
import os
import subprocess

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

from config import CUTS_OUT, DROP, DURATION, FPS, SRC, WORK, wt

SR = 48000
N = int(DURATION * SR)
rng = np.random.default_rng(3)


def run(*a):
    subprocess.run(list(a), check=True)


# ---------------- voice ----------------
def voice():
    raw = os.path.join(WORK, "voice_raw.wav")
    run("ffmpeg", "-v", "error", "-y", "-i", SRC, "-vn", "-ac", "1", "-ar", str(SR), "-c:a", "pcm_f32le", raw)
    from scipy.io import wavfile
    _, v = wavfile.read(raw)
    a, b = int(DROP.start / FPS * SR), int(DROP.stop / FPS * SR)
    xf = int(0.012 * SR)
    ramp = np.linspace(0, 1, xf, dtype=np.float32)
    joined = v[a - xf:a] * (1 - ramp) + v[b - xf:b] * ramp
    v = np.concatenate([v[:a - xf], joined, v[b:]])
    cut = os.path.join(WORK, "voice_cut.wav")
    wavfile.write(cut, SR, v.astype(np.float32))
    proc = os.path.join(WORK, "voice_proc.wav")
    chain = ",".join([
        "highpass=f=85",
        "afftdn=nr=10:nf=-45",
        "equalizer=f=250:t=q:w=1.2:g=-2",
        "equalizer=f=3800:t=q:w=1.0:g=2.5",
        "equalizer=f=11000:t=h:w=0.7:g=1.5",
        "acompressor=threshold=-24dB:ratio=3:attack=8:release=90:makeup=5",
        "deesser=i=0.35",
        "alimiter=limit=0.89:attack=3:release=40",
    ])
    run("ffmpeg", "-v", "error", "-y", "-i", cut, "-af", chain, "-c:a", "pcm_f32le", proc)
    _, v = wavfile.read(proc)
    out = np.zeros(N, np.float32)
    out[:min(N, len(v))] = v[:N]
    return out


# ---------------- synthesis helpers ----------------
def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def lp(x, fc, order=2):
    return sosfilt(butter(order, fc, "low", fs=SR, output="sos"), x)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)


def add(buf, t0, sig, gain=1.0, pan=0.0):
    i = int(t0 * SR)
    if i >= N or i + len(sig) <= 0:
        return
    s = sig[max(0, -i):N - i] * gain
    i = max(0, i)
    buf[0, i:i + len(s)] += s * np.sqrt(0.5 * (1 - pan))
    buf[1, i:i + len(s)] += s * np.sqrt(0.5 * (1 + pan))


def env_adsr(n, a, r):
    e = np.ones(n, np.float32)
    na, nr = int(a * SR), int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e


def saw(f, n, phase=0.0):
    t = np.arange(n) / SR
    return (2 * ((f * t + phase) % 1.0) - 1).astype(np.float32)


def reverb_ir(sec=2.4, decay=2.2):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = rng.normal(0, 1, (2, n)) * np.exp(-t * (6.9 / decay))
    ir = np.stack([lp(ir[0], 5000), lp(ir[1], 5200)])
    ir[:, :int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    return (ir / np.abs(ir).sum(1, keepdims=True) * 40).astype(np.float32)


IR = reverb_ir()


def reverb(buf):
    return np.stack([fftconvolve(buf[c], IR[c])[:N] for c in range(2)]).astype(np.float32)


# ---------------- score ----------------
BEAT = (wt("life") - CUTS_OUT[1]) / 24          # 24 beats between the two big hits
B0 = CUTS_OUT[1] - 29 * BEAT                     # beat 0; downbeats every 4 from beat 1


def bt(k):
    return B0 + k * BEAT


CHORDS = [  # pad voicing, bass root
    ([57, 60, 64, 67, 71], 33),   # Am9
    ([53, 57, 60, 64, 67], 29),   # Fmaj9
    ([55, 60, 62, 64, 67], 36),   # Cadd9
    ([55, 59, 62, 64, 69], 31),   # G6/9
]
FINAL = ([48, 55, 60, 62, 64, 67, 72], 24)  # C add9, the "quality of life" resolve


def pad_note(m, dur, gain):
    n = int(dur * SR)
    f = mtof(m)
    sig = np.zeros((2, n), np.float32)
    for k, (cents, pan) in enumerate([(-8, -0.7), (0, 0), (7, 0.7)]):
        s = saw(f * 2 ** (cents / 1200), n, phase=rng.random())
        sig[0] += s * np.sqrt(0.5 * (1 - pan))
        sig[1] += s * np.sqrt(0.5 * (1 + pan))
    sig = np.stack([lp(sig[0], 1400, 4), lp(sig[1], 1400, 4)])
    return sig * env_adsr(n, 0.9, 1.2) * gain


def fm_key(m, dur=1.2, bright=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    idx = bright * np.exp(-t / 0.12)
    body = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    tine = 0.18 * np.sin(2 * np.pi * f * 14 * t) * np.exp(-t / 0.03)
    e = np.exp(-t / 0.45) * np.minimum(1, t / 0.003)
    return ((body + tine) * e).astype(np.float32)


def kick():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    f = 45 + 75 * np.exp(-t / 0.04)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = rng.normal(0, 1, n) * np.exp(-t / 0.004) * 0.3
    return ((np.sin(ph) * np.exp(-t / 0.28) + click) * 0.9).astype(np.float32)


def hat():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return (hp(rng.normal(0, 1, n), 7000, 4) * np.exp(-t / 0.018)).astype(np.float32)


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    e = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.011, 0.022))
    e = e + 0.5 * np.exp(-np.maximum(0, t - 0.03) / 0.09) * (t >= 0.03)
    return (bp(rng.normal(0, 1, n), 900, 3500) * e * 0.5).astype(np.float32)


def boom(dur=2.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 32 + 38 * np.exp(-t / 0.18)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.9)
    body = lp(rng.normal(0, 1, n), 900) * np.exp(-t / 0.25) * 0.6
    return np.tanh((sub + body) * 1.4).astype(np.float32)


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    noise = rng.normal(0, 1, n)
    out = np.zeros(n)
    hop = 1024
    for i in range(0, n, hop):
        c = 300 * (20 ** u[i])
        seg = noise[max(0, i - 2048):i + hop]
        out[i:i + hop] = bp(seg, c * 0.7, min(c * 1.4, 20000), 2)[-min(hop, n - i):]
    tone = np.sin(2 * np.pi * np.cumsum(180 * 4 ** u) / SR) * 0.25
    return ((out + tone) * u ** 2.2).astype(np.float32)


def whoosh(dur=0.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    u = t / dur
    e = np.sin(np.pi * u) ** 2 * (1 - u) ** 0.3
    noise = rng.normal(0, 1, n)
    lo = bp(noise, 400, 1600)
    hi = bp(noise, 1800, 7000)
    mix = lo * (1 - u) + hi * u
    return (mix * e).astype(np.float32)


def tick(f=2100):
    n = int(0.06 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t / 0.012) + rng.normal(0, 1, n) * np.exp(-t / 0.002) * 0.25).astype(np.float32)


def thump():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * np.cumsum(90 * np.exp(-t / 0.05) + 50) / SR) * np.exp(-t / 0.08)).astype(np.float32)


def score():
    mus = np.zeros((2, N), np.float32)
    wet = np.zeros((2, N), np.float32)
    end_bar = 53
    # pads, one chord per bar from beat 1 to the "life" hit
    for bar, k in enumerate(range(1, end_bar, 4)):
        notes, _ = CHORDS[bar % 4]
        g = 0.05 if k < 29 else 0.065
        if k < 5:
            g *= 0.7
        for m in notes:
            sig = pad_note(m, BEAT * 4 + 1.4, g)
            add(mus, bt(k) - 0.15, sig[0], 1.0, -0.3)
            add(mus, bt(k) - 0.15, sig[1], 1.0, 0.3)
            add(wet, bt(k) - 0.15, (sig[0] + sig[1]) * 0.5, 0.8)
    # FM key arpeggio (8ths), from bar 2; busier in section B
    for k in range(5, end_bar):
        notes, _ = CHORDS[((k - 1) // 4) % 4]
        for h in range(2):
            step = (k - 5) * 2 + h
            if k < 29 and h == 1 and step % 4 == 3:
                continue
            m = [notes[0] + 12, notes[2] + 12, notes[1] + 12, notes[3] + 12][step % 4]
            vel = 0.075 if k < 29 else 0.09
            if h:
                vel *= 0.7
            if 45 <= k < 49:  # lift into the last line
                vel *= 1 + (k - 45) * 0.12
            pan = 0.35 if step % 2 else -0.35
            s = fm_key(m)
            add(mus, bt(k + h * 0.5), s, vel, pan)
            add(wet, bt(k + h * 0.5), s, vel * 0.9, 0)
    # section B rhythm: kick, clap, hats, sub bass
    for k in range(29, end_bar):
        in_break = 49 <= k < 53
        _, root = CHORDS[((k - 1) // 4) % 4]
        if not in_break:
            if (k - 29) % 4 == 0:
                add(mus, bt(k), kick(), 0.32)
            if (k - 29) % 4 == 1:
                add(mus, bt(k + 0.5), kick(), 0.2)
            if (k - 29) % 4 == 2:
                c = clap()
                add(mus, bt(k), c, 0.10)
                add(wet, bt(k), c, 0.10)
            add(mus, bt(k + 0.5), hat(), 0.05, 0.2)
        if (k - 1) % 4 == 0:
            n = int(BEAT * 4 * SR)
            t = np.arange(n) / SR
            f = mtof(root + 12)
            b = np.tanh(1.6 * np.sin(2 * np.pi * f * t)) * env_adsr(n, 0.02, 0.3)
            add(mus, bt(k), lp(b, 300).astype(np.float32), 0.10 if not in_break else 0.06)
    # final chord at "life"
    notes, root = FINAL
    for m in notes:
        sig = pad_note(m, 3.4, 0.055)
        add(mus, bt(53), sig[0], 1, -0.3)
        add(mus, bt(53), sig[1], 1, 0.3)
        add(wet, bt(53), (sig[0] + sig[1]) * 0.5, 1.0)
    for i, m in enumerate([72, 76, 79, 84]):
        s = fm_key(m, 2.5, 1.6)
        add(mus, bt(53) + i * BEAT / 4, s, 0.08, [-0.4, 0.4, -0.2, 0.2][i])
        add(wet, bt(53) + i * BEAT / 4, s, 0.1)
    mus += reverb(wet) * 0.55
    # gentle fade in and a sidechain-ish dip on kicks is implicit; fade out at the end
    t = np.arange(N) / SR
    mus *= np.clip(t / 0.6, 0, 1) * np.clip((DURATION - t) / 1.6, 0, 1)
    return mus


def sfx():
    fx = np.zeros((2, N), np.float32)
    wet = np.zeros((2, N), np.float32)
    b = boom()
    add(fx, 0.03, b, 0.55); add(wet, 0.03, b, 0.3)
    add(fx, CUTS_OUT[1], boom(1.6), 0.35)
    b = boom(3.0)
    add(fx, wt("life"), b, 0.6); add(wet, wt("life"), b, 0.4)
    r = riser(CUTS_OUT[1] - wt("and", 3))
    add(fx, wt("and", 3), r, 0.16)
    whooshes = [
        (0.05, 0.09, 0), (wt("masterclass", 2) - 0.1, 0.05, -0.5), (wt("my") - 0.08, 0.05, -0.5),
        (wt("curious") - 0.12, 0.06, 0.5), (wt("growing") - 0.1, 0.05, -0.5), (wt("or", 2) - 0.1, 0.05, 0.5),
        (wt("you", 2) - 0.1, 0.07, -0.3), (wt("help") - 0.1, 0.07, 0), (wt("have", 2) - 0.02, 0.05, -0.4),
        (CUTS_OUT[4] + 0.15, 0.06, 0), (wt("life", 1, "e") + 0.1, 0.07, 0),
    ]
    for t0, g, pan in whooshes:
        w = whoosh()
        add(fx, t0 - 0.2, w, g, pan)
        add(wet, t0 - 0.2, w, g * 0.5)
    ticks = [wt("practice", 2) + 0.08, wt("one") + 0.05, wt("i"), wt("and", 4), wt("intrigued", 1, "e"),
             wt("results"), wt("performance"), wt("business"), wt("health"), wt("relationship"), wt("parenting"),
             wt("of")]
    for i, t0 in enumerate(ticks):
        add(fx, t0, tick(1900 + 150 * (i % 3)), 0.07, (-0.3 if i % 2 else 0.3))
    for t0 in (wt("excited", 1), 10.21, wt("either")):
        add(fx, t0 - 0.01, thump(), 0.12)
    fx += reverb(wet) * 0.35
    return fx


def envelope(x, win=0.03):
    n = int(win * SR)
    rms = np.sqrt(np.convolve(x ** 2, np.ones(n) / n, "same"))
    act = np.clip((20 * np.log10(rms + 1e-9) + 45) / 15, 0, 1)
    out = np.zeros_like(act)
    a_up, a_dn = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
    s = 0.0
    for i, v in enumerate(act):  # attack/release smoothing
        c = a_up if v > s else a_dn
        s = c * s + (1 - c) * v
        out[i] = s
    return out


def main():
    from scipy.io import wavfile
    v = voice()
    mus = score()
    fx = sfx()
    duck = 1 - 0.5 * envelope(v)
    mix = np.stack([v, v]) * 0.9 + mus * duck * 0.55 + fx * 0.8
    pre = os.path.join(WORK, "mix_pre.wav")
    wavfile.write(pre, SR, mix.T.astype(np.float32))
    wavfile.write(os.path.join(WORK, "music_only.wav"), SR, (mus * 0.55).T.astype(np.float32))
    meas = subprocess.run(["ffmpeg", "-hide_banner", "-i", pre, "-af", "loudnorm=I=-14:TP=-1:LRA=9:print_format=json",
                           "-f", "null", "-"], capture_output=True, text=True).stderr
    m = json.loads(meas[meas.rindex("{"):meas.rindex("}") + 1])
    ln = (f"loudnorm=I=-14:TP=-1:LRA=9:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
          f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    run("ffmpeg", "-v", "error", "-y", "-i", pre, "-af", ln, "-ar", str(SR), "-c:a", "pcm_s24le",
        os.path.join(WORK, "mix.wav"))
    print("mixed", m["input_i"], "->", "-14 LUFS")


if __name__ == "__main__":
    main()
