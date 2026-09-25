"""Read a reference clip and keep only what a painter would take from it: where the bodies are, how the
camera moves, where the cuts fall, and the broad fall of light and colour. Nothing else leaves this script:
no pixels, faces, costumes or on-screen text.

    python tools/extract.py ../clip-ref.mp4            # -> data/raw.npz

Per frame it stores:
  * up to 6 people as 33 MediaPipe pose landmarks (x, y in 0..1, visibility) plus the brightness of their
    torso (only used to decide who leads the dance);
  * a 48x27 colour field of the room with the people painted out and blurred far past recognition;
  * the camera shift from the previous frame (phase correlation) and a cut flag.
"""
import argparse
import pathlib
import sys
import time

import cv2
import mediapipe as mp
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('clip')
ap.add_argument('--model', default=str(ROOT / 'tools' / 'pose_landmarker_heavy.task'))
ap.add_argument('--out', default=str(ROOT / 'data' / 'raw.npz'))
ap.add_argument('--max-frames', type=int, default=0)
ap.add_argument('--poses', type=int, default=6)
args = ap.parse_args()

FW, FH = 48, 27          # colour field
MAXP = args.poses

cap = cv2.VideoCapture(args.clip)
fps = cap.get(cv2.CAP_PROP_FPS)
n_total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)); H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
if args.max_frames:
    n_total = min(n_total, args.max_frames)
print(f'{args.clip}: {W}x{H} @ {fps} fps, {n_total} frames')

BaseOptions = mp.tasks.BaseOptions
PL = mp.tasks.vision.PoseLandmarker
opts = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=BaseOptions(model_asset_path=args.model),
    running_mode=mp.tasks.vision.RunningMode.VIDEO,
    num_poses=MAXP, min_pose_detection_confidence=0.35, min_pose_presence_confidence=0.35,
    min_tracking_confidence=0.35)

lms = np.zeros((n_total, MAXP, 33, 3), np.float32)      # x, y, visibility
npers = np.zeros(n_total, np.uint8)
torso = np.zeros((n_total, MAXP), np.float32)           # torso brightness 0..1
field = np.zeros((n_total, FH, FW, 3), np.uint8)
shift = np.zeros((n_total, 2), np.float32)              # camera shift in frame fractions
cutscore = np.zeros(n_total, np.float32)

# body cover drawn from the landmarks: thick limbs and a filled torso and head, sized to the person
BONES = [(11, 13), (13, 15), (12, 14), (14, 16), (23, 25), (25, 27), (24, 26), (26, 28), (27, 31), (28, 32),
         (11, 12), (23, 24), (11, 23), (12, 24)]
def paint_body(dst, pose, W, H):
    P = np.array([[p.x * W, p.y * H] for p in pose], np.float32)
    sh = np.linalg.norm(P[11] - P[12])
    th = max(8, int(sh * 0.55))
    for a, b in BONES:
        cv2.line(dst, tuple(P[a].astype(int)), tuple(P[b].astype(int)), 1.0, th)
    cv2.fillConvexPoly(dst, P[[11, 12, 24, 23]].astype(np.int32), 1.0)
    head = P[0]
    cv2.circle(dst, tuple(head.astype(int)), int(max(10, sh * 0.75)), 1.0, -1)
    cv2.line(dst, tuple(head.astype(int)), tuple(((P[11] + P[12]) / 2).astype(int)), 1.0, th)

prev_gray = None
prev_hist = None
win = cv2.createHanningWindow((160, 90), cv2.CV_32F)
t0 = time.time()
with PL.create_from_options(opts) as det:
    for i in range(n_total):
        ok, frame = cap.read()
        if not ok:
            n_total = i
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        res = det.detect_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(round(i * 1000 / fps)))
        people = np.zeros((H, W), np.float32)
        k = 0
        for j, pose in enumerate(res.pose_landmarks[:MAXP]):
            for m, p in enumerate(pose):
                lms[i, k, m] = (p.x, p.y, p.visibility)
            # torso brightness: mean luma inside the shoulder/hip quad
            q = np.array([[pose[a].x * W, pose[a].y * H] for a in (11, 12, 24, 23)], np.float32)
            c = q.mean(0)
            q = (c + (q - c) * 0.7).astype(np.int32)
            msk = np.zeros((H, W), np.uint8)
            cv2.fillConvexPoly(msk, q, 1)
            if msk.sum() > 20:
                torso[i, k] = cv2.mean(cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY), msk)[0] / 255
            paint_body(people, pose, W, H)
            k += 1
        npers[i] = k

        # the room without its people, blurred to a colour field
        small = cv2.resize(frame, (160, 90), interpolation=cv2.INTER_AREA)
        pm = cv2.resize((people > 0.3).astype(np.uint8), (160, 90), interpolation=cv2.INTER_NEAREST)
        pm = cv2.dilate(pm, np.ones((7, 7), np.uint8))
        room = cv2.inpaint(small, pm, 6, cv2.INPAINT_TELEA) if pm.any() else small
        room = cv2.medianBlur(room, 9)
        f = cv2.resize(room, (FW, FH), interpolation=cv2.INTER_AREA)
        field[i] = cv2.cvtColor(f, cv2.COLOR_BGR2RGB)

        # camera motion and cuts
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY).astype(np.float32)
        hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
        hist = cv2.calcHist([hsv], [0, 1], None, [24, 16], [0, 180, 0, 256])
        cv2.normalize(hist, hist)
        if prev_gray is not None:
            (dx, dy), resp = cv2.phaseCorrelate(prev_gray, gray, win)
            shift[i] = (dx / 160, dy / 90) if resp > 0.08 else (0, 0)
            cutscore[i] = 1 - cv2.compareHist(prev_hist, hist, cv2.HISTCMP_CORREL)
        prev_gray, prev_hist = gray, hist

        if i % 50 == 0:
            el = time.time() - t0
            print(f'frame {i}/{n_total}  people {k}  {el:.0f}s  eta {el / (i + 1) * (n_total - i - 1):.0f}s', flush=True)

n = n_total
np.savez_compressed(args.out, fps=fps, W=W, H=H, lms=lms[:n], npers=npers[:n], torso=torso[:n],
                    field=field[:n], shift=shift[:n], cutscore=cutscore[:n])
print('wrote', args.out, f'{n} frames, {time.time() - t0:.0f}s')
