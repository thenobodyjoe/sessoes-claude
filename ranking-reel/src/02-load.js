// ============================================================
// Fonts and the logo atlas. Nothing renders until both are decoded, so the very first frame is
// already set in Poppins (a font swap mid-render would show up as a jump in the video).
// ============================================================
const ASSETS = { ready: false, atlas: null, glyph: {} };

async function loadAssets() {
  const faces = Object.keys(FONT_SRC).map(w => new FontFace('Poppins', `url(${FONT_SRC[w]})`, { weight: w, style: 'normal' }));
  await Promise.all(faces.map(f => f.load().then(ff => document.fonts.add(ff))));
  const img = new Image();
  img.src = LOGO_ATLAS_SRC;
  await img.decode();
  ASSETS.atlas = img;
  for (const g of LOGO_GLYPHS) ASSETS.glyph[g.name] = g;
  // touch every weight once so the rasteriser has them before frame 0
  const c = document.createElement('canvas').getContext('2d');
  for (const w of Object.keys(FONT_SRC)) { c.font = `${w} 40px Poppins`; c.fillText('ÁÉÍÓÚÃÕÇ Ranking 0123456789', 0, 40); }
  ASSETS.ready = true;
}

const FONT = (w, s) => `${w} ${s}px Poppins`;
