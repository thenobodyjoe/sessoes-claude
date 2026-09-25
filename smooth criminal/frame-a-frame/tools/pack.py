"""Turn data/raw.npz (from extract.py) into the motion score the painting plays: src/15-data.js.

  * cuts: where the histogram jumps, at least 5 frames apart;
  * tracks: people linked frame to frame inside each shot (Hungarian on body position and size),
    short or faint tracks dropped, small gaps filled, every joint smoothed over time;
  * the lead: per shot, the track with the brightest torso (the one in the light), weighted by size;
  * camera: the per-shot running sum of the frame-to-frame shift, smoothed;
  * room: the 48x27 colour field, downsampled to 32x18 every 2nd frame;
  * light: a warm pool (brightest warm patch) and a cool pool (brightest blue patch) per frame.

    python tools/pack.py            # data/raw.npz -> src/00-data.js
"""
import base64
import json
import pathlib

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.optimize import linear_sum_assignment

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = np.load(ROOT / 'data' / 'raw.npz')
fps = float(R['fps']); W = int(R['W']); H = int(R['H'])
lms, npers, torso = R['lms'], R['npers'], R['torso']
field, shift, cutscore = R['field'], R['shift'], R['cutscore']
N = len(npers)
ASP = W / H

# ---------------------------------------------------------------- cuts
# a hard jump, or a smaller one that stands far above its neighbourhood (the clip mostly dissolves and whip-pans)
from scipy.ndimage import median_filter
med = median_filter(cutscore, 25)
cuts = [0]
for i in range(1, N):
    c = cutscore[i]
    peak = c >= cutscore[max(0, i - 2):i + 3].max()
    if peak and (c > 0.3 or (c > 0.1 and c > 6 * med[i] + 0.02)) and i - cuts[-1] >= 5:
        cuts.append(i)
shots = [(a, b) for a, b in zip(cuts, cuts[1:] + [N])]
shot_of = np.zeros(N, np.int32)
for k, (a, b) in enumerate(shots):
    shot_of[a:b] = k
print(f'{N} frames, {len(shots)} shots')

# ---------------------------------------------------------------- tracks
def desc(P):
    """position + size of a detection: shoulder/hip centre, body scale (in frame heights)"""
    xy = P[:, :2] * [ASP, 1]
    c = xy[[11, 12, 23, 24]].mean(0)
    s = max(np.linalg.norm(xy[11] - xy[12]), np.linalg.norm(xy[[11, 12]].mean(0) - xy[[23, 24]].mean(0)) * 0.6, 1e-3)
    return c, s

tracks = []          # {shot, frames: {i: P}, torso: [..]}
for k, (a, b) in enumerate(shots):
    live = []        # indices into tracks, with last frame seen
    for i in range(a, b):
        dets = [lms[i, j] for j in range(npers[i])]
        # discard detections that are barely a body
        dets = [(P, torso[i, j]) for j, P in enumerate(dets) if P[[11, 12, 23, 24], 2].mean() > 0.25 or P[[0, 11, 12], 2].mean() > 0.6]
        cand = [t for t in live if i - tracks[t]['last'] <= 4]
        used = set()
        if cand and dets:
            C = np.zeros((len(cand), len(dets)))
            for r, t in enumerate(cand):
                c0, s0 = tracks[t]['desc']
                for q, (P, _) in enumerate(dets):
                    c1, s1 = desc(P)
                    C[r, q] = np.linalg.norm(c1 - c0) / max(s0, s1) + abs(np.log(s1 / s0)) * 0.8
            rr, qq = linear_sum_assignment(C)
            for r, q in zip(rr, qq):
                if C[r, q] < 1.2:
                    t = cand[r]
                    P, tb = dets[q]
                    tracks[t]['frames'][i] = P.copy(); tracks[t]['torso'].append(tb)
                    tracks[t]['last'] = i; tracks[t]['desc'] = desc(P)
                    used.add(q)
        for q, (P, tb) in enumerate(dets):
            if q in used:
                continue
            tracks.append({'shot': k, 'frames': {i: P.copy()}, 'torso': [tb], 'last': i, 'desc': desc(P)})
            live.append(len(tracks) - 1)

# stitch broken tracks: one ends, another starts close by within 10 frames in the same shot
def first_desc(t): return desc(t['frames'][min(t['frames'])])
merged = True
while merged:
    merged = False
    order = sorted((j for j in range(len(tracks)) if tracks[j] is not None), key=lambda j: min(tracks[j]['frames']))
    for ia in order:
        A = tracks[ia]
        if A is None:
            continue
        best = None
        for ib in order:
            B = tracks[ib]
            if B is None or B is A or B['shot'] != A['shot']:
                continue
            gap = min(B['frames']) - A['last']
            if not 1 <= gap <= 10:
                continue
            (c0, s0), (c1, s1) = A['desc'], first_desc(B)
            d = np.linalg.norm(c1 - c0) / max(s0, s1) + abs(np.log(s1 / s0)) * 0.8
            if d < 1.0 + 0.08 * gap and (best is None or d < best[0]):
                best = (d, ib)
        if best:
            B = tracks[best[1]]
            A['frames'].update(B['frames']); A['torso'] += B['torso']; A['last'] = B['last']; A['desc'] = B['desc']
            tracks[best[1]] = None
            merged = True
            break
tracks = [t for t in tracks if t is not None]

# keep tracks that last, fill gaps, smooth
kept = []
for t in tracks:
    fr = sorted(t['frames'])
    a, b = fr[0], fr[-1]
    if len(fr) < 8:
        continue
    A = np.stack([t['frames'][i] for i in fr])
    if A[:, [11, 12], 2].mean() < 0.35:
        continue
    span = np.arange(a, b + 1)
    full = np.zeros((len(span), 33, 3), np.float32)
    have = np.isin(span, fr)
    for c in range(3):
        for m in range(33):
            full[:, m, c] = np.interp(span, fr, A[:, m, c])
    # gaps longer than 4 frames stay empty
    gap = np.zeros(len(span), bool)
    run = 0
    for j in range(len(span)):
        run = 0 if have[j] else run + 1
        gap[j] = run > 10
    # smoothing: gentle for the extremities, firmer for the trunk
    sig = np.full(33, 1.1); sig[[11, 12, 23, 24]] = 1.8; sig[[0, 1, 2, 3, 4, 5, 6, 7, 8]] = 1.6
    for m in range(33):
        for c in range(2):
            full[:, m, c] = gaussian_filter1d(full[:, m, c], sig[m], mode='nearest')
        full[:, m, 2] = gaussian_filter1d(full[:, m, 2], 2.0, mode='nearest')
    c0, s0 = desc(full[len(full) // 2])
    kept.append({'shot': t['shot'], 'a': a, 'b': b, 'P': full, 'gap': gap,
                 'bright': float(np.median(t['torso'])), 'size': float(s0), 'len': len(fr)})
print(f'{len(tracks)} raw tracks -> {len(kept)} kept')

# the lead: a bright torso (the one in the light) that outshines every track alive at the same time
lead_ids = set()
for j, t in enumerate(kept):
    if t['bright'] < 0.33:
        continue
    rivals = [u['bright'] for u in kept if u is not t and u['a'] <= t['b'] and u['b'] >= t['a']]
    if all(t['bright'] >= r * 1.2 for r in rivals):
        lead_ids.add(j)
lead_of_shot = {k: j for j in lead_ids for k in [kept[j]['shot']]}

# ---------------------------------------------------------------- camera
cam = np.zeros((N, 2), np.float32)
for a, b in shots:
    s = shift[a:b].copy(); s[0] = 0
    s = np.clip(s, -0.08, 0.08)
    c = np.cumsum(s, 0)
    if b - a > 3:
        c = gaussian_filter1d(c, 1.5, axis=0, mode='nearest')
    cam[a:b] = c - c[0]

# ---------------------------------------------------------------- room + light
FW, FH = 32, 18
fstep = 2
fld = np.zeros((N, FH, FW, 3), np.float32)
for i in range(N):
    fld[i] = cv2.resize(field[i], (FW, FH), interpolation=cv2.INTER_AREA)
for a, b in shots:   # smooth the room in time inside each shot
    if b - a > 2:
        fld[a:b] = gaussian_filter1d(fld[a:b], 1.5, axis=0, mode='nearest')
fsel = list(range(0, N, fstep))
fbytes = np.clip(fld[fsel], 0, 255).astype(np.uint8).tobytes()

pools = np.zeros((N, 2, 4), np.float32)    # [x, y (0..1, y down), radius (frame heights), strength]
for i in range(N):
    f = field[i].astype(np.float32) / 255
    lum = f @ [0.3, 0.55, 0.15]
    warm = np.clip(f[..., 0] - f[..., 2], 0, 1)
    cool = np.clip(f[..., 2] - f[..., 0] * 0.7, 0, 1)
    for p, wmap in enumerate((lum * (0.5 + warm), lum * cool * 2)):
        g = cv2.GaussianBlur(wmap, (0, 0), 3)
        y, x = np.unravel_index(np.argmax(g), g.shape)
        v = g[y, x]
        area = (g > v * 0.6).sum() / g.size
        pools[i, p] = (x / (field.shape[2] - 1), y / (field.shape[1] - 1), np.sqrt(area) * 0.9 + 0.12, v)
for a, b in shots:
    if b - a > 2:
        pools[a:b] = gaussian_filter1d(pools[a:b], 3, axis=0, mode='nearest')

# ---------------------------------------------------------------- binary pose stream
# per frame: uint8 count; per person: uint16 track id, uint8 flags (1 = lead), 33 x (int16 x, int16 y, uint8 vis)
# x, y in 1/4096 of the frame width / height (off-frame joints kept)
out = bytearray()
per_frame = [[] for _ in range(N)]
for j, t in enumerate(kept):
    lead = j in lead_ids
    for r, i in enumerate(range(t['a'], t['b'] + 1)):
        if not t['gap'][r]:
            per_frame[i].append((j, lead, t['P'][r]))
offsets = []
for i in range(N):
    offsets.append(len(out))
    ps = per_frame[i][:8]
    out += bytes([len(ps)])
    for j, lead, P in ps:
        out += int(j).to_bytes(2, 'little') + bytes([1 if lead else 0])
        xy = np.clip(np.round(P[:, :2] * 4096), -32000, 32000).astype('<i2')
        vis = np.clip(np.round(P[:, 2] * 255), 0, 255).astype(np.uint8)
        for m in range(33):
            out += xy[m].tobytes() + bytes([vis[m]])

# ---------------------------------------------------------------- tempo
# The clip is silent, so the tempo of the new score is read off the dancing: the rate and phase at which
# hands, feet and knees start and stop together.
e = np.zeros(N)
for i in range(1, N):
    k = min(npers[i], npers[i - 1])
    if k:
        v = lms[i, :k, :, :2] - lms[i - 1, :k, :, :2]
        e[i] = np.median(np.linalg.norm(v, axis=-1)[:, [15, 16, 25, 26, 27, 28]])
onset = np.abs(np.diff(e, prepend=0))
onset -= np.convolve(onset, np.ones(24) / 24, 'same')
best = (0, 112, 0)
for bpm in np.arange(100, 132, 0.25):
    per = 60 / bpm * fps
    z = (onset[300:] * np.exp(2j * np.pi * np.arange(300, N) / per)).sum()
    if abs(z) > best[0]:
        best = (abs(z), bpm, np.angle(z))
bpm = float(best[1])
beat0 = float(((-best[2]) % (2 * np.pi)) / (2 * np.pi) * 60 / bpm)
print(f'tempo {bpm} BPM, first beat at {beat0:.3f}s')

meta = {
    'fps': fps, 'n': N, 'w': W, 'h': H, 'bpm': bpm, 'beat0': round(beat0, 4),
    'shots': [[a, b] for a, b in shots],
    'lead': {str(k): j for k, j in lead_of_shot.items()},
    'fw': FW, 'fh': FH, 'fstep': fstep,
    'cam': np.round(cam, 4).flatten().tolist(),
    'pools': np.round(pools, 3).flatten().tolist(),
}
b64 = lambda b: base64.b64encode(bytes(b)).decode()
js = ('"use strict";\n// Generated by tools/pack.py from the reference clip: motion only (poses, cuts, camera drift, a 32x18 light map).\n'
      f'const DATA = {json.dumps(meta, separators=(",", ":"))};\n'
      f'DATA.poseB64 = "{b64(out)}";\n'
      f'DATA.poseOff = {json.dumps(offsets, separators=(",", ":"))};\n'
      f'DATA.fieldB64 = "{b64(fbytes)}";\n')
(ROOT / 'src' / '00-data.js').write_text(js)
print(f'poses {len(out) / 1e6:.2f} MB, field {len(fbytes) / 1e6:.2f} MB -> 00-data.js {len(js) / 1e6:.2f} MB')
lens = [b - a for a, b in shots]
print('shot lengths (frames):', lens)
print('lead tracks:', sorted((kept[j]['a'], kept[j]['b']) for j in lead_ids))
