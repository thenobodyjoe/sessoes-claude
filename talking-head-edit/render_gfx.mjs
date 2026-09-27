// Renders the motion-graphics layers to transparent PNG sequences.
// usage: node render_gfx.mjs [frame,frame,...]   (default: every output frame)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || '/opt/node22/lib/node_modules/playwright');
const here = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(here, 'work', 'gfx');

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
const layers = ['behind', 'front'];
const pages = await Promise.all(layers.map(async () => {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', (e) => { console.error('page error', e); process.exit(1); });
  await p.goto('file://' + path.join(here, 'graphics', 'index.html'));
  await p.evaluate(() => window.ready);
  return p;
}));
const nOut = await pages[0].evaluate(() => window.TL.nOut);
const frames = process.argv[2] ? process.argv[2].split(',').map(Number) : [...Array(nOut).keys()];
for (const l of layers) fs.mkdirSync(path.join(outDir, l), { recursive: true });

let done = 0;
await Promise.all(layers.map(async (layer, li) => {
  const page = pages[li];
  const canvas = await page.$('#out');
  for (const i of frames) {
    const file = path.join(outDir, layer, String(i).padStart(5, '0') + '.png');
    const any = await page.evaluate(([i, layer]) => window.renderFrame(i, layer), [i, layer]);
    if (any) await canvas.screenshot({ path: file, omitBackground: true });
    else if (fs.existsSync(file)) fs.unlinkSync(file);
    if (++done % 200 === 0) console.log(`${done}/${frames.length * layers.length}`);
  }
}));
await browser.close();
