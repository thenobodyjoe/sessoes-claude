# Studio: editor de vídeo por intenção

Um editor com timeline estilo Premiere, só que a pessoa não monta o vídeo peça por peça.
Ela diz o que quer, com um **prompt global** ou **selecionando trechos da timeline**.
O Claude transforma isso num **briefing**: um plano com um checklist do que ficou ambíguo.
A pessoa decide cada item do checklist, e o motor renderiza o vídeo no padrão da edição do `talking-head-edit/`.

Este arquivo é o ponto de retomada. **Sempre atualize a seção "Status"** ao terminar uma etapa.

## Como rodar (local)

```bash
bash video-editor/setup.sh          # ffmpeg, mediapipe, modelo de fala, playwright (uma vez)
bash studio/run.sh                  # instala fastapi/uvicorn e abre http://localhost:8787
```

O "cérebro" pode ser:
- `STUDIO_BRAIN=cli` (padrão local): usa o `claude` CLI já logado na máquina (`claude -p`).
- `STUDIO_BRAIN=api`: usa a API da Anthropic (`ANTHROPIC_API_KEY`). É o modo obrigatório para abrir ao público.

## Arquitetura

```
studio/
  server.py          FastAPI: projetos, upload, jobs (análise, briefing, spec, render), arquivos
  brain.py           Claude: prompt global + intenções -> briefing (plano + checklist) -> spec
  engine/
    spec.md          formato do EditSpec (a fonte da verdade de uma edição)
    gfx.js           motor de letreiros guiado pelo spec (roda no navegador E no render)
    render_gfx.mjs   renderiza as camadas PNG com Playwright
    comp.py          composição (câmera, matte, grade, acabamento) guiada pelo spec
    audio.py         voz, trilha, SFX e mix guiados pelo spec
  web/               app (HTML/CSS/JS puro, sem build): boas-vindas -> processamento -> editor -> briefing -> render -> entrega
  projects/<id>/     tudo de um projeto: source.mp4, project.json, work/ (gitignored)
```

Fluxo de dados:
1. **Upload**
2. **Análise:** probe, transcrição, matte e rosto, thumbnails, waveform
3. **Editor:** timeline, player e instruções. As intenções ficam em `project.json`.
4. **Briefing:** o Claude devolve plano + checklist.
5. **Decisões:** a pessoa marca o checklist.
6. **Spec:** o Claude gera o `EditSpec` JSON.
7. **Render:** o motor renderiza e entrega o preview e o master.

### Intenções (o que a pessoa cria na timeline)

`{id, t0, t1, kind, text, options}`, onde `kind` é um de:
- `prompt`: instrução livre;
- `image`: arquivo + "o que fazer" ou `ai_decides`;
- `sfx`: descrição do efeito;
- `music`: arquivo ou descrição; `options.level` = `background` ou `foreground`;
- `text`: texto na tela;
- `zoom`: ênfase de câmera.

## Status

- [x] Mapa e arquitetura (este arquivo)
- [x] Servidor: projetos, upload, job de análise, persistência. Testado com upload real.
- [x] Web: tela inicial + upload, tela de processamento animada (orbe, etapas e barra)
- [x] Web: editor
  - player, timeline com thumbnails, waveform e palavras;
  - zoom com ⌘/Ctrl + rolagem;
  - seleção por arraste ou por palavras (shift para estender) + menu "+" com formulários por tipo;
  - lista de instruções, prompt global com sugestões, salvamento automático.
- [x] Cérebro: briefing (plano + checklist) testado de verdade com `claude -p` (Opus 5.5); spec em teste
- [x] Web: tela de briefing/checklist (opções + "Outro…") e tela de entrega
- [x] Motor guiado por spec (gfx.js genérico, timeline, comp.py, audio.py)
  - testado com um spec escrito à mão: reproduz a edição do Eric.
- [ ] Render completo disparado pela UI com spec do Claude (em validação)
- [ ] Preview ao vivo dos letreiros no player: `engine/gfx.js` já expõe `window.drawAt(ctx, t, layer)`, falta o canvas sobre o `<video>`
- [ ] Refazer só o trecho alterado (hoje refaz o vídeo todo)
- [ ] Formato vertical 9:16: o spec aceita `format`, mas os layouts de `gfx.js` são pensados em 16:9
- [ ] v2: SFX, música e imagens gerados (ElevenLabs), variações por trecho, comentários no preview
- [ ] v3: cenas animadas em código (ex.: montanha-russa com o rosto rastreado), biblioteca de cenas reutilizáveis

### Notas de teste
- O Chromium do Playwright não toca H.264, por isso o player aparece preto nos prints automáticos. No Chrome e no Safari toca normal.
- Custo e tempo de um vídeo de 33 s:
  - análise: cerca de 1 min;
  - briefing: 1 chamada ao Claude;
  - spec: 1 chamada ao Claude;
  - render: cerca de 10 min em 4 núcleos.

## Ideias aprovadas (para as próximas versões)

- Selecionar pelo texto (palavras da transcrição) além do tempo.
- O Claude mostra o plano do trecho antes de renderizar.
- Variações por trecho.
- Comentários no preview viram ajustes.
- Kit de marca e memória de estilo.
- Prioridade: o pedido do trecho vence o prompt global.
- Cenas geradas preferencialmente como **animação em código**, no estilo global da edição. É barato, o rastreio é exato e o preview é ao vivo. Imagem gerada serve como textura; modelo de vídeo fica só como opção premium.
