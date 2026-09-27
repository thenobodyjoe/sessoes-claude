# Talking Head — MasterClass edit

Edição completa, feita por código, do vídeo "Talking Head Sample" (Eric Edmeades, abertura da MasterClass "How to Build a Successful Coaching Practice").
Tudo roda dentro deste ambiente, sem Premiere nem After Effects.

**Entrega:** 1920×1080, 29,97 fps, 35,3 s, H.264 + AAC 320k, áudio em −14 LUFS / −1 dBTP.

## Pipeline

| Etapa | Arquivo | O que faz |
|---|---|---|
| Decisões | `config.py` | Tempo de cada palavra, retime (corta 0,4 s de pausa morta), grupos de legenda, keyframes de câmera, impactos |
| Análise | `analyze.py` | Recorte do apresentador (MediaPipe selfie segmentation) e rastreio do rosto, quadro a quadro |
| Letreiros | `graphics/gfx.js`, `render_gfx.mjs` | Motion graphics em Canvas renderizados quadro a quadro no Chromium (Playwright), com motion blur de shutter 180°, em duas camadas: *behind* (atrás do apresentador) e *front* |
| Composição | `comp.py` | Punch-ins guiados pelo rosto, tremor de impacto, color grade (LUT), refino do matte com guided filter, texto atrás do apresentador, bloom, vinheta, grão, fades |
| Som | `audio.py` | Tratamento da voz (EQ, compressão, de-esser, redução de ruído), trilha original sintetizada e travada no grid dos cortes, efeitos sonoros, ducking, loudnorm em dois passes |

`words.json` guarda o alinhamento forçado palavra a palavra: texto transcrito com Whisper small.en e alinhado com pocketsphinx.

## Como gerar

```bash
bash build.sh   # SRC_VIDEO=/caminho/do/video.mp4 para trocar a fonte
```

Requisitos: `ffmpeg`, Python com `mediapipe==0.10.14`, `opencv-contrib`, `scipy`, `numpy` e Node com `playwright`.
Os intermediários ficam em `work/` e o resultado sai em `work/final.mp4`.
