// usage: node render_gfx.mjs <gfxspec.json> <outDir> [frame,frame,...]
// Renders the "behind" and "front" layers of a spec to transparent PNGs (<outDir>/<layer>/NNNNN.png).
import { createRequire } from 'module';
import { execSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const cache = process.env.VE_CACHE || path.join(os.homedir(), '.cache', 'video-editor');
const pw = [process.env.PLAYWRIGHT_MODULE, path.join(cache, 'node', 'node_modules', 'playwright'),
  (() => { try { return path.join(execSync('npm root -g').toString().trim(), 'playwright'); } catch { return null; } })()]
  .find((c) => c && fs.existsSync(c));
const { chromium } = require(pw);
const here = path.dirname(fileURLToPath(import.meta.url));
const [specPath, outDir, only] = process.argv.slice(2);
const spec = fs.readFileSync(specPath, 'utf8');
const nOut = JSON.parse(spec).tv.length;
const frames = only ? only.split(',').map(Number) : [...Array(nOut).keys()];
const layers = ['behind', 'front'];
for (const l of layers) fs.mkdirSync(path.join(outDir, l), { recursive: true });

const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text', '--allow-file-access-from-files'] });
let done = 0;
await Promise.all(layers.map(async (layer) => {
  const { w, h } = JSON.parse(spec).base;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  page.on('pageerror', (e) => { console.error('page error', e); process.exit(1); });
  await page.addInitScript(`window.SPEC = ${spec};`);
  await page.goto('file://' + path.join(here, 'page.html'));
  await page.evaluate(() => window.ready);
  const canvas = await page.$('#out');
  for (const i of frames) {
    const file = path.join(outDir, layer, String(i).padStart(5, '0') + '.png');
    const any = await page.evaluate(([i, layer]) => window.renderFrame(i, layer), [i, layer]);
    if (any) await canvas.screenshot({ path: file, omitBackground: true });
    else if (fs.existsSync(file)) fs.unlinkSync(file);
    if (++done % 100 === 0) console.log(`gfx ${done}/${frames.length * layers.length}`);
  }
}));
await browser.close();
