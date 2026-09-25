// ============================================================
// Key-visual viewer: ?kv=N shows frame N (1-based); hooks for tools/keyvisuals.py.
// ============================================================
const cv = document.getElementById('reel');
cv.width = W; cv.height = H;
const SCN = document.createElement('canvas');
SCN.width = W; SCN.height = H;
const sctx = SCN.getContext('2d');

function renderKV(i, t) {
  const k = KV[i];
  sctx.setTransform(1, 0, 0, 1, 0, 0);
  sctx.globalAlpha = 1; sctx.globalCompositeOperation = 'source-over'; sctx.shadowBlur = 0;
  sctx.textAlign = 'left'; sctx.textBaseline = 'alphabetic';
  k.draw(sctx, t || 2.0);
  glUpload(SCN);
  glPost(false, postStill(k.dark, t || 2.0));
}

window.__kv = {
  ready: () => ASSETS.ready,
  count: () => KV.length,
  meta: () => KV.map(k => ({ id: k.id, time: k.time, say: k.say })),
  render: (i, t) => { renderKV(i, t); return cv.toDataURL('image/png'); },
};
glInit(cv);
loadAssets().then(() => {
  const q = new URLSearchParams(location.search);
  renderKV(Math.max(0, (parseInt(q.get('kv') || '1', 10) || 1) - 1), 2.0);
}).catch(e => console.error(e));
