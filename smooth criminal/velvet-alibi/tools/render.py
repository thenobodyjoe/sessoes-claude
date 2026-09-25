"""Render the painted scene to an MP4, frame by frame.

The piece is a pure function of time (`__rick.render(t)`), so we can step a headless Chrome through it at a
fixed frame rate, grab each frame from the canvas and pipe it to ffmpeg. The soundtrack is rendered offline
through the same WebAudio desk (`__rick.audioWav`) and muxed underneath.

    python tools/render.py                       # 1280x720, 30 fps -> velvet-alibi.mp4
    python tools/render.py --w 1920 --h 1080     # full HD
    python tools/render.py --seconds 4 --out test.mp4

Needs: python + playwright (`pip install playwright`), Google Chrome or Edge installed, ffmpeg on PATH.
"""
import argparse
import base64
import pathlib
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent

ap = argparse.ArgumentParser()
ap.add_argument('--w', type=int, default=1280)
ap.add_argument('--h', type=int, default=720)
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--out', default='velvet-alibi.mp4')
ap.add_argument('--seconds', type=float, default=None, help='render only the first N seconds (default: the full loop)')
ap.add_argument('--channel', default='chrome', help='chrome or msedge')
ap.add_argument('--crf', type=int, default=18)
ap.add_argument('--no-audio', action='store_true')
args = ap.parse_args()

out = pathlib.Path(args.out)
if not out.is_absolute():
    out = ROOT / out
wav = out.with_suffix('.wav')

with sync_playwright() as pw:
    browser = pw.chromium.launch(channel=args.channel, headless=True,
                                 args=['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': args.w, 'height': args.h}, device_scale_factor=1)
    page = ctx.new_page()
    page.on('pageerror', lambda e: print('page error:', e, file=sys.stderr))
    page.goto((ROOT / 'index.html').as_uri() + '?autoplay')
    page.wait_for_function('window.__rick && typeof DUR !== "undefined"', timeout=30000)
    page.evaluate('__rick.pause()')
    dur = page.evaluate('DUR')
    cw, ch = page.evaluate('[cv.width, cv.height]')
    print(f'piece: {dur:.2f}s, canvas {cw}x{ch}')
    if (cw, ch) != (args.w, args.h):
        print('warning: canvas size differs from the requested size', file=sys.stderr)

    seconds = min(args.seconds or dur, dur)
    n = int(round(seconds * args.fps))

    if not args.no_audio:
        t0 = time.time()
        res = page.evaluate('__rick.audioWav(44100, -1.5)')
        wav.write_bytes(base64.b64decode(res['b64']))
        print(f"audio: {res['seconds']}s, errors {res['errs']}, raw peak {res['peakDb']} dB ({time.time() - t0:.1f}s)")

    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(args.fps), '-c:v', 'png', '-i', '-']
    if not args.no_audio:
        cmd += ['-i', str(wav)]
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', str(args.crf), '-pix_fmt', 'yuv420p']
    if not args.no_audio:
        cmd += ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '256k', '-t', f'{seconds:.3f}']
    cmd += ['-movflags', '+faststart', str(out)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    t_start = time.time()
    for i in range(n):
        t = i / args.fps
        data = page.evaluate('t => { __rick.render(t); return cv.toDataURL("image/png").slice(22); }', t)
        ff.stdin.write(base64.b64decode(data))
        if i % 60 == 0 or i == n - 1:
            el = time.time() - t_start
            eta = el / (i + 1) * (n - i - 1)
            print(f'frame {i + 1}/{n}  t={t:6.2f}s  elapsed {el:5.0f}s  eta {eta:5.0f}s', flush=True)
    ff.stdin.close()
    ff.wait()
    browser.close()

print('wrote', out, f'({out.stat().st_size / 1e6:.1f} MB)')
