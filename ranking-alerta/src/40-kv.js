// ============================================================
// Key visuals: the hero frame of each block of the voice-over. Each is a full composition;
// the animation will be built by moving into and out of these.
// ============================================================

// a crowd of politicians in rows receding into the fog. kind(i, row) -> 'human' | 'wolf' | 'lamb'
// o.fx(k, row, x, y, rr, kind) -> { a, dx, dy, glow } animates each figure (all optional)
function crowd(ctx, t, kind, o) {
  o = o || {};
  const rows = [];
  let y = o.front || 1560, s = o.s0 || 1.0;
  for (let r = 0; r < (o.rows || 7); r++) { rows.push({ y, s }); y -= 205 * s * 0.92; s *= 0.8; }
  const r = mulberry(o.seed || 3);
  let idx = 0;
  for (let ri = rows.length - 1; ri >= 0; ri--) {
    const { y, s } = rows[ri];
    const pitch = 236 * s, n = Math.ceil(W / pitch) + 2, x0 = W / 2 - (n - 1) * pitch / 2 + (ri % 2 ? pitch / 2 : 0);
    const fog = Math.pow(0.72, ri);
    for (let i = 0; i < n; i++) {
      const x = x0 + i * pitch + (r() - 0.5) * 18 * s, yy = y + (r() - 0.5) * 10 * s, v = Math.floor(r() * 5 + ri * 3 + i), rr = r();
      const k = kind(idx, ri, x, yy, rr);
      const f = o.fx ? o.fx(idx, ri, x, yy, rr, k) : null;
      idx++;
      if (f && f.a !== undefined && f.a <= 0.002) continue;
      const fx = x + ((f && f.dx) || 0), fy = yy + ((f && f.dy) || 0), gk = f && f.glow !== undefined ? f.glow : 1;
      const lw = Math.max(1.4, 3.2 * s);
      const bg = mix(D.void, D.ink, 0.5);
      const heat = (f && f.heat) || 0;
      ctx.save();
      ctx.globalAlpha *= (0.25 + 0.75 * fog) * (f && f.a !== undefined ? f.a : 1);
      if (k === 'human') {
        const sw = o.shadowWolves === true ? 1 : (o.shadowWolves || 0);
        if (sw > 0 && rr < 0.35 && ri < 3) {
          // the shadow on the wall gives it away
          ctx.save(); ctx.globalAlpha *= 0.55 * sw;
          fillAt(ctx, WOLF.head, fx + 26 * s, fy - 58 * s, s * 0.86, rgba(D.wine, 0.8));
          ctx.restore();
        }
      }
      const draw = (c, x, y) => {
        if (k === 'human') human(c, x, y, { s, lw, variant: v, color: mix(D.ash, D.bone, fog), bg });
        else if (k === 'wolf') wolf(c, x, y, { s, lw, variant: v, color: heat ? mix(mix(D.wine, D.red, fog), D.hot, heat) : mix(D.wine, D.red, fog), bg, eyeGlow: (12 + 14 * fog) * gk });
        else lamb(c, x, y, { s, lw, variant: v, color: D.lamb, bg, glow: 14 * fog * gk });
      };
      if (o.sprites && !heat && gk === 1) {
        const sp = figSprite(`${k}|${v % 15}|${s.toFixed(4)}|${fog.toFixed(4)}`, s, draw);
        ctx.drawImage(sp.c, fx - sp.ox, fy - sp.oy);
      } else draw(ctx, fx, fy);
      ctx.restore();
    }
  }
  // fog toward the back
  const g = ctx.createLinearGradient(0, rows[rows.length - 1].y - 200, 0, rows[2].y);
  g.addColorStop(0, rgba(D.void, 0.95)); g.addColorStop(1, rgba(D.void, 0));
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, rows[2].y);
}
// the live player draws each figure from a cached bitmap (same pixels, a fraction of the cost)
const SPRITES = new Map();
function figSprite(key, s, draw) {
  let sp = SPRITES.get(key);
  if (!sp) {
    const pad = 40, c = document.createElement('canvas');
    c.width = Math.ceil(300 * s + pad * 2); c.height = Math.ceil(350 * s + pad * 2);
    sp = { c, ox: c.width / 2, oy: pad + 155 * s };
    draw(c.getContext('2d'), sp.ox, sp.oy);
    SPRITES.set(key, sp);
  }
  return sp;
}
const isLamb = rr => rr > 0.8;          // about one in five
const CROWD = { front: 1640, s0: 1.15, rows: 7, seed: 3 };

// small label with lines either side
function kicker(ctx, text, y, color, size) {
  ctx.save();
  ctx.font = FONT(700, size || 30); ctx.textAlign = 'center'; ctx.fillStyle = color;
  const L = layoutLine(ctx, text, 700, size || 30, 6);
  const x0 = W / 2 - L.w / 2;
  for (let i = 0; i < text.length; i++) ctx.fillText(text[i], x0 + L.xs[i] + L.ws[i] / 2, y);
  ctx.fillStyle = color; ctx.globalAlpha *= 0.7;
  ctx.fillRect(x0 - 110, y - 11, 80, 3); ctx.fillRect(x0 + L.w + 30, y - 11, 80, 3);
  ctx.restore();
}
function tag(ctx, text, x, y, fill, color, size, align) {
  ctx.save();
  ctx.font = FONT(800, size || 30);
  const w = ctx.measureText(text).width + (size || 30) * 1.2, h = (size || 30) * 1.7;
  const x0 = align === 'left' ? x : align === 'right' ? x - w : x - w / 2;
  ctx.fillStyle = fill; rrect(ctx, x0, y - h / 2, w, h, h / 2); ctx.fill();
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x0 + w / 2, y + 2);
  ctx.restore();
  return w;
}

const KV = [
  // 1 ------------------------------------------------------------ the call
  { id: 'chamado', time: '0:00 – 0:10', dark: true,
    say: '"Isso é um chamado ao povo brasileiro: dia 4 de outubro, não vá votar... Não sem antes assistir a este alerta."',
    draw(ctx, t) {
      bgDark(ctx, 950, 0.6);
      smoke(ctx, t, 1, 5);
      eyesField(ctx, t, 12, 11, 1, [60, 560, 1020, 1400], 0.45, 0.95);
      ctx.save(); ctx.globalAlpha = 0.85;
      flagLine(ctx, 540, 960, 0.98, D.red, 4, 18, 0.9);
      crack(ctx, 180, 520, 760, 1480, 3, D.void, 12, D.hot);
      crack(ctx, 900, 640, 330, 1300, 8, D.void, 10, D.hot);
      ctx.restore();
      // darkness behind the words
      const g = ctx.createRadialGradient(540, 1000, 0, 540, 1000, 560);
      g.addColorStop(0, 'rgba(5,2,3,0.85)'); g.addColorStop(1, 'rgba(5,2,3,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 400, W, 1200);
      kicker(ctx, 'UM CHAMADO AO POVO BRASILEIRO', 640, D.bone, 30);
      tag(ctx, 'DIA 4 DE OUTUBRO', 540, 760, D.red, '#fff', 40);
      headline(ctx, ['NÃO VÁ', 'VOTAR.'], 1010, 250, { color: '#FFF4EE', echo: D.red, lh: 0.9 });
      ctx.save(); ctx.font = FONT(600, 44); ctx.textAlign = 'center'; ctx.fillStyle = D.ash;
      ctx.fillText('não sem antes assistir a este alerta.', 540, 1330); ctx.restore();
      alertUI(ctx, t);
    } },
  // 2 ------------------------------------------------------------ everybody watches the stage
  { id: 'palco', time: '0:10 – 0:13', dark: true,
    say: '"Todo mundo só fala da eleição pra presidente."',
    draw(ctx, t) {
      bgDark(ctx, 1200, 0.35);
      eyesField(ctx, t, 12, 21, 1, [230, 250, 850, 1650], 0.5, 1.0);
      // the spotlight
      const cone = ctx.createLinearGradient(0, 0, 0, 1500);
      cone.addColorStop(0, 'rgba(255,236,220,0.30)'); cone.addColorStop(1, 'rgba(255,236,220,0.05)');
      ctx.fillStyle = cone;
      ctx.beginPath(); ctx.moveTo(470, 0); ctx.lineTo(610, 0); ctx.lineTo(860, 1500); ctx.lineTo(220, 1500); ctx.closePath(); ctx.fill();
      const pool = ctx.createRadialGradient(540, 1500, 0, 540, 1500, 380);
      pool.addColorStop(0, 'rgba(255,236,220,0.28)'); pool.addColorStop(1, 'rgba(255,236,220,0)');
      ctx.fillStyle = pool; ctx.fillRect(100, 1300, 880, 400);
      human(ctx, 540, 930, { s: 1.55, lw: 4, variant: 1, color: D.bone, bg: '#1E0A0C', sash: true });
      podium(ctx, 540, 1180, 0.95, D.bone, 4, -40);
      // the crowd filming
      [[150, 1700, -0.35], [300, 1760, -0.2], [440, 1720, -0.08], [640, 1740, 0.08], [790, 1705, 0.2], [940, 1760, 0.35]].forEach(([x, y, r], i) =>
        phone(ctx, x, y, 0.95, r, D.bone, 3));
      headline(ctx, ['TODOS OS OLHOS', { t: 'NO PRESIDENTE.', c: D.bone, box: D.red }], 390, 118, { color: D.bone });
      ctx.save(); ctx.font = FONT(600, 40); ctx.textAlign = 'center'; ctx.fillStyle = D.hot;
      ctx.shadowColor = D.hot; ctx.shadowBlur = 20;
      ctx.fillText('enquanto isso, no escuro...', 540, 640); ctx.restore();
      alertUI(ctx, t, { ticker: false });
    } },
  // 3 ------------------------------------------------------------ who decides your life
  { id: 'congresso', time: '0:13 – 0:25', dark: true,
    say: '"Mas é o deputado e o senador que decidem o imposto no seu salário, o remédio que falta no posto de saúde, a lei que garante — ou tira — o seu direito amanhã."',
    draw(ctx, t) {
      bgDark(ctx, 760, 0.55);
      smoke(ctx, t, 0.8, 9, 300, 1100);
      // the wolf looming over Brasília
      ctx.save(); ctx.globalAlpha = 0.22;
      strokeAt(ctx, WOLF.head, 540, 700, 4.1, 5, D.red, 30);
      strokeAt(ctx, WOLF.detail, 540, 700, 4.1, 4, D.red, 0);
      ctx.restore();
      fillAt(ctx, WOLF.eyeL, 540, 700, 4.1, D.hot, 60); fillAt(ctx, WOLF.eyeR, 540, 700, 4.1, D.hot, 60);
      ctx.save(); ctx.globalAlpha = 0.9; fillAt(ctx, WOLF.eyeL, 540, 700, 2.3, '#FFD6D0'); fillAt(ctx, WOLF.eyeR, 540, 700, 2.3, '#FFD6D0'); ctx.restore();
      congressLine(ctx, 540, 1110, 0.8, D.bone, 3.5, 10);
      headline(ctx, [{ t: 'DEPUTADOS E SENADORES', c: '#fff', box: D.red, s: 62 }], 300, 62, {});
      headline(ctx, ['DECIDEM A SUA VIDA.'], 430, 104, { color: D.bone });
      // what the claws reach
      const tiles = [['IMPOSTO NO', 'SEU SALÁRIO', iconPayslip], ['REMÉDIO QUE', 'FALTA NO POSTO', iconMedicine], ['O SEU', 'DIREITO', iconLaw]];
      tiles.forEach(([a, b, icon], i) => {
        const x = 60 + i * 330, y = 1190, w = 300, h = 380;
        ctx.save();
        ctx.fillStyle = rgba(D.ink, 0.92); rrect(ctx, x, y, w, h, 22); ctx.fill();
        ctx.strokeStyle = rgba(D.red, 0.8); ctx.lineWidth = 3; ctx.stroke();
        icon(ctx, x + w / 2, y + 140, 0.85, D.bone, 4);
        claws(ctx, x + w / 2 + 6, y + 140, 0.72, 0.35, D.hot, 0.95);
        ctx.font = FONT(800, 28); ctx.textAlign = 'center'; ctx.fillStyle = D.bone;
        ctx.fillText(a, x + w / 2, y + 300); ctx.fillStyle = D.hot; ctx.fillText(b, x + w / 2, y + 340);
        ctx.restore();
      });
      alertUI(ctx, t);
    } },
  // 4 ------------------------------------------------------------ hundreds of smiles
  { id: 'sorrisos', time: '0:25 – 0:32', dark: true,
    say: '"São centenas de nomes, centenas de sorrisos, jurando que vão trabalhar pelo povo."',
    draw(ctx, t) {
      bgDark(ctx, 1100, 0.5);
      crowd(ctx, t, () => 'human', Object.assign({ shadowWolves: true }, CROWD));
      headline(ctx, ['CENTENAS', 'DE SORRISOS.'], 380, 150, { color: D.bone, lh: 0.92 });
      ctx.save(); ctx.font = FONT(600, 40); ctx.textAlign = 'center'; ctx.fillStyle = D.ash;
      ctx.fillText('todos jurando trabalhar pelo povo.', 540, 590); ctx.restore();
      alertUI(ctx, t);
    } },
  // 5 ------------------------------------------------------------ the masks come off
  { id: 'mascaras', time: '0:32 – 0:38', dark: true,
    say: '"Mas quem votou a favor do cidadão? E quem só votou a favor de si mesmo?"',
    draw(ctx, t) {
      bgDark(ctx, 1200, 0.55);
      const sx = 560;
      // left of the scan: the smile they show; right: who they are
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, sx, H); ctx.clip();
      crowd(ctx, t, () => 'human', CROWD);
      ctx.restore();
      ctx.save(); ctx.beginPath(); ctx.rect(sx, 0, W - sx, H); ctx.clip();
      bgDark(ctx, 1200, 0.7);
      crowd(ctx, t, (i, ri, x, y, rr) => (isLamb(rr) ? 'lamb' : 'wolf'), CROWD);
      ctx.restore();
      // the scan beam
      const beam = ctx.createLinearGradient(sx - 120, 0, sx + 120, 0);
      beam.addColorStop(0, 'rgba(255,48,64,0)'); beam.addColorStop(0.5, 'rgba(255,48,64,0.32)'); beam.addColorStop(1, 'rgba(255,48,64,0)');
      ctx.fillStyle = beam; ctx.fillRect(sx - 120, 700, 240, H - 700);
      ctx.save(); ctx.shadowColor = D.hot; ctx.shadowBlur = 34; ctx.fillStyle = '#FFE3E0'; ctx.fillRect(sx - 2, 700, 4, H - 700); ctx.restore();
      // copy
      const g = ctx.createLinearGradient(0, 180, 0, 860); g.addColorStop(0, 'rgba(5,2,3,0.96)'); g.addColorStop(0.8, 'rgba(5,2,3,0.7)'); g.addColorStop(1, 'rgba(5,2,3,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 180, W, 680);
      headline(ctx, [{ t: 'LOBOS', c: D.hot }, 'EM PELE', 'DE CORDEIRO.'], 350, 140, { color: '#FFF4EE', lh: 0.93 });
      ctx.save(); ctx.font = FONT(800, 30); ctx.textAlign = 'center';
      ctx.fillStyle = D.bone; ctx.fillText('O QUE ELES MOSTRAM', sx / 2, 790);
      ctx.fillStyle = D.hot; ctx.fillText('QUEM ELES SÃO', sx + (W - sx) / 2, 790);
      ctx.restore();
      tag(ctx, '● CORDEIRO: A FAVOR DO CIDADÃO', W - 60, 1730, 'rgba(10,40,24,0.94)', D.lamb, 24, 'right');
      tag(ctx, '● LOBO: A FAVOR DE SI MESMO', W - 60, 1800, 'rgba(60,8,12,0.94)', D.hot, 24, 'right');
      alertUI(ctx, t, { ticker: false });
    } },
  // 6 ------------------------------------------------------------ the turn: the Ranking is the light
  { id: 'virada', time: '0:38 – 0:41', dark: false,
    say: '"É pra isso que o Ranking dos Políticos existe."',
    draw(ctx, t) {
      // the dark crowd, under the brand's sky; inside the light cone, the truth
      const mx = 540, my = 470, R = 150;
      const coneP = () => { ctx.beginPath(); ctx.moveTo(mx - 120, my + 60); ctx.lineTo(mx + 120, my + 60); ctx.lineTo(W + 160, H); ctx.lineTo(-160, H); ctx.closePath(); };
      const crowd6 = Object.assign({}, CROWD, { seed: 7 });
      bgDark(ctx, 1500, 0.4);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.moveTo(mx - 120, my + 60); ctx.lineTo(-160, H); ctx.lineTo(W + 160, H); ctx.lineTo(mx + 120, my + 60); ctx.closePath();
      ctx.clip('evenodd');
      crowd(ctx, t, () => 'human', crowd6);
      ctx.restore();
      ctx.save();
      coneP(); ctx.clip();
      bgDark(ctx, 1500, 0.55);
      const lg = ctx.createLinearGradient(0, my, 0, H);
      lg.addColorStop(0, 'rgba(255,226,120,0.5)'); lg.addColorStop(1, 'rgba(255,226,120,0.12)');
      ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
      crowd(ctx, t, (i, ri, x, y, rr) => (isLamb(rr) ? 'lamb' : 'wolf'), crowd6);
      ctx.restore();
      // brand sky fading down into the dark
      const sky = ctx.createLinearGradient(0, 0, 0, 1180);
      sky.addColorStop(0, C.ink); sky.addColorStop(0.62, C.navy); sky.addColorStop(1, 'rgba(11,20,64,0)');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, 1180);
      ctx.save(); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.rect(0, 0, W, 860); ctx.clip(); dotGrid(ctx, t, 0.08); ctx.restore();
      // the beam again, over the sky, so the light reads as coming from the mark
      ctx.save(); coneP(); ctx.clip();
      const lg2 = ctx.createLinearGradient(0, my, 0, 1180);
      lg2.addColorStop(0, 'rgba(255,226,120,0.5)'); lg2.addColorStop(1, 'rgba(255,226,120,0)');
      ctx.fillStyle = lg2; ctx.fillRect(0, my, W, 1180 - my);
      ctx.restore();
      // the mark as a lamp
      const halo = ctx.createRadialGradient(mx, my, 0, mx, my, 420);
      halo.addColorStop(0, 'rgba(255,226,120,0.55)'); halo.addColorStop(1, 'rgba(255,226,120,0)');
      ctx.fillStyle = halo; ctx.fillRect(mx - 420, my - 420, 840, 840);
      drawMark(ctx, mx, my, R / LOGO_MARK.r, '#fff');
      headline(ctx, ['É PRA ISSO QUE O RANKING', 'DOS POLÍTICOS EXISTE:'], 170 + 60, 64, { color: '#fff', weight: 800 });
      headline(ctx, [{ t: 'SEPARAR LOBOS', c: C.ink, box: C.yellow }], 760, 96, { weight: 900 });
      headline(ctx, ['DE CORDEIROS.'], 880, 96, { color: '#fff' });
    } },
  // 7 ------------------------------------------------------------ the method: a score from 0 to 10
  { id: 'nota', time: '0:41 – 0:53', dark: false,
    say: '"Cruzamos presença, votação, gasto público e processo na Justiça — e entregamos uma nota: de zero a dez. Sem discurso. Só histórico."',
    draw(ctx, t) {
      bgNavy(ctx, 1000, 0.3);
      dotGrid(ctx, t, 0.07);
      headline(ctx, ['SEM DISCURSO.', { t: 'SÓ HISTÓRICO.', c: C.yellow }], 330, 120, { color: '#fff' });
      const crit = ['Presença', 'Votações', 'Gasto público', 'Processos'];
      const card = (x, y, who, note, col, vals, rot) => {
        ctx.save();
        ctx.translate(x, y); ctx.rotate(rot);
        ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 60; ctx.shadowOffsetY = 26;
        ctx.fillStyle = C.paper; rrect(ctx, -430, -250, 860, 500, 36); ctx.fill();
        ctx.shadowColor = 'transparent';
        // avatar
        ctx.fillStyle = C.navy; ctx.beginPath(); ctx.arc(-300, -90, 100, 0, TAU); ctx.fill();
        ctx.save(); ctx.beginPath(); ctx.arc(-300, -90, 100, 0, TAU); ctx.clip();
        (who === 'lamb' ? lamb : wolf)(ctx, -300, -70, { s: 0.62, lw: 3, variant: who === 'lamb' ? 3 : 0, color: col });
        ctx.restore();
        ctx.fillStyle = C.text; rrect(ctx, -170, -160, 260, 26, 13); ctx.fill();
        ctx.fillStyle = C.line; rrect(ctx, -170, -116, 150, 20, 10); ctx.fill();
        // the score
        ctx.textAlign = 'right'; ctx.fillStyle = col; ctx.font = FONT(900, 150);
        ctx.fillText(note, 390, -40);
        ctx.font = FONT(700, 28); ctx.fillStyle = '#8A93B8'; ctx.fillText('NOTA  0 – 10', 390, 0);
        ctx.textAlign = 'left';
        // criteria
        crit.forEach((c, i) => {
          const yy = 70 + i * 44;
          ctx.font = FONT(600, 26); ctx.fillStyle = C.text; ctx.fillText(c, -370, yy + 9);
          rrect(ctx, -110, yy - 8, 480, 16, 8); ctx.fillStyle = '#E4E9F6'; ctx.fill();
          rrect(ctx, -110, yy - 8, 480 * vals[i], 16, 8); ctx.fillStyle = vals[i] > 0.55 ? C.green : vals[i] > 0.35 ? C.yellow : C.red; ctx.fill();
        });
        ctx.restore();
      };
      card(540, 1330, 'wolf', '2,1', C.red, [0.28, 0.22, 0.15, 0.1], 0.03);
      card(540, 830, 'lamb', '8,7', C.green, [0.92, 0.84, 0.8, 0.95], -0.025);
      // criteria chips
      ['PRESENÇA', 'VOTAÇÃO', 'GASTO PÚBLICO', 'PROCESSOS'].forEach((c, i) => {
        const x = [200, 880, 230, 860][i], y = [560, 540, 1640, 1660][i];
        tag(ctx, c, x, y, i % 2 ? C.blue : C.yellow, i % 2 ? '#fff' : C.text, 28);
      });
      drawLockup(ctx, 350, 1750, 0.32, 0.9, true);
    } },
  // 8 ------------------------------------------------------------ two minutes, four years
  { id: 'tempo', time: '0:53 – 0:59', dark: false,
    say: '"Consulte antes de votar. Dois minutos que decidem os próximos quatro anos."',
    draw(ctx, t) {
      bgNavy(ctx, 900, 0.32);
      dotGrid(ctx, t, 0.07);
      kicker(ctx, 'CONSULTE ANTES DE VOTAR', 300, C.yellow, 32);
      // stopwatch
      const cx = 540, cy = 640, R = 210;
      ctx.save();
      ctx.strokeStyle = C.navy2; ctx.lineWidth = 26; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke();
      ctx.shadowColor = C.yellow; ctx.shadowBlur = 30; ctx.strokeStyle = C.yellow; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + TAU * 0.999); ctx.stroke();
      ctx.shadowBlur = 0; ctx.fillStyle = C.navy2;
      rrect(ctx, cx - 20, cy - R - 60, 40, 36, 8); ctx.fill(); rrect(ctx, cx - 40, cy - R - 72, 80, 18, 9); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = FONT(900, 190); ctx.fillText('2', cx, cy + 50);
      ctx.font = FONT(700, 34); ctx.fillStyle = C.mute; ctx.fillText('MINUTOS', cx, cy + 110);
      ctx.restore();
      // arrow
      ctx.save(); ctx.strokeStyle = C.yellow; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(540, 910); ctx.lineTo(540, 1010); ctx.moveTo(505, 975); ctx.lineTo(540, 1010); ctx.lineTo(575, 975); ctx.stroke(); ctx.restore();
      // four years, each with a lamb looking after it
      ['2027', '2028', '2029', '2030'].forEach((yv, i) => {
        const x = 70 + i * 240, y = 1060, w = 220, h = 300;
        ctx.save();
        ctx.fillStyle = C.paper; rrect(ctx, x, y, w, h, 24); ctx.fill();
        ctx.fillStyle = C.yellow; rrect(ctx, x, y, w, 60, 24); ctx.fill(); ctx.fillRect(x, y + 30, w, 30);
        ctx.fillStyle = C.text; ctx.font = FONT(800, 34); ctx.textAlign = 'center'; ctx.fillText(yv, x + w / 2, y + 44);
        lamb(ctx, x + w / 2, y + 205, { s: 0.52, lw: 3, body: false, color: C.green });
        ctx.restore();
      });
      headline(ctx, ['DOIS MINUTOS', { t: 'DECIDEM QUATRO ANOS.', c: C.yellow }], 1520, 96, { color: '#fff' });
      drawLockup(ctx, 350, 1750, 0.32, 0.9, true);
    } },
  // 9 ------------------------------------------------------------ share the alert
  { id: 'compartilhe', time: '0:59 – 1:05', dark: false,
    say: '"Compartilha esse alerta. Pode ser o vídeo mais importante antes do dia quatro."',
    draw(ctx, t) {
      bgNavy(ctx, 820, 0.35);
      dotGrid(ctx, t, 0.06);
      tag(ctx, 'ELEIÇÕES 2026  •  4 DE OUTUBRO', 540, 330, rgba(C.yellow, 0.14), C.yellow, 30);
      const lk = 0.78, lw = (LOGO_BBOX[2] - LOGO_BBOX[0]) * lk;
      drawLockup(ctx, (W - lw) / 2, 520, lk, 1, false);
      // share
      ctx.save();
      const sx = 540, sy = 1120;
      ctx.fillStyle = C.yellow; rrect(ctx, 140, sy - 70, 800, 140, 70); ctx.fill();
      ctx.fillStyle = C.text; ctx.font = FONT(900, 50); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('COMPARTILHE O ALERTA', sx + 40, sy + 3);
      // share glyph
      ctx.strokeStyle = C.text; ctx.fillStyle = C.text; ctx.lineWidth = 7;
      const gx = 215, gy = sy;
      ctx.beginPath(); ctx.moveTo(gx - 18, gy); ctx.lineTo(gx + 18, gy - 20); ctx.moveTo(gx - 18, gy); ctx.lineTo(gx + 18, gy + 20); ctx.stroke();
      for (const [px, py] of [[gx - 18, gy], [gx + 18, gy - 20], [gx + 18, gy + 20]]) { ctx.beginPath(); ctx.arc(px, py, 10, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.save(); ctx.font = FONT(800, 60); ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.fillText('ranking.org.br', 540, 1330); ctx.restore();
      ctx.save(); ctx.font = FONT(500, 38); ctx.textAlign = 'center'; ctx.fillStyle = C.mute; ctx.fillText('Consulte antes de votar.', 540, 1400); ctx.restore();
      // the flock, safe
      for (let i = 0; i < 7; i++) lamb(ctx, 110 + i * 143, 1610 + (i % 2) * 18, { s: 0.42, lw: 2.6, body: false, color: C.green, a: 0.85 });
    } },
];
