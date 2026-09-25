"""Render the key visuals (one PNG per block of the voice-over) and a labelled board.

    python tools/keyvisuals.py --out keyvisuals/
"""
import argparse
import base64
import io
import pathlib
import sys

from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
ap = argparse.ArgumentParser()
ap.add_argument('--out', default='keyvisuals')
ap.add_argument('--only', default=None, help='comma-separated 1-based indices')
args = ap.parse_args()
out = pathlib.Path(args.out)
if not out.is_absolute():
    out = ROOT / out
out.mkdir(parents=True, exist_ok=True)

with sync_playwright() as pw:
    br = pw.chromium.launch(headless=True, args=['--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'])
    pg = br.new_page(viewport={'width': 540, 'height': 960})
    pg.on('pageerror', lambda e: print('page error:', e, file=sys.stderr))
    pg.on('console', lambda m: print('console:', m.text, file=sys.stderr) if m.type in ('error', 'warning') else None)
    pg.goto((ROOT / 'index.html').as_uri())
    pg.wait_for_function('window.__kv && __kv.ready()', timeout=60000)
    meta = pg.evaluate('__kv.meta()')
    idx = [int(x) - 1 for x in args.only.split(',')] if args.only else range(len(meta))
    files = []
    for i in idx:
        data = pg.evaluate('i => __kv.render(i, 2.0)', i)
        f = out / f'kv{i + 1:02d}-{meta[i]["id"]}.png'
        f.write_bytes(base64.b64decode(data.split(',', 1)[1]))
        files.append((i, f))
        print('wrote', f.name)
    br.close()

# a board: all frames side by side, numbered, with their time range
if not args.only:
    tw, th = 360, 640
    cols = min(5, len(files))
    rows = (len(files) + cols - 1) // cols
    board = Image.new('RGB', (cols * (tw + 24) + 24, rows * (th + 110) + 24), (14, 14, 18))
    d = ImageDraw.Draw(board)
    font_path = None
    for cand in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if pathlib.Path(cand).exists():
            font_path = cand
    fb = ImageFont.truetype(font_path, 26) if font_path else ImageFont.load_default()
    fs = ImageFont.truetype(font_path, 20) if font_path else ImageFont.load_default()
    for k, (i, f) in enumerate(files):
        im = Image.open(f).convert('RGB').resize((tw, th), Image.LANCZOS)
        x = 24 + (k % cols) * (tw + 24)
        y = 24 + (k // cols) * (th + 110)
        board.paste(im, (x, y))
        d.text((x, y + th + 12), f'{i + 1}. {meta[i]["id"].upper()}', font=fb, fill=(255, 210, 63))
        d.text((x, y + th + 48), meta[i]['time'], font=fs, fill=(200, 200, 210))
    board.save(out / 'board.png')
    print('wrote board.png')
