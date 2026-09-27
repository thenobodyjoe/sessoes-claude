// Studio web app: home -> processing -> editor -> briefing -> render -> done.
const $ = (s, el = document) => el.querySelector(s);
const api = async (path, opts = {}) => {
  const r = await fetch(path, { headers: opts.body && !(opts.body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}, ...opts });
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.statusText);
  return r.json();
};
const fmt = (t) => { t = Math.max(0, t); const m = Math.floor(t / 60); return `${String(m).padStart(2, '0')}:${(t - m * 60).toFixed(1).padStart(4, '0')}`; };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.h); toast.h = setTimeout(() => (t.hidden = true), ms); }

const KINDS = {
  prompt: { label: 'Prompt', icon: '✦', color: 'var(--k-prompt)' },
  image: { label: 'Imagem', icon: '◧', color: 'var(--k-image)' },
  sfx: { label: 'Efeito sonoro', icon: '◉', color: 'var(--k-sfx)' },
  music: { label: 'Música', icon: '♪', color: 'var(--k-music)' },
  text: { label: 'Texto na tela', icon: 'T', color: 'var(--k-text)' },
  zoom: { label: 'Zoom', icon: '⤢', color: 'var(--k-zoom)' },
};
const STEPS = {
  analysis: [['probe', 'Lendo o vídeo'], ['thumbs', 'Criando a linha do tempo'], ['listen', 'Ouvindo cada palavra'], ['see', 'Entendendo o enquadramento']],
  briefing: [['think', 'Lendo suas instruções'], ['plan', 'Montando o plano'], ['questions', 'Separando o que ficou em aberto']],
  render: [['spec', 'Desenhando a edição'], ['gfx', 'Animando os letreiros'], ['audio', 'Compondo o som'], ['comp', 'Compondo cada quadro'], ['deliver', 'Finalizando']],
};
const TITLES = { analysis: 'Preparando seu vídeo', briefing: 'Pensando na sua edição', render: 'Editando seu vídeo' };
const SUGGEST = ['Estilo premium de masterclass', 'Letreiros em português', 'Legendas dinâmicas', 'Corta pausas e vícios de fala', 'Trilha cinematográfica de fundo', 'Mais energia, cortes rápidos', 'Minimalista e elegante'];

let proj = null, pollT = null;

// ---------------- routing ----------------
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('on', s.id === id)); }
async function route() {
  clearTimeout(pollT);
  const m = location.hash.match(/^#\/p\/([a-f0-9]{12})/);
  if (!m) { proj = null; return home(); }
  try { proj = await api(`/api/projects/${m[1]}`); } catch { location.hash = '#/'; return; }
  render();
}
window.addEventListener('hashchange', route);

function render() {
  const job = proj.job || {};
  if (job.error) return processing(job);
  if (!job.done && job.name) return processing(job);
  if (proj.stage === 'briefing') return briefing();
  if (proj.stage === 'done') return done();
  return editor();
}
function poll() {
  pollT = setTimeout(async () => {
    try { proj = await api(`/api/projects/${proj.id}`); } catch { return poll(); }
    render();
  }, 900);
}

// ---------------- home ----------------
async function home() {
  show('home');
  const list = await api('/api/projects').catch(() => []);
  $('#recent').innerHTML = list.length ? '<h3>Continuar</h3>' + list.map((p) => `
    <div class="recent-item" data-id="${p.id}">
      <div class="thumb" style="background-image:url(/files/${p.id}/work/thumbs.jpg)"></div>
      <div class="meta"><div class="n">${esc(p.name)}</div><div class="s">${stageLabel(p.stage)} · ${new Date((p.updated || 0) * 1000).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</div></div>
    </div>`).join('') : '';
  document.querySelectorAll('.recent-item').forEach((el) => (el.onclick = () => (location.hash = `#/p/${el.dataset.id}`)));
}
const stageLabel = (s) => ({ analysis: 'Analisando', edit: 'Editando', briefing: 'Briefing', rendering: 'Renderizando', done: 'Pronto' }[s] || s);

function upload(file) {
  if (!file || !file.type.startsWith('video')) return toast('Escolha um arquivo de vídeo');
  const fd = new FormData(); fd.append('file', file);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/api/projects');
  xhr.upload.onprogress = (e) => ($('.drop-progress i').style.width = `${(e.loaded / e.total) * 100}%`);
  xhr.onload = () => { const r = JSON.parse(xhr.responseText); if (r.id) location.hash = `#/p/${r.id}`; else toast('Falha no envio'); };
  xhr.onerror = () => toast('Falha no envio');
  xhr.send(fd);
  $('.drop-title').textContent = 'Enviando…';
}
const drop = $('#drop');
$('#file').onchange = (e) => upload(e.target.files[0]);
['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add('over'); }));
['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove('over'); }));
drop.addEventListener('drop', (e) => upload(e.dataTransfer.files[0]));

// ---------------- processing ----------------
function processing(job) {
  show('processing');
  const steps = STEPS[job.name] || [];
  $('#proc-title').textContent = job.error ? 'Algo deu errado' : TITLES[job.name] || 'Processando';
  $('#proc-msg').textContent = job.error ? '' : job.message || '';
  const idx = steps.findIndex(([k]) => k === job.stage);
  $('#proc-steps').innerHTML = steps.map(([k, l], i) => `<li class="${i < idx || job.done ? 'ok' : i === idx ? 'now' : ''}"><span class="c"></span>${l}</li>`).join('');
  $('#proc-bar').style.width = `${Math.round((job.progress || 0) * 100)}%`;
  const err = $('#proc-error');
  err.hidden = !job.error;
  if (job.error) {
    err.innerHTML = `${esc(job.message)}<br><br><button class="secondary" id="retry">Voltar ao editor</button>`;
    $('#retry').onclick = async () => { proj = await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ clear_job: true, stage: 'edit' }) }); editor(); };
    return;
  }
  poll();
}

// ---------------- editor ----------------
const video = $('#video');
let pps = 60, sel = null, dragging = null, saveT = null, built = null;

function editor() {
  show('editor');
  $('#proj-name').value = proj.name;
  $('#global').value = proj.global_prompt || '';
  if (built !== proj.id) buildTimeline();
  renderIntents();
}
function saveSoon() {
  $('#save-state').textContent = 'Salvando…';
  clearTimeout(saveT);
  saveT = setTimeout(async () => {
    await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ name: proj.name, global_prompt: proj.global_prompt, intents: proj.intents, answers: proj.answers }) });
    $('#save-state').textContent = 'Salvo';
  }, 500);
}
$('#proj-name').oninput = (e) => { proj.name = e.target.value; saveSoon(); };
$('#global').oninput = (e) => { proj.global_prompt = e.target.value; saveSoon(); };
$('#suggest').innerHTML = SUGGEST.map((s) => `<button class="chip">${s}</button>`).join('');
$('#suggest').onclick = (e) => {
  if (!e.target.classList.contains('chip')) return;
  const g = $('#global'); g.value = (g.value.trim() ? g.value.trim().replace(/[.]?$/, '. ') : '') + e.target.textContent + '.';
  proj.global_prompt = g.value; saveSoon();
};
$('#btn-home').onclick = () => (location.hash = '#/');

function buildTimeline() {
  built = proj.id;
  const dur = proj.info.duration;
  video.src = `/files/${proj.id}/source.mp4`;
  const width = Math.max($('#timeline').clientWidth - 110, 400);
  pps = Math.max(40, width / dur);
  const W = dur * pps;
  $('#tracks').style.width = `${W}px`;
  $('#ruler').style.width = `${W}px`;
  const step = pps > 90 ? 1 : pps > 45 ? 2 : 5;
  let r = '';
  for (let t = 0; t <= dur; t += step) r += `<span style="left:${t * pps}px">${fmt(t).slice(0, 5)}</span>`;
  $('#ruler').innerHTML = r;
  const tv = $('#t-video');
  tv.style.backgroundImage = `url(/files/${proj.id}/work/thumbs.jpg)`;
  tv.style.backgroundSize = `${W}px 100%`;
  $('#t-words').querySelectorAll('.word').forEach((w) => w.remove());
  (proj.words || []).forEach((w, i) => {
    const el = document.createElement('div');
    el.className = 'word'; el.textContent = w.w; el.dataset.i = i;
    el.style.left = `${w.s * pps}px`; el.style.width = `${Math.max(14, (w.e - w.s) * pps - 2)}px`;
    $('#t-words').appendChild(el);
  });
  drawWave();
}
function drawWave() {
  const c = $('#wave'), W = c.clientWidth, H = c.clientHeight, d = devicePixelRatio;
  c.width = W * d; c.height = H * d;
  const x = c.getContext('2d'); x.scale(d, d);
  const { rate, peaks } = proj.waveform;
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,90,31,.9)'); g.addColorStop(1, 'rgba(255,159,10,.6)');
  x.fillStyle = g;
  for (let px = 0; px < W; px += 2) {
    const i0 = Math.floor((px / pps) * rate), i1 = Math.floor(((px + 2) / pps) * rate);
    let m = 0; for (let i = i0; i < i1 && i < peaks.length; i++) m = Math.max(m, peaks[i]);
    const h = Math.max(1, m * (H - 10));
    x.fillRect(px, (H - h) / 2, 1.4, h);
  }
}

// playback
const playIcon = (on) => ($('#btn-play').innerHTML = on ? '<svg viewBox="0 0 24 24"><path d="M7 5h4v14H7zM13 5h4v14h-4z" class="fill"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" class="fill"/></svg>');
$('#btn-play').onclick = () => (video.paused ? video.play() : video.pause());
video.onplay = () => playIcon(true); video.onpause = () => playIcon(false);
(function tick() {
  if (proj && built) {
    $('#playhead').style.transform = `translateX(${video.currentTime * pps}px)`;
    $('#tc').textContent = fmt(video.currentTime);
    if (sel && !video.paused && video.currentTime >= sel.t1) video.pause();
  }
  requestAnimationFrame(tick);
})();
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea') || !$('#editor').classList.contains('on')) return;
  if (e.code === 'Space') { e.preventDefault(); $('#btn-play').click(); }
  if (e.code === 'Escape') clearSel();
});

// selection: drag anywhere on the tracks, or click/shift-click words
const tracks = $('#tracks');
const tAt = (e) => Math.min(proj.info.duration, Math.max(0, (e.clientX - tracks.getBoundingClientRect().left) / pps));
tracks.addEventListener('pointerdown', (e) => {
  if (e.target.closest('.plus, .region')) return;
  const word = e.target.closest('.word');
  if (word) {
    const w = proj.words[+word.dataset.i];
    if (e.shiftKey && sel) setSel(Math.min(sel.t0, w.s), Math.max(sel.t1, w.e));
    else setSel(w.s, w.e);
    video.currentTime = sel.t0;
    return;
  }
  dragging = tAt(e); setSel(dragging, dragging); tracks.setPointerCapture(e.pointerId);
});
tracks.addEventListener('pointermove', (e) => { if (dragging !== null) { const t = tAt(e); setSel(Math.min(dragging, t), Math.max(dragging, t)); } });
tracks.addEventListener('pointerup', (e) => {
  if (dragging === null) return;
  const t = tAt(e); dragging = null;
  if (sel.t1 - sel.t0 < 0.08) { clearSel(); video.currentTime = t; return; }
  video.currentTime = sel.t0;
});
function setSel(t0, t1) {
  sel = { t0, t1 };
  const s = $('#selection'); s.hidden = false;
  s.style.left = `${t0 * pps}px`; s.style.width = `${Math.max(2, (t1 - t0) * pps)}px`;
  document.querySelectorAll('.word').forEach((el) => { const w = proj.words[+el.dataset.i]; el.classList.toggle('sel', w.s < t1 && w.e > t0 && t1 - t0 > 0.05); });
}
function clearSel() { sel = null; $('#selection').hidden = true; $('#pop').hidden = true; document.querySelectorAll('.word.sel').forEach((el) => el.classList.remove('sel')); }

// "+" popover
$('#plus').onclick = (e) => {
  e.stopPropagation();
  const pop = $('#pop'), r = e.target.getBoundingClientRect();
  $('#pop-form').hidden = true; $('#pop-menu').hidden = false;
  $('#pop-menu').innerHTML = Object.entries(KINDS).map(([k, v]) => `<button class="pop-item" data-k="${k}"><span class="k" style="background:${v.color}">${v.icon}</span><span class="l">${v.label}</span></button>`).join('');
  pop.hidden = false;
  pop.style.left = `${Math.min(innerWidth - 336, Math.max(16, r.left - 150))}px`;
  pop.style.top = `${Math.max(16, r.top - 250)}px`;
};
$('#pop-menu').onclick = (e) => { const b = e.target.closest('.pop-item'); if (b) openForm({ id: uid(), t0: sel.t0, t1: sel.t1, kind: b.dataset.k, text: '', options: {} }, true); };
document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#pop, .plus, .intent') && !$('#pop').hidden) $('#pop').hidden = true; });

function openForm(it, isNew) {
  const k = KINDS[it.kind], f = $('#pop-form'), o = it.options;
  const when = `<span class="muted small">${fmt(it.t0)} – ${fmt(it.t1)}</span>`;
  const seg = (name, opts) => `<div class="seg" data-name="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${(o[name] ?? opts[0][0]) === v ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const filePick = (accept, label) => `<label class="file-pick"><input type="file" accept="${accept}" hidden>${o.file ? (accept.startsWith('image') ? `<img src="/files/${proj.id}/${o.file}">` : '♪') : '＋'}<span>${o.file ? esc(o.file.split('/').pop().slice(7)) : label}</span></label>`;
  const body = {
    prompt: `<textarea rows="4" placeholder="O que deve acontecer neste trecho?">${esc(it.text)}</textarea>`,
    image: `${filePick('image/*', 'Escolher imagem')}<textarea rows="3" placeholder="O que fazer com ela? (tela cheia, no canto, atrás de mim…)">${esc(it.text)}</textarea>
            <label class="toggle"><input type="checkbox" name="ai" ${o.ai_decides ? 'checked' : ''}>Deixar a IA decidir</label>`,
    sfx: `<textarea rows="3" placeholder="Descreva o som (ex.: whoosh rápido, impacto grave, pop suave)">${esc(it.text)}</textarea>`,
    music: `${seg('level', [['background', 'Fundo'], ['foreground', 'Alto volume']])}${filePick('audio/*', 'Enviar música (opcional)')}
            <textarea rows="2" placeholder="Ou descreva o clima (ex.: piano cinematográfico, batida animada)">${esc(it.text)}</textarea>`,
    text: `<textarea rows="2" placeholder="Texto que deve aparecer">${esc(o.onscreen || '')}</textarea><textarea rows="2" placeholder="Como? (opcional: grande atrás de mim, discreto no canto…)">${esc(it.text)}</textarea>`,
    zoom: `${seg('zoom', [['soft', 'Suave'], ['punch', 'Punch-in'], ['dramatic', 'Dramático']])}<textarea rows="2" placeholder="Algum detalhe? (opcional)">${esc(it.text)}</textarea>`,
  }[it.kind];
  f.innerHTML = `<div class="t"><span class="k" style="background:${k.color};width:26px;height:26px;border-radius:8px;display:grid;place-items:center;color:#000">${k.icon}</span>${k.label} ${when}</div>${body}
    <div class="row">${isNew ? '' : '<button class="secondary" data-a="del">Remover</button>'}<button class="primary" data-a="ok">${isNew ? 'Adicionar' : 'Salvar'}</button></div>`;
  $('#pop-menu').hidden = true; f.hidden = false; $('#pop').hidden = false;
  f.querySelectorAll('.seg').forEach((s) => (s.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); o[s.dataset.name] = b.dataset.v; }));
  const fi = f.querySelector('input[type=file]');
  if (fi) fi.onchange = async () => {
    const fd = new FormData(); fd.append('file', fi.files[0]);
    toast('Enviando…');
    o.file = (await api(`/api/projects/${proj.id}/assets`, { method: 'POST', body: fd })).path;
    openForm(it, isNew);
  };
  f.onclick = (e) => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'del') proj.intents = proj.intents.filter((x) => x.id !== it.id);
    else {
      const tas = f.querySelectorAll('textarea');
      if (it.kind === 'text') { o.onscreen = tas[0].value.trim(); it.text = tas[1].value.trim(); } else it.text = tas[tas.length - 1].value.trim();
      const ai = f.querySelector('input[name=ai]'); if (ai) o.ai_decides = ai.checked;
      if (it.kind === 'music' && !o.level) o.level = 'background';
      if (it.kind === 'zoom' && !o.zoom) o.zoom = 'soft';
      if (!it.text && !o.file && !o.onscreen && !['zoom', 'music'].includes(it.kind)) return toast('Descreva o que você quer');
      if (isNew) proj.intents.push(it);
    }
    $('#pop').hidden = true; clearSel(); renderIntents(); saveSoon();
  };
  const ta = f.querySelector('textarea'); if (ta) setTimeout(() => ta.focus(), 50);
}

function summary(it) {
  const o = it.options;
  if (it.kind === 'music') return `${o.level === 'foreground' ? 'Alto volume' : 'Fundo'}${o.file ? ' · arquivo' : ''}${it.text ? ' · ' + it.text : ''}`;
  if (it.kind === 'text') return `“${o.onscreen}”${it.text ? ' · ' + it.text : ''}`;
  if (it.kind === 'image') return `${o.file ? 'Imagem' : 'Sem imagem'} · ${o.ai_decides ? 'a IA decide' : it.text || ''}`;
  if (it.kind === 'zoom') return `${{ soft: 'Suave', punch: 'Punch-in', dramatic: 'Dramático' }[o.zoom] || ''}${it.text ? ' · ' + it.text : ''}`;
  return it.text;
}
function renderIntents() {
  const list = [...proj.intents].sort((a, b) => a.t0 - b.t0);
  $('#intent-count').textContent = list.length || '';
  $('#intent-list').innerHTML = list.map((it) => `<div class="intent" data-id="${it.id}"><span class="k" style="background:${KINDS[it.kind].color};color:#000">${KINDS[it.kind].icon}</span>
    <div><div class="when">${fmt(it.t0)} – ${fmt(it.t1)} · ${KINDS[it.kind].label}</div><div class="what">${esc(summary(it))}</div></div></div>`).join('');
  // lanes so overlapping regions don't hide each other
  const lanes = [];
  const tr = $('#t-intents'); tr.querySelectorAll('.region').forEach((r) => r.remove());
  list.forEach((it) => {
    let lane = lanes.findIndex((end) => end <= it.t0); if (lane < 0) { lane = lanes.length; } lanes[lane] = it.t1;
    const el = document.createElement('div');
    el.className = 'region'; el.dataset.id = it.id;
    el.style.cssText = `left:${it.t0 * pps}px;width:${Math.max(18, (it.t1 - it.t0) * pps)}px;background:${KINDS[it.kind].color};top:${5 + lane * 20}px;height:${lanes.length > 1 || lane ? 18 : 36}px`;
    el.innerHTML = `${KINDS[it.kind].icon} ${esc(summary(it)).slice(0, 60)}`;
    tr.appendChild(el);
  });
}
const openIntent = (id, anchor) => {
  const it = proj.intents.find((x) => x.id === id); if (!it) return;
  sel = { t0: it.t0, t1: it.t1 };
  const r = anchor.getBoundingClientRect(), pop = $('#pop');
  pop.style.left = `${Math.min(innerWidth - 336, Math.max(16, r.left))}px`;
  pop.style.top = `${Math.max(16, Math.min(innerHeight - 380, r.top - 300))}px`;
  openForm(it, false);
  video.currentTime = it.t0;
};
$('#intent-list').onclick = (e) => { const el = e.target.closest('.intent'); if (el) openIntent(el.dataset.id, el); };
$('#t-intents').addEventListener('click', (e) => { const el = e.target.closest('.region'); if (el) openIntent(el.dataset.id, el); });
window.addEventListener('resize', () => { if (proj && $('#editor').classList.contains('on')) { built = null; editor(); } });

// ---------------- briefing ----------------
$('#btn-brief').onclick = async () => {
  if (!proj.global_prompt?.trim() && !proj.intents.length) return toast('Escreva a direção geral ou marque um trecho');
  clearTimeout(saveT);
  await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ name: proj.name, global_prompt: proj.global_prompt, intents: proj.intents }) });
  await api(`/api/projects/${proj.id}/briefing`, { method: 'POST' });
  proj.job = { name: 'briefing', stage: 'think', progress: 0.05 };
  processing(proj.job);
};
function briefing() {
  show('briefing');
  const b = proj.briefing || {};
  proj.answers = proj.answers || {};
  $('#brief-title').innerHTML = esc(b.title || 'O plano da sua edição');
  $('#brief-plan').innerHTML = (b.plan || []).map((p, i) => `<div class="plan-item" style="animation-delay:${i * 60}ms">
      <div class="w">${p.t0 != null ? fmt(p.t0) + ' – ' + fmt(p.t1) : 'Geral'}</div><div><div class="h">${esc(p.title)}</div><div class="d">${esc(p.detail)}</div></div></div>`).join('');
  $('#brief-checklist').innerHTML = (b.questions || []).map((q, i) => {
    const a = proj.answers[q.id];
    const custom = a != null && !q.options.includes(a);
    return `<div class="q ${a != null ? 'done' : ''} ${custom ? 'custom' : ''}" data-id="${q.id}" style="animation-delay:${200 + i * 60}ms">
      <div class="qt">${esc(q.question)}</div>${q.why ? `<div class="qw">${esc(q.why)}</div>` : ''}
      <div class="opts">${q.options.map((o) => `<button class="opt ${a === o ? 'on' : ''}">${esc(o)}</button>`).join('')}<button class="opt ${custom ? 'on' : ''}" data-custom="1">Outro…</button></div>
      <div class="other"><textarea rows="2" placeholder="Sua resposta">${custom ? esc(a) : ''}</textarea></div></div>`;
  }).join('') || '<p class="muted">Nada ficou ambíguo. Pode começar.</p>';
  updateBriefFoot();
}
function updateBriefFoot() {
  const qs = proj.briefing?.questions || [];
  const left = qs.filter((q) => !(proj.answers[q.id] || '').trim()).length;
  $('#brief-left').textContent = left ? `${left} ${left > 1 ? 'decisões pendentes' : 'decisão pendente'}` : 'Tudo decidido';
  $('#btn-render').disabled = left > 0;
}
$('#brief-checklist').onclick = (e) => {
  const b = e.target.closest('.opt'); if (!b) return;
  const q = b.closest('.q'), id = q.dataset.id;
  q.querySelectorAll('.opt').forEach((x) => x.classList.toggle('on', x === b));
  if (b.dataset.custom) { q.classList.add('custom'); proj.answers[id] = q.querySelector('textarea').value; q.querySelector('textarea').focus(); }
  else { q.classList.remove('custom'); proj.answers[id] = b.textContent; }
  q.classList.toggle('done', !!(proj.answers[id] || '').trim());
  updateBriefFoot(); saveSoon();
};
$('#brief-checklist').oninput = (e) => {
  const q = e.target.closest('.q'); proj.answers[q.dataset.id] = e.target.value;
  q.classList.toggle('done', !!e.target.value.trim()); updateBriefFoot(); saveSoon();
};
$('#btn-brief-back').onclick = async () => { await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ answers: proj.answers }) }); proj = await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ stage: 'edit' }) }); editor(); };
$('#btn-render').onclick = async () => {
  clearTimeout(saveT);
  await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ answers: proj.answers }) });
  await api(`/api/projects/${proj.id}/render`, { method: 'POST' });
  proj.job = { name: 'render', stage: 'spec', progress: 0.02 };
  processing(proj.job);
};

// ---------------- done ----------------
function done() {
  show('done');
  const v = Date.now();
  $('#final').src = `/files/${proj.id}/${proj.outputs.preview}?v=${v}`;
  $('#dl-preview').href = `/files/${proj.id}/${proj.outputs.preview}`;
  $('#dl-master').href = `/files/${proj.id}/${proj.outputs.master}`;
}
$('#btn-refine').onclick = async () => { proj = await api(`/api/projects/${proj.id}`, { method: 'PUT', body: JSON.stringify({ stage: 'edit' }) }); editor(); };

route();
