#!/usr/bin/env python3
"""Per-frame subject matte (MediaPipe selfie segmentation) + face track, and free-space report.

usage: analyze.py SRC [--out DIR] [--shots 0,546,625]   (shot starts: from probe.py info.json)
writes DIR/masks.npy (N x 270 x 480 uint8), DIR/faces.npy (N x 4: cx, cy, w, h px), prints per-shot
face position and the subject's horizontal extent per row band (where text can live).
"""
import argparse
import json
import os
import subprocess

import cv2
import mediapipe as mp
import numpy as np

MW, MH = 480, 270


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("src")
    ap.add_argument("--out", default="work")
    ap.add_argument("--shots", help="comma list of shot start frames (default: read DIR/info.json)")
    args = ap.parse_args()
    os.makedirs(args.out, exist_ok=True)
    meta = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                      "stream=width,height", "-of", "json", args.src],
                                     capture_output=True, text=True).stdout)["streams"][0]
    W, H = meta["width"], meta["height"]

    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", args.src, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
                         stdout=subprocess.PIPE)
    seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
    fd = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
    masks, faces = [], []
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        img = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        m = seg.process(img).segmentation_mask
        masks.append((cv2.resize(m, (MW, MH), interpolation=cv2.INTER_AREA) * 255).astype(np.uint8))
        r = fd.process(img)
        if r.detections:
            b = max(r.detections, key=lambda d: d.score[0]).location_data.relative_bounding_box
            faces.append([(b.xmin + b.width / 2) * W, (b.ymin + b.height / 2) * H, b.width * W, b.height * H])
        else:
            faces.append([np.nan] * 4)
    masks, faces = np.stack(masks), np.float32(faces)
    np.save(os.path.join(args.out, "masks.npy"), masks)
    np.save(os.path.join(args.out, "faces.npy"), faces)
    print(f"{len(masks)} frames analyzed ({W}x{H})")

    if args.shots:
        shots = [int(x) for x in args.shots.split(",")]
    else:
        info = os.path.join(args.out, "info.json")
        shots = json.load(open(info))["shot_starts"] if os.path.exists(info) else [0]
    sx, sy = W / MW, H / MH
    for a, b in zip(shots, shots[1:] + [len(masks)]):
        f = np.nanmedian(faces[a:b], 0).round()
        print(f"shot frames {a}-{b - 1}: face cx={f[0]:.0f} cy={f[1]:.0f} size={f[2]:.0f}  missing={np.isnan(faces[a:b, 0]).sum()}")
        union = (masks[a:b] > 128).any(0)
        for y in range(H // 10, H, H // 10):
            row = np.where(union[int(y / sy)])[0]
            span = f"x {row.min() * sx:.0f}-{row.max() * sx:.0f}" if len(row) else "free"
            print(f"    y={y:4d}: subject {span}")


if __name__ == "__main__":
    main()
