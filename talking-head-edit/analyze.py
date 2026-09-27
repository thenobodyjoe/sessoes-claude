"""Per-frame subject matte (MediaPipe selfie segmentation) and face track."""
import subprocess

import mediapipe as mp
import numpy as np

from config import H, N_SRC, SRC, W, WORK

MW, MH = 480, 270


def frames():
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-i", SRC, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        stdout=subprocess.PIPE,
    )
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3:
            break
        yield np.frombuffer(buf, np.uint8).reshape(H, W, 3)


def main():
    import cv2

    masks = np.zeros((N_SRC, MH, MW), np.uint8)
    faces = np.full((N_SRC, 4), np.nan, np.float32)  # cx, cy, w, h in px
    seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
    fd = mp.solutions.face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)
    n = 0
    for i, img in enumerate(frames()):
        m = seg.process(img).segmentation_mask
        masks[i] = (cv2.resize(m, (MW, MH), interpolation=cv2.INTER_AREA) * 255).astype(np.uint8)
        r = fd.process(img)
        if r.detections:
            b = max(r.detections, key=lambda d: d.score[0]).location_data.relative_bounding_box
            faces[i] = [(b.xmin + b.width / 2) * W, (b.ymin + b.height / 2) * H, b.width * W, b.height * H]
        n = i + 1
    print("analyzed", n, "frames")
    np.save(f"{WORK}/masks.npy", masks[:n])
    np.save(f"{WORK}/faces.npy", faces[:n])


if __name__ == "__main__":
    main()
