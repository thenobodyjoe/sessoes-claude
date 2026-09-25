"""Pack the brand assets into src/01-assets.js so index.html stays a single self-contained file.

- Poppins (SIL OFL, assets/fonts) as base64 woff2, one face per weight.
- The Ranking dos Políticos lockup (assets/logo-ranking-15anos.png, white on transparent) cut into a sprite
  atlas: every letter of the wordmark, the "15" and the letters of "Anos", each with its position in the
  original logo so the animation can fly them in one by one and land them exactly where the logo has them.
  The round mark itself is not a sprite: it is rebuilt as vector shapes (LOGO_MARK) so it can morph.

    python tools/embed_assets.py

Needs: python + pillow + numpy.
"""
import base64
import io
import json
import pathlib
from collections import deque

import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
LOGO = ROOT / 'assets' / 'logo-ranking-15anos.png'
FONTS = ROOT / 'assets' / 'fonts'
OUT = ROOT / 'src' / '01-assets.js'

# Measured on the source logo (pixels of the 1735x768 PNG). The disc is a circle with five knock-outs:
# the column capital (abacus + echinus) and three ascending bars that run out through the bottom edge.
MARK = {
    'cx': 596.08, 'cy': 457.67, 'r': 185.27,
    'abacus': [481.5, 326.45, 709.5, 359.8, 14],     # x0, y0, x1, y1, bottom corner radius
    'echinus': [494.5, 373.8, 696.5, 399.3],
    'bars': [[535.56, 507.5], [582.51, 460.5], [629.82, 413.5]],   # x0, top y
    'barW': 26.77, 'barR': 13.4,                      # width, top-left corner radius
    'ring': 208,                                      # radius of the gap the disc cuts into the "15"
}

img = Image.open(LOGO).convert('RGBA')
a = np.array(img)
al = a[..., 3]
H, W = al.shape
yy, xx = np.mgrid[0:H, 0:W]
disc_d = np.hypot(xx - MARK['cx'], yy - MARK['cy'])


def components(mask):
    lab = np.zeros(mask.shape, np.int32)
    out = []
    n = 0
    ys, xs = np.nonzero(mask)
    for y0, x0 in zip(ys, xs):
        if lab[y0, x0]:
            continue
        n += 1
        q = deque([(y0, x0)])
        lab[y0, x0] = n
        px = []
        while q:
            y, x = q.popleft()
            px.append((y, x))
            for dy in (-1, 0, 1):
                for dx in (-1, 0, 1):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < H and 0 <= nx < W and mask[ny, nx] and not lab[ny, nx]:
                        lab[ny, nx] = n
                        q.append((ny, nx))
        py = [p[0] for p in px]
        pxx = [p[1] for p in px]
        out.append({'id': n, 'x0': min(pxx), 'y0': min(py), 'x1': max(pxx), 'y1': max(py)})
    return lab, out


# faint antialiasing pixels are part of their letter, so label on a low threshold
solid = al > 8
# everything that is not the round mark
not_disc = disc_d > MARK['r'] + 5
lab, comps = components(solid & not_disc)

# glyph boxes in logo pixels: [name, char, x0, y0, x1, y1]; each takes the components whose centre falls in it
BOXES = [
    ('R', 'R', 830, 330, 941, 450), ('a', 'a', 942, 360, 1034, 450), ('n', 'n', 1040, 360, 1130, 450),
    ('k', 'k', 1135, 330, 1229, 450), ('i', 'i', 1229, 330, 1263, 450), ('n2', 'n', 1268, 360, 1358, 450),
    ('g', 'g', 1360, 360, 1455, 490),
    ('d', 'd', 830, 478, 895, 562), ('o', 'o', 896, 498, 959, 562), ('s', 's', 960, 498, 1010, 562),
    ('p', 'p', 1038, 498, 1102, 582), ('o2', 'o', 1103, 498, 1166, 562), ('l', 'l', 1168, 478, 1190, 562),
    ('ii', 'í', 1195, 478, 1220, 562), ('t', 't', 1220, 478, 1264, 562), ('i2', 'i', 1265, 478, 1287, 562),
    ('c', 'c', 1289, 498, 1342, 562), ('o3', 'o', 1343, 498, 1404, 562), ('s2', 's', 1405, 498, 1455, 562),
    ('15', '15', 278, 120, 552, 390),
    ('A', 'A', 512, 183, 550, 227), ('n3', 'n', 550, 190, 587, 227), ('o4', 'o', 587, 190, 619, 227),
    ('s3', 's', 619, 190, 650, 227),
]

glyphs = []
used = set()
for name, ch, bx0, by0, bx1, by1 in BOXES:
    ids = []
    for c in comps:
        cx = (c['x0'] + c['x1']) / 2
        cy = (c['y0'] + c['y1']) / 2
        if bx0 <= cx < bx1 and by0 <= cy < by1:
            ids.append(c['id'])
    if not ids:
        raise SystemExit(f'no components for glyph {name}')
    used.update(ids)
    m = np.isin(lab, ids)
    # grow by one pixel so antialiased fringes that did not pass the threshold come along
    g = m.copy()
    g[1:, :] |= m[:-1, :]
    g[:-1, :] |= m[1:, :]
    g[:, 1:] |= m[:, :-1]
    g[:, :-1] |= m[:, 1:]
    g &= not_disc
    ys, xs = np.nonzero(g)
    x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    glyphs.append({'name': name, 'ch': ch, 'x': int(x0), 'y': int(y0), 'w': int(x1 - x0), 'h': int(y1 - y0), 'mask': g})

missing = [c for c in comps if c['id'] not in used and (c['x1'] - c['x0']) * (c['y1'] - c['y0']) > 20]
if missing:
    raise SystemExit(f'components not assigned to any glyph: {missing}')

# pack into a single-row-ish atlas (shelf packing), 2 px padding
PAD = 2
AW = 1024
x = y = shelf = 0
for gl in sorted(glyphs, key=lambda g: -g['h']):
    if x + gl['w'] + PAD > AW:
        x = 0
        y += shelf + PAD
        shelf = 0
    gl['sx'], gl['sy'] = x, y
    x += gl['w'] + PAD
    shelf = max(shelf, gl['h'])
AH = y + shelf
atlas = np.zeros((AH, AW, 4), np.uint8)
for gl in glyphs:
    sub = a[gl['y']:gl['y'] + gl['h'], gl['x']:gl['x'] + gl['w']].copy()
    msk = gl['mask'][gl['y']:gl['y'] + gl['h'], gl['x']:gl['x'] + gl['w']]
    sub[..., :3] = 255
    sub[..., 3] = np.where(msk, sub[..., 3], 0)
    atlas[gl['sy']:gl['sy'] + gl['h'], gl['sx']:gl['sx'] + gl['w']] = sub
buf = io.BytesIO()
Image.fromarray(atlas).save(buf, 'PNG', optimize=True)
atlas_b64 = base64.b64encode(buf.getvalue()).decode()

# the lockup's bounding box (whole logo, mark included)
ys, xs = np.nonzero(al > 8)
bbox = [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)]

fonts = {}
for f in sorted(FONTS.glob('poppins-latin-*-normal.woff2')):
    weight = f.name.split('-')[2]
    fonts[weight] = base64.b64encode(f.read_bytes()).decode()

meta = [{k: g[k] for k in ('name', 'ch', 'x', 'y', 'w', 'h', 'sx', 'sy')} for g in glyphs]
js = [
    '// Generated by tools/embed_assets.py: do not edit by hand.',
    '// Poppins (SIL Open Font License, assets/fonts/OFL.txt) and the Ranking dos Políticos lockup,',
    '// cut into a sprite atlas of glyphs placed in the coordinates of the original logo.',
    f'const LOGO_BBOX = {json.dumps(bbox)};',
    f'const LOGO_MARK = {json.dumps(MARK)};',
    f'const LOGO_GLYPHS = {json.dumps(meta, separators=(",", ":"))};',
    f'const LOGO_ATLAS_SRC = "data:image/png;base64,{atlas_b64}";',
    'const FONT_SRC = {' + ','.join(f'"{w}":"data:font/woff2;base64,{b}"' for w, b in fonts.items()) + '};',
    '',
]
OUT.write_text('\n'.join(js), encoding='utf-8')
print(f'wrote {OUT.relative_to(ROOT)}: {len(glyphs)} glyphs, atlas {AW}x{AH} ({len(buf.getvalue()) / 1024:.1f} KB), '
      f'{len(fonts)} font weights, logo bbox {bbox}')
