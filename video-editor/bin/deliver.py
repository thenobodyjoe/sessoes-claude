#!/usr/bin/env python3
"""Mux and encode deliverables.

usage: deliver.py VIDEO.mp4 MIX.wav --out DIR --name NAME [--max-mb 29]
writes NAME_master.mp4 (visually lossless, big) and NAME_preview.mp4 (capped CRF, fits --max-mb:
the in-chat file limit is 30 MiB).
"""
import argparse
import json
import os
import subprocess


def run(*a):
    subprocess.run(list(a), check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("mix")
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", required=True)
    ap.add_argument("--max-mb", type=float, default=29)
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    dur = float(json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                                           "json", args.video], capture_output=True, text=True).stdout)["format"]["duration"])
    tags = ["-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709", "-pix_fmt", "yuv420p"]
    master = os.path.join(args.out, f"{args.name}_master.mp4")
    run("ffmpeg", "-v", "error", "-y", "-i", args.video, "-i", args.mix, "-map", "0:v", "-map", "1:a",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "320k", "-shortest", "-movflags", "+faststart", master)
    a_kbps = 192
    v_kbps = int(args.max_mb * 8 * 1024 * 0.97 / dur - a_kbps)
    prev = os.path.join(args.out, f"{args.name}_preview.mp4")
    # capped CRF: quality-driven, but the VBV cap keeps the file under --max-mb
    run("ffmpeg", "-v", "error", "-y", "-i", args.video, "-i", args.mix, "-map", "0:v", "-map", "1:a",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-maxrate", f"{v_kbps}k", "-bufsize", f"{v_kbps}k",
        *tags, "-c:a", "aac", "-b:a", f"{a_kbps}k", "-shortest", "-movflags", "+faststart", prev)
    for f in (master, prev):
        print(f"{f}: {os.path.getsize(f) / 2**20:.1f} MiB")


if __name__ == "__main__":
    main()
