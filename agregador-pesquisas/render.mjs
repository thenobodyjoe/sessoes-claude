// Renders index.html to PNG at 1200x628 (1x) and 2400x1256 (@2x).
// Usage: node render.mjs   (uses the globally installed Playwright)
import { createRequire } from "node:module";
import { execSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require("playwright"); }
catch { playwright = require(path.join(execSync("npm root -g").toString().trim(), "playwright")); }

const dir = path.dirname(fileURLToPath(import.meta.url));
const url = pathToFileURL(path.join(dir, "index.html")).href;

const browser = await playwright.chromium.launch();
for (const [scale, out] of [[1, "agregador-pesquisas.png"], [2, "agregador-pesquisas@2x.png"]]) {
  const page = await browser.newPage({ viewport: { width: 1200, height: 628 }, deviceScaleFactor: scale });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  await page.locator("#card").screenshot({ path: path.join(dir, out) });
  console.log("wrote", out);
  await page.close();
}
await browser.close();
