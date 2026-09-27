"""Spec-driven compositing: camera, grade, text-behind-subject, graphics layers, finishing."""
import math
import os
import subprocess

import cv2
import numpy as np
from scipy.ndimage import gaussian_filter1d, median_filter

cv2.setNumThreads(4)
EASE = {"linear": lambda x: x, "inout": lambda x: 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2,
        "out": lambda x: 1 - (1 - x) ** 3, "in": lambda x: x ** 3}


def clamp(x):
    return max(0.0, min(1.0, x))


def pr(t, t0, d):
    return clamp((t - t0) / max(d, 1e-6))


def curve(pts):
    xs, ys = zip(*pts)
    return np.interp(np.arange(256) / 255.0, xs, ys)


def build_lut(kind):
    lum = np.arange(256) / 255.0
    sh = np.clip(1 - lum / 0.45, 0, 1) ** 1.5
    hi = np.clip((lum - 0.5) / 0.5, 0, 1) ** 1.2
    if kind == "clean":
        b = curve([(0, 0.01), (0.25, 0.23), (0.75, 0.78), (1, 0.99)])
        r, g, bl = b, b, b
    elif kind == "warm":
        b = curve([(0, 0.03), (0.3, 0.29), (0.7, 0.72), (1, 0.98)])
        r, g, bl = b + 0.03 * hi + 0.01, b + 0.01 * hi, b - 0.03 * hi - 0.005
    else:  # cinematic and mono share the filmic curve
        b = curve([(0, 0.035), (0.12, 0.10), (0.35, 0.33), (0.65, 0.68), (0.88, 0.90), (1, 0.97)])
        r, g, bl = b - 0.012 * sh + 0.022 * hi, b + 0.004 * sh + 0.008 * hi, b + 0.030 * sh - 0.020 * hi
    lut = np.stack([r, g, bl], -1)
    return (np.clip(lut, 0, 1) * 255).astype(np.uint8).reshape(256, 1, 3)


class Compositor:
    def __init__(self, d, spec, tl, info):
        self.d, self.spec, self.tl = d, spec, tl
        work = os.path.join(d, "work")
        self.gfx = os.path.join(work, "gfx")
        fmt = spec.get("format") or {}
        self.W, self.H = int(fmt.get("w", 1920)), int(fmt.get("h", 1080))
        self.sw, self.sh = info["width"], info["height"]
        self.k = max(self.W / self.sw, self.H / self.sh)  # cover scale source -> output
        self.masks = np.load(os.path.join(work, "masks.npy"))
        faces = np.load(os.path.join(work, "faces.npy"))
        shots = list(info.get("shot_starts") or [0])
        self.shot_of = np.zeros(len(self.masks), int)
        for i, s in enumerate(shots):
            self.shot_of[s:] = i
        self.face = faces.copy()
        for a, b in zip(shots, shots[1:] + [len(faces)]):
            for c in range(4):
                v = faces[a:b, c]
                if np.isnan(v).all():
                    v = np.full_like(v, [self.sw / 2, self.sh * 0.35, self.sw * 0.15, self.sw * 0.15][c])
                v = np.where(np.isnan(v), np.nanmedian(v), v)
                self.face[a:b, c] = gaussian_filter1d(median_filter(v, 9, mode="nearest"), 14, mode="nearest")
        st = spec.get("style") or {}
        self.lut = build_lut(st.get("grade", "cinematic"))
        self.mono = st.get("grade") == "mono"
        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        r = np.sqrt(((xx - self.W / 2) / (self.W / 2)) ** 2 + ((yy - self.H / 2) / (self.H / 2)) ** 2) / math.sqrt(2)
        self.vig = (1 - float(st.get("vignette", 0.32)) * np.clip((r - 0.35) / 0.65, 0, 1) ** 1.6)[..., None]
        rng = np.random.default_rng(7)
        self.grain = [cv2.GaussianBlur(rng.normal(0, 1, (self.H, self.W)).astype(np.float32), (0, 0), 0.7) for _ in range(8)]
        self.grain_amt = float(st.get("grain", 0.022))
        self.fx = spec.get("fx") or []

    def camera(self, t, src):
        segs = self.spec.get("camera") or [{"t0": 0, "t1": 1e9, "s0": 1, "s1": 1.04}]
        seg = next((c for c in segs if c["t0"] <= t < c["t1"]), segs[-1] if t >= segs[-1]["t0"] else segs[0])
        s = seg.get("s0", 1) + (seg.get("s1", seg.get("s0", 1)) - seg.get("s0", 1)) * EASE.get(seg.get("ease", "linear"), EASE["linear"])(pr(t, seg["t0"], seg["t1"] - seg["t0"]))
        s = max(1.0, float(s))
        K = s * self.k
        cx, cy = self.sw / 2, self.sh / 2
        if seg.get("follow"):
            cx, cy = self.face[src, 0], self.face[src, 1] + (self.H * 0.14) / K
        cx = min(max(cx, self.W / 2 / K), self.sw - self.W / 2 / K)
        cy = min(max(cy, self.H / 2 / K), self.sh - self.H / 2 / K)
        dx = dy = 0.0
        for ts in self.spec.get("shakes") or []:
            u = t - ts
            if 0 <= u < 0.4:
                env = math.exp(-10 * u) * 9
                dx += env * math.sin(2 * math.pi * 11 * u)
                dy += env * math.sin(2 * math.pi * 8 * u + 1.3)
        return np.float32([[K, 0, self.W / 2 - K * cx + dx], [0, K, self.H / 2 - K * cy + dy]])

    def matte(self, src, rgb):
        acc, ws = np.zeros(self.masks.shape[1:], np.float32), 0.0
        for dd, w in ((-1, 0.25), (0, 0.5), (1, 0.25)):
            j = src + dd
            if 0 <= j < len(self.masks) and self.shot_of[j] == self.shot_of[src]:
                acc += self.masks[j].astype(np.float32) * w
                ws += w
        m = cv2.resize(acc / (255 * ws), (self.sw, self.sh), interpolation=cv2.INTER_LINEAR)
        m = cv2.ximgproc.guidedFilter(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), m, 8, 1e-3)
        return np.clip((m - 0.25) / 0.5, 0, 1)

    def layer(self, name, i):
        p = os.path.join(self.gfx, name, f"{i:05d}.png")
        if not os.path.exists(p):
            return None
        im = cv2.cvtColor(cv2.imread(p, cv2.IMREAD_UNCHANGED), cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
        if im.shape[1] != self.W:
            im = cv2.resize(im, (self.W, self.H), interpolation=cv2.INTER_AREA)
        return im[..., :3], im[..., 3:4]

    def frame(self, i, rgb):
        t, src = self.tl.tv[i], self.tl.src[i]
        sat, expo = 1.06, 1.0
        for f in self.fx:
            if f["type"] == "desaturate" and f["t0"] <= t < f["t1"]:
                e = EASE["inout"](pr(t, f["t0"], min(0.6, f["t1"] - f["t0"])))
                sat -= f.get("amount", 0.7) * e
                expo *= 1 - 0.12 * e
            if f["type"] == "flashIn" and t < f.get("t1", 0.6):
                expo *= clamp((t - f["t0"]) / 0.12) * (1 + 0.55 * math.exp(-max(0.0, t - f["t0"] - 0.1) / 0.12))
        if self.mono:
            sat = 0.0
        M = self.camera(t, src)
        img = cv2.LUT(rgb, self.lut).astype(np.float32) / 255
        lum = img @ np.float32([0.2126, 0.7152, 0.0722])
        img = lum[..., None] + (img - lum[..., None]) * sat
        plate = cv2.warpAffine(img, M, (self.W, self.H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT) * expo
        m = cv2.warpAffine(self.matte(src, rgb), M, (self.W, self.H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)[..., None]
        comp = plate
        b = self.layer("behind", i)
        if b is not None:
            comp = comp * (1 - b[1]) + b[0] * b[1]
        comp = comp * (1 - m) + plate * m
        for f in self.fx:
            if f["type"] == "endFade" and t >= f["t0"]:
                e = EASE["inout"](pr(t, f["t0"], max(0.3, f.get("t1", f["t0"] + 0.9) - f["t0"])))
                comp = cv2.GaussianBlur(comp, (0, 0), 1 + 14 * e) * (1 - 0.9 * e)
        fr = self.layer("front", i)
        if fr is not None:
            comp = comp * (1 - fr[1]) + fr[0] * fr[1]
        small = cv2.resize(comp, (self.W // 4, self.H // 4), interpolation=cv2.INTER_AREA)
        comp = comp + cv2.resize(cv2.GaussianBlur(np.clip(small - 0.72, 0, None), (0, 0), 12), (self.W, self.H)) * 0.5
        comp = comp * self.vig
        g = np.roll(self.grain[i % len(self.grain)], (i * 37) % self.H, 0)
        comp = comp + g[..., None] * (self.grain_amt * (1.1 - comp.mean(-1, keepdims=True)))
        comp = comp * clamp((self.tl.duration - i / self.tl.fps) / 0.5)
        return (np.clip(comp, 0, 1) * 255 + 0.5).astype(np.uint8)


def render_video(d, spec, tl, info, out_path, progress, only=None):
    c = Compositor(d, spec, tl, info)
    src_path = os.path.join(d, "source.mp4")
    sw, sh = info["width"], info["height"]
    if only is not None:  # stills for previews
        for i in only:
            f = tl.src[i]
            buf = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{max(0, (f - 1)) / tl.fps:.4f}", "-i", src_path,
                                  "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
            rgb = np.frombuffer(buf[: sw * sh * 3], np.uint8).reshape(sh, sw, 3)
            cv2.imwrite(os.path.join(out_path, f"{i:05d}.jpg"), cv2.cvtColor(c.frame(i, rgb), cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 90])
        return
    dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", src_path, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE)
    enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{c.W}x{c.H}",
                            "-framerate", str(tl.fps), "-i", "-", "-c:v", "libx264", "-preset", "slow", "-crf", "17",
                            "-tune", "film", "-x264-params", "aq-mode=3", "-pix_fmt", "yuv420p",
                            "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", out_path],
                           stdin=subprocess.PIPE)
    cur, rgb = -1, None
    for i in range(tl.n):
        want = tl.src[i]
        while cur < want:
            buf = dec.stdout.read(sw * sh * 3)
            if len(buf) < sw * sh * 3:
                break
            rgb, cur = np.frombuffer(buf, np.uint8).reshape(sh, sw, 3), cur + 1
        enc.stdin.write(c.frame(i, rgb).tobytes())
        if i % 30 == 0:
            progress(i / tl.n)
    enc.stdin.close()
    enc.wait()
    dec.kill()
