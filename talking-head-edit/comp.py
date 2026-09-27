"""Composite: camera moves, grade, text-behind-subject, graphics, finishing.

usage: python3 comp.py                 -> work/video.mp4 (no audio)
       python3 comp.py 30,120,560      -> work/preview/*.jpg stills
"""
import math
import os
import subprocess
import sys

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d, median_filter

from config import (CAMERA, CUTS_OUT, DURATION, FPS, H, N_OUT, SHAKES, SHOT_STARTS, SRC, W, WORK,
                    ft, out_to_src_frame, wt)

cv2.setNumThreads(4)
GFX = os.path.join(WORK, "gfx")


# ---------- easing ----------
def clamp(x):
    return max(0.0, min(1.0, x))


EASE = {
    "linear": lambda x: x,
    "inout": lambda x: 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2,
    "out": lambda x: 1 - (1 - x) ** 3,
    "in": lambda x: x ** 3,
}


def pr(t, t0, d):
    return clamp((t - t0) / d)


# ---------- analysis data ----------
MASKS = np.load(os.path.join(WORK, "masks.npy"))
FACES = np.load(os.path.join(WORK, "faces.npy"))
shot_of = np.zeros(len(MASKS), int)
for k, s in enumerate(SHOT_STARTS):
    shot_of[s:] = k
bounds = SHOT_STARTS + [len(MASKS)]
FACE_S = FACES.copy()
for a, b in zip(bounds, bounds[1:]):
    for c in range(4):
        v = FACES[a:b, c]
        v = np.where(np.isnan(v), np.nanmedian(v), v)
        FACE_S[a:b, c] = gaussian_filter1d(median_filter(v, 9, mode="nearest"), 14, mode="nearest")


def mask_for(src):
    """Temporally smoothed low-res matte (within the same shot)."""
    acc, wsum = np.zeros(MASKS.shape[1:], np.float32), 0.0
    for d, w in ((-1, 0.25), (0, 0.5), (1, 0.25)):
        j = src + d
        if 0 <= j < len(MASKS) and shot_of[j] == shot_of[src]:
            acc += MASKS[j].astype(np.float32) * w
            wsum += w
    return acc / (255.0 * wsum)


def refine_mask(m_small, rgb):
    m = cv2.resize(m_small, (W, H), interpolation=cv2.INTER_LINEAR)
    guide = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)
    m = cv2.ximgproc.guidedFilter(guide, m, 8, 1e-3)
    return np.clip((m - 0.25) / 0.5, 0, 1)


# ---------- camera ----------
def camera(t, src):
    seg = CAMERA[-1]
    for c in CAMERA:
        if c[0] <= t < c[1]:
            seg = c
            break
    t0, t1, s0, s1, ease, follow = seg
    s = s0 + (s1 - s0) * EASE[ease](pr(t, t0, t1 - t0))
    cx, cy = W / 2, H / 2
    if follow:
        fx, fy = FACE_S[src, 0], FACE_S[src, 1]
        cx, cy = fx, fy + 150 / s
    cx = min(max(cx, W / 2 / s), W - W / 2 / s)
    cy = min(max(cy, H / 2 / s), H - H / 2 / s)
    dx = dy = 0.0
    for ts in SHAKES:
        u = t - ts
        if 0 <= u < 0.4:
            env = math.exp(-10 * u) * 9
            dx += env * math.sin(2 * math.pi * 11 * u)
            dy += env * math.sin(2 * math.pi * 8 * u + 1.3)
    return s, cx, cy, dx, dy


def warp(img, s, cx, cy, dx, dy, interp):
    M = np.float32([[s, 0, W / 2 - s * cx + dx], [0, s, H / 2 - s * cy + dy]])
    return cv2.warpAffine(img, M, (W, H), flags=interp, borderMode=cv2.BORDER_REFLECT)


# ---------- grade ----------
def _curve(pts):
    xs, ys = zip(*pts)
    return np.interp(np.arange(256) / 255.0, xs, ys)


def build_lut():
    base = _curve([(0, 0.035), (0.12, 0.10), (0.35, 0.33), (0.65, 0.68), (0.88, 0.90), (1, 0.97)])
    lum = np.arange(256) / 255.0
    shadow = np.clip(1 - lum / 0.45, 0, 1) ** 1.5
    high = np.clip((lum - 0.5) / 0.5, 0, 1) ** 1.2
    r = base - 0.012 * shadow + 0.022 * high
    g = base + 0.004 * shadow + 0.008 * high
    b = base + 0.030 * shadow - 0.020 * high
    lut = np.stack([r, g, b], -1)
    return (np.clip(lut, 0, 1) * 255).astype(np.uint8).reshape(256, 1, 3)


LUT = build_lut()


def grade(rgb, sat):
    img = cv2.LUT(rgb, LUT).astype(np.float32) / 255.0
    lum = img @ np.float32([0.2126, 0.7152, 0.0722])
    return lum[..., None] + (img - lum[..., None]) * sat


# ---------- finishing ----------
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
_r = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2) / math.sqrt(2)
VIGNETTE = (1 - 0.32 * np.clip((_r - 0.35) / 0.65, 0, 1) ** 1.6)[..., None]
del yy, xx, _r
rng = np.random.default_rng(7)
GRAIN = [cv2.GaussianBlur(rng.normal(0, 1, (H, W)).astype(np.float32), (0, 0), 0.7) for _ in range(10)]


def finish(img, i):
    small = cv2.resize(img, (W // 4, H // 4), interpolation=cv2.INTER_AREA)
    bright = np.clip(small - 0.72, 0, None)
    bloom = cv2.GaussianBlur(bright, (0, 0), 12)
    img = img + cv2.resize(bloom, (W, H), interpolation=cv2.INTER_LINEAR) * 0.5
    img = img * VIGNETTE
    g = GRAIN[i % len(GRAIN)]
    g = np.roll(g, (i * 37) % H, 0)
    lum = img.mean(-1, keepdims=True)
    img = img + g[..., None] * (0.022 * (1.1 - lum))
    return img


def load_rgba(layer, i):
    p = os.path.join(GFX, layer, f"{i:05d}.png")
    if not os.path.exists(p):
        return None
    im = cv2.imread(p, cv2.IMREAD_UNCHANGED)
    rgba = cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255.0
    return rgba[..., :3], rgba[..., 3:4]


def over(dst, layer):
    if layer is None:
        return dst
    rgb, a = layer
    return dst * (1 - a) + rgb * a


T_DESAT = wt("and", 3)
T_END = wt("life", 1, "e") + 0.05


def render_frame(i, src_rgb):
    t = ft(i)
    src = out_to_src_frame(i)
    s, cx, cy, dx, dy = camera(t, src)
    plate_src = src_rgb
    m = refine_mask(mask_for(src), plate_src)

    sat = 1.06
    if T_DESAT <= t < CUTS_OUT[1]:
        sat = 1.06 - 0.7 * EASE["inout"](pr(t, T_DESAT, 0.6))
    plate = grade(plate_src, sat)
    plate = warp(plate, s, cx, cy, dx, dy, cv2.INTER_CUBIC)
    m = warp(m, s, cx, cy, dx, dy, cv2.INTER_LINEAR)[..., None]

    expo = 1.0
    if t < 0.6:
        expo = clamp(t / 0.12) * (1 + 0.55 * math.exp(-max(0.0, t - 0.1) / 0.12))
    if T_DESAT <= t < CUTS_OUT[1]:
        expo *= 1 - 0.12 * EASE["inout"](pr(t, T_DESAT, 0.8))
    plate = plate * expo

    comp = over(plate, load_rgba("behind", i))
    comp = comp * (1 - m) + plate * m

    e = EASE["inout"](pr(t, T_END, 0.9))
    if e > 0:
        blurred = cv2.GaussianBlur(comp, (0, 0), 1 + 14 * e)
        comp = blurred * (1 - 0.9 * e)

    comp = over(comp, load_rgba("front", i))
    comp = finish(comp, i)
    fade = clamp((DURATION - t) / 0.5)
    comp = comp * fade
    return (np.clip(comp, 0, 1) * 255 + 0.5).astype(np.uint8)


def read_src_sequential():
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            return
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)


def read_src_at(idx):
    for back in range(8):  # the very last frames can't be seek targets
        t = (idx - back + 0.1) / FPS
        buf = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", SRC, "-frames:v", "1",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        if buf:
            return np.frombuffer(buf, np.uint8).reshape(H, W, 3)
    raise RuntimeError(idx)


def main():
    if len(sys.argv) > 1:
        os.makedirs(os.path.join(WORK, "preview"), exist_ok=True)
        for i in map(int, sys.argv[1].split(",")):
            img = render_frame(i, read_src_at(out_to_src_frame(i)))
            cv2.imwrite(os.path.join(WORK, "preview", f"{i:05d}.jpg"), cv2.cvtColor(img, cv2.COLOR_RGB2BGR),
                        [cv2.IMWRITE_JPEG_QUALITY, 90])
            print("preview", i)
        return

    enc = subprocess.Popen([
        "ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
        "-framerate", "30000/1001", "-i", "-",
        "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-tune", "film", "-x264-params", "aq-mode=3", "-pix_fmt", "yuv420p",
        "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709",
        os.path.join(WORK, "video.mp4"),
    ], stdin=subprocess.PIPE)
    reader = read_src_sequential()
    last = None
    for i in range(N_OUT):
        want = out_to_src_frame(i)
        while last is None or last[0] < want:
            j = 0 if last is None else last[0] + 1
            last = (j, next(reader))
        enc.stdin.write(render_frame(i, last[1]).tobytes())
        if i % 60 == 0:
            print(f"frame {i}/{N_OUT}", flush=True)
    enc.stdin.close()
    enc.wait()


if __name__ == "__main__":
    main()
