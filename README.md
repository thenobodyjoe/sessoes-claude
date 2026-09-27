# Sessões Claude: animações pintadas em código

Estudos com o motor de animação "painted" (WebGL2 + Web Audio, tudo em código, sem mídia externa), baseado em
[petergpt/painted-rickroll](https://github.com/petergpt/painted-rickroll) (MIT).

- `moon-dancer/`: re-skin do estudo original com um astronauta original, novos mundos, ações e trilha (1 minuto).
- `smooth criminal/velvet-alibi/`: cena de 30 s de um clube dos anos 30 criada a partir de um vídeo de referência
  (personagem, música e coreografia originais, apenas inspirados na encenação).
- `talking-head-edit/`: edição completa (letreiros, texto atrás do apresentador, punch-ins, cor, trilha e efeitos)
  de um vídeo talking head, feita por código com `bash build.sh`.
- `video-editor/`: kit reutilizável de edição (setup, probe, transcrição pt/en, recorte, entrega). O fluxo está na skill
  `.claude/skills/video-edit/`, e o hook `.claude/hooks/session-start.sh` prepara tudo ao abrir uma sessão na nuvem.

Cada projeto tem seu `README.md`. Build: `node tools/build.mjs`. Vídeo: `python tools/render.py`.
Os MP4/WAV renderizados e o clipe de referência não estão no repositório.
