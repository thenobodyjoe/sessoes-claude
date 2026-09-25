"""Render the piece to a vertical MP4 (1080x1920), frame by frame, with motion blur and the sound.

The piece is a pure function of time (`__reel.render(t, samples, dt)`), so headless Chromium steps
through it at a fixed frame rate; each frame accumulates `--blur` sub-frames across a 180-degree
shutter on the GPU. `--jobs` browsers render contiguous chunks in parallel, each into its own H.264
segment; the segments are joined without re-encoding and the sound (the voice-over and the score,
mixed offline through the page's own WebAudio desk, `__reel.audioWav`) is muxed underneath.

    python tools/render.py                                  # 30 fps, 4 blur samples, 3 jobs -> ranking-alerta.mp4
    python tools/render.py --seconds 4 --start 38 --out test.mp4
    python tools/render.py --sheet 0.5,4.8,10.4 --out sheet.png   # contact sheet of chosen times
    python tools/render.py --audio-only --out mix.wav               # just the sound ('mix', 'score' or 'voice' with --parts)

Needs: python + playwright (`pip install playwright`), a Chromium for it, and ffmpeg (on PATH, or
`pip install imageio-ffmpeg`).
"""
import argparse
import base64
import multiprocessing as mp
import pathlib
import shutil
import subprocess
import sys
import tempfile
import time

ROOT = pathlib.Path(__file__).resolve().parent.parent
LAUNCH_ARGS = ['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']


def ffmpeg_exe():
    exe = shutil.which('ffmpeg')
    if exe:
        return exe
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        sys.exit('ffmpeg not found: install it or `pip install imageio-ffmpeg`')


def open_page(pw, channel):
    kw = dict(headless=True, args=LAUNCH_ARGS)
    if channel:
        kw['channel'] = channel
    browser = pw.chromium.launch(**kw)
    page = browser.new_page(viewport={'width': 540, 'height': 960}, device_scale_factor=1)
    page.on('pageerror', lambda e: print('page error:', e, file=sys.stderr))
    page.on('console', lambda m: print('console:', m.text, file=sys.stderr) if m.type in ('error', 'warning') else None)
    page.goto((ROOT / 'index.html').as_uri() + '?autoplay')
    page.wait_for_function('window.__reel && __reel.ready()', timeout=60000)
    page.evaluate('__reel.pause()')
    return browser, page


def encode_args(crf):
    # the film grain is incompressible noise: cap the bitrate so the master stays a sane size
    return ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
            '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709']


def worker(job):
    """Render frames [i0, i1) into an H.264 segment."""
    k, i0, i1, a, seg_path = job
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser, page = open_page(pw, a['channel'])
        cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(a['fps']), '-c:v', 'png', '-i', '-']
        cmd += encode_args(a['crf']) + [seg_path]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        dt = 1 / a['fps']
        t_start = time.time()
        for i in range(i0, i1):
            t = a['start'] + i * dt
            data = page.evaluate('([t, n, dt, sh]) => { __reel.render(t, n, dt, sh); return document.getElementById("reel").toDataURL("image/png").slice(22); }',
                                 [t, a['blur'], dt, a['shutter']])
            proc.stdin.write(base64.b64decode(data))
            done = i - i0 + 1
            if done % 30 == 0 or i == i1 - 1:
                el = time.time() - t_start
                print(f'[job {k}] {done}/{i1 - i0} frames  t={t:6.3f}s  elapsed {el:5.0f}s  eta {el / done * (i1 - i - 1):5.0f}s', flush=True)
        proc.stdin.close()
        proc.wait()
        browser.close()
    return seg_path


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--blur', type=int, default=4, help='sub-frames per frame (1 = no motion blur)')
    ap.add_argument('--shutter', type=float, default=0.5, help='fraction of the frame interval the shutter is open')
    ap.add_argument('--jobs', type=int, default=max(1, min(3, (mp.cpu_count() or 2) - 1)), help='parallel browsers')
    ap.add_argument('--out', default='ranking-alerta.mp4')
    ap.add_argument('--seconds', type=float, default=None, help='render only N seconds')
    ap.add_argument('--start', type=float, default=0.0)
    ap.add_argument('--channel', default=None, help='chrome / msedge (default: the Chromium bundled with playwright)')
    ap.add_argument('--crf', type=int, default=18)
    ap.add_argument('--no-audio', action='store_true')
    ap.add_argument('--audio-only', action='store_true', help='write the sound as a WAV and stop')
    ap.add_argument('--parts', default='mix', help="audio: 'mix' (voice + score), 'score' or 'voice'")
    ap.add_argument('--sheet', default=None, help='comma-separated times: write a contact sheet PNG instead of a video')
    ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--scale', type=float, default=0.2)
    args = ap.parse_args()

    out = pathlib.Path(args.out)
    if not out.is_absolute():
        out = ROOT / out
    wav = out.with_suffix('.wav')

    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        browser, page = open_page(pw, args.channel)
        dur = page.evaluate('__reel.dur()')
        if args.sheet:
            times = [float(x) for x in args.sheet.split(',')]
            data = page.evaluate('([t, c, s, n]) => __reel.sheet(t, c, s, n)', [times, args.cols, args.scale, args.blur if args.blur > 1 else 1])
            out.write_bytes(base64.b64decode(data.split(',', 1)[1]))
            print('wrote', out)
            browser.close()
            return
        if not args.no_audio:
            t0 = time.time()
            res = page.evaluate('([p]) => __reel.audioWav(48000, p)', [args.parts])
            wav.write_bytes(base64.b64decode(res['b64']))
            print(f"audio ({args.parts}): {res['seconds']}s, {res['events']} events, errors {res['errs']}, peak {res['peakDb']} dBFS ({time.time() - t0:.1f}s)")
        browser.close()
    if args.audio_only:
        print('wrote', wav)
        return

    seconds = min(args.seconds or dur, dur - args.start)
    n = int(round(seconds * args.fps))
    jobs = max(1, min(args.jobs, n))
    print(f'piece {dur:.3f}s -> {n} frames at {args.fps} fps, {args.blur} sub-frame(s) each, {jobs} job(s)')

    tmp = pathlib.Path(tempfile.mkdtemp(prefix='reel-'))
    a = {'fps': args.fps, 'blur': args.blur, 'shutter': args.shutter, 'crf': args.crf, 'start': args.start, 'channel': args.channel}
    bounds = [round(n * k / jobs) for k in range(jobs + 1)]
    work = [(k, bounds[k], bounds[k + 1], a, str(tmp / f'seg{k:02d}.mp4')) for k in range(jobs)]
    t_start = time.time()
    if jobs == 1:
        segs = [worker(work[0])]
    else:
        with mp.get_context('spawn').Pool(jobs) as pool:
            segs = pool.map(worker, work)
    print(f'frames done in {time.time() - t_start:.0f}s')

    lst = tmp / 'list.txt'
    lst.write_text(''.join(f"file '{s}'\n" for s in segs))
    cmd = [ffmpeg_exe(), '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', str(lst)]
    if not args.no_audio:
        cmd += ['-ss', f'{args.start:.3f}', '-i', str(wav), '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '256k']
    cmd += ['-c:v', 'copy', '-t', f'{seconds:.3f}', '-movflags', '+faststart', str(out)]
    subprocess.run(cmd, check=True)
    shutil.rmtree(tmp, ignore_errors=True)
    print('wrote', out, f'({out.stat().st_size / 1e6:.1f} MB)')


if __name__ == '__main__':
    main()
