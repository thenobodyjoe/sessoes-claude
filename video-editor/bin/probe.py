#!/usr/bin/env python3
"""First look at a source video: specs, loudness, silences, hard cuts, contact sheets.

usage: probe.py SRC [--out DIR]
writes DIR/info.json, DIR/contact.jpg (12 evenly spaced frames), DIR/cuts.jpg (around each cut)
"""
import argparse
import json
import os
import re
import subprocess

import numpy as np


def sh(*a):
    return subprocess.run(list(a), capture_output=True, text=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="work")
    ap.add_argument("--silence-db", type=float, default=-35)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)

    meta = json.loads(sh("ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams",
                         args.src).stdout)
    v = next(s for s in meta["streams"] if s["codec_type"] == "video")
    a = next((s for s in meta["streams"] if s["codec_type"] == "audio"), None)
    num, den = map(int, v["r_frame_rate"].split("/"))
    fps = num / den
    dur = float(meta["format"]["duration"])
    w, h = int(v["width"]), int(v["height"])
    rot = next((sd.get("rotation") for sd in v.get("side_data_list", []) if "rotation" in sd), 0)

    # hard cuts from mean abs frame difference on a tiny grayscale proxy
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", args.src, "-vf", "scale=64:36,format=gray",
                          "-f", "rawvideo", "-"], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, 36, 64).astype(np.float32)
    d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
    thr = max(8.0, 8 * float(np.median(d)))
    cut_frames = [int(i + 1) for i in np.where(d > thr)[0]]
    cuts = [{"frame": f, "t": round(f / fps, 3), "score": round(float(d[f - 1]), 1)} for f in cut_frames]

    silences, loud = [], {}
    if a:
        err = sh("ffmpeg", "-i", args.src, "-af", f"silencedetect=n={args.silence_db}dB:d=0.25,ebur128=peak=true",
                 "-f", "null", "-").stderr
        starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", err)]
        ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", err)]
        silences = [[round(s, 3), round(e, 3)] for s, e in zip(starts, ends + [dur])]
        summ = err[err.rfind("Summary:"):]
        for key, pat in (("I_LUFS", r"I:\s+(-?[\d.]+) LUFS"), ("LRA", r"LRA:\s+([\d.]+) LU"),
                         ("peak_dBFS", r"Peak:\s+(-?[\d.]+) dBFS")):
            m = re.search(pat, summ)
            if m:
                loud[key] = float(m.group(1))

    info = {
        "src": os.path.abspath(args.src), "duration": dur, "fps": fps, "fps_rational": v["r_frame_rate"],
        "frames": len(fr), "width": w, "height": h, "rotation": rot, "vcodec": v["codec_name"],
        "acodec": a["codec_name"] if a else None, "audio_rate": int(a["sample_rate"]) if a else None,
        "loudness": loud, "silences": silences, "cuts": cuts,
        "shot_starts": [0] + cut_frames,
    }
    json.dump(info, open(os.path.join(args.out, "info.json"), "w"), indent=1)

    def sheet(times, name, cols):
        tmp = os.path.join(args.out, ".sheet")
        os.makedirs(tmp, exist_ok=True)
        for k, t in enumerate(times):
            t = min(max(t, 0), dur - 0.05)
            sh("ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", args.src, "-frames:v", "1", "-vf",
               f"scale=480:-2,drawtext=text='{t:.2f}s':x=10:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.5",
               os.path.join(tmp, f"{k:03d}.jpg"))
        sh("ffmpeg", "-v", "error", "-y", "-i", os.path.join(tmp, "%03d.jpg"), "-vf",
           f"tile={cols}x{-(-len(times) // cols)}", "-frames:v", "1", os.path.join(args.out, name))
        for f in os.listdir(tmp):
            os.remove(os.path.join(tmp, f))
        os.rmdir(tmp)

    sheet([dur * (k + 0.5) / 12 for k in range(12)], "contact.jpg", 4)
    if cuts:
        sheet([x for c in cuts[:12] for x in (c["t"] - 0.1, c["t"] + 0.1)], "cuts.jpg", 4)

    print(json.dumps({k: info[k] for k in ("duration", "fps", "width", "height", "vcodec", "loudness")}))
    print("cuts:", [c["t"] for c in cuts])
    print("silences:", silences)


if __name__ == "__main__":
    main()
