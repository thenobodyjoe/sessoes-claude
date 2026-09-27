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
- [ ] Servidor: projetos, upload, job de análise, persistência
- [ ] Web: boas-vindas + upload, tela de processamento animada
- [ ] Web: editor (player, timeline com thumbnails, waveform e palavras, seleção + menu "+", lista de intenções, prompt global)
- [ ] Cérebro: briefing (plano + checklist) e spec
- [ ] Web: tela de briefing/checklist e tela de render/entrega
- [ ] Motor guiado por spec (gfx.js genérico, comp.py, audio.py)
- [ ] Preview ao vivo dos letreiros no player
- [ ] v2: SFX, música e imagens gerados (ElevenLabs), variações por trecho, comentários no preview
- [ ] v3: cenas animadas em código (ex.: montanha-russa com o rosto rastreado), biblioteca de cenas reutilizáveis

## Ideias aprovadas (para as próximas versões)

- Selecionar pelo texto (palavras da transcrição) além do tempo.
- O Claude mostra o plano do trecho antes de renderizar.
- Variações por trecho.
- Comentários no preview viram ajustes.
- Kit de marca e memória de estilo.
- Prioridade: o pedido do trecho vence o prompt global.
- Cenas geradas preferencialmente como **animação em código**, no estilo global da edição. É barato, o rastreio é exato e o preview é ao vivo. Imagem gerada serve como textura; modelo de vídeo fica só como opção premium.
