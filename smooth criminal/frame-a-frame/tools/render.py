"""Render the painting to an MP4, one output frame per clip frame.

The piece is a pure function of time (`__rick.frame(f)` paints clip frame f), so a headless Chromium steps
through it, each frame is read off the canvas and piped to ffmpeg. The original score is rendered offline
through the same WebAudio desk (`__rick.audioWav`) and muxed underneath.

    python tools/render.py                        # 1280x720 -> alibi-azul-e-ouro.mp4
    python tools/render.py --w 1920 --h 1080
    python tools/render.py --frames 240 --out test.mp4

Needs: python + playwright, a Chromium (PLAYWRIGHT_BROWSERS_PATH, or --chrome /path/to/chrome), ffmpeg on PATH.
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
ap.add_argument('--out', default='alibi-azul-e-ouro.mp4')
ap.add_argument('--frames', type=int, default=None, help='render only the first N frames')
ap.add_argument('--chrome', default=None, help='path to a Chrome/Chromium executable')
ap.add_argument('--crf', type=int, default=18)
ap.add_argument('--no-audio', action='store_true')
args = ap.parse_args()

out = pathlib.Path(args.out)
if not out.is_absolute():
    out = ROOT / out
wav = out.with_suffix('.wav')

with sync_playwright() as pw:
    kw = {'executable_path': args.chrome} if args.chrome else {}
    browser = pw.chromium.launch(headless=True, args=['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'], **kw)
    page = browser.new_page(viewport={'width': args.w, 'height': args.h}, device_scale_factor=1)
    page.on('pageerror', lambda e: print('page error:', e, file=sys.stderr))
    page.goto((ROOT / 'index.html').as_uri() + '?t=0')
    page.wait_for_function('window.__rick', timeout=60000)
    page.evaluate('__rick.pause()')
    fps, nf = page.evaluate('[FPS, NF]')
    n = min(args.frames or nf, nf)
    print(f'clip: {nf} frames at {fps} fps; rendering {n}')

    if not args.no_audio:
        t0 = time.time()
        res = page.evaluate('__rick.audioWav(44100, -1.5)')
        wav.write_bytes(base64.b64decode(res['b64']))
        print(f"audio: {res['seconds']}s, errors {res['errs']}, raw peak {res['peakDb']} dB ({time.time() - t0:.1f}s)")

    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(fps), '-c:v', 'png', '-i', '-']
    if not args.no_audio:
        cmd += ['-i', str(wav)]
    cmd += ['-c:v', 'libx264', '-preset', 'medium', '-crf', str(args.crf), '-pix_fmt', 'yuv420p']
    if not args.no_audio:
        cmd += ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-c:a', 'aac', '-b:a', '256k', '-t', f'{n / fps:.3f}']
    cmd += ['-movflags', '+faststart', str(out)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)

    t_start = time.time()
    for f in range(n):
        data = page.evaluate('f => { __rick.frame(f); return cv.toDataURL("image/png").slice(22); }', f)
        ff.stdin.write(base64.b64decode(data))
        if f % 100 == 0 or f == n - 1:
            el = time.time() - t_start
            print(f'frame {f + 1}/{n}  elapsed {el:5.0f}s  eta {el / (f + 1) * (n - f - 1):5.0f}s', flush=True)
    ff.stdin.close()
    ff.wait()
    browser.close()
if not args.no_audio:
    wav.unlink(missing_ok=True)
print('wrote', out, f'({out.stat().st_size / 1e6:.1f} MB)')
