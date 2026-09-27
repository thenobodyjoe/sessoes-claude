# video-editor: kit de edição por código

Ferramentas reutilizáveis para editar vídeos inteiramente dentro do ambiente da nuvem.
O fluxo completo, o estilo e as armadilhas conhecidas estão na skill `.claude/skills/video-edit/SKILL.md`.
O projeto de referência é `talking-head-edit/`.

| Comando | Para quê |
|---|---|
| `bash video-editor/setup.sh` | Instala e verifica tudo; é idempotente e roda sozinho pelo hook de início de sessão |
| `bin/probe.py SRC --out DIR` | Specs, cortes, silêncios, loudness e contact sheets |
| `bin/transcribe.py SRC --out DIR [--lang pt] [--text corrigido.txt] [--pron nome="FONEMAS"]` | Transcrição com tempo por palavra, `words.json` e `.srt` |
| `bin/analyze.py SRC --out DIR` | Recorte do apresentador, rastreio do rosto e mapa das áreas livres para texto |
| `bin/new_project.py NOME --src SRC` | Cria um projeto novo a partir de `talking-head-edit/` |
| `bin/deliver.py video.mp4 mix.wav --out DIR --name X` | Gera o master e um preview com menos de 29 MiB, que cabe no envio pelo chat |

O modelo de fala (Parakeet v3, cerca de 640 MB, 25 idiomas incluindo português) fica em `~/.cache/video-editor/models`.
Ele não vai para o git.
