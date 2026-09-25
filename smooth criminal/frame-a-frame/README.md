# Alibi em Azul e Ouro: releitura quadro a quadro

Uma pintura a óleo em movimento, de 77,5 segundos, com trilha original. Cada quadro de um videoclipe de
referência (1.861 quadros, 24 fps) é **repintado do zero** com o motor de pinceladas de
[petergpt/painted-rickroll](https://github.com/petergpt/painted-rickroll) (MIT, ver `LICENSE`). É uma releitura,
não um filtro: nenhum pixel do clipe aparece na tela.

## O que vem do clipe e o que é novo

| vem do clipe (só números) | é novo (desenhado em código) |
|---|---|
| as poses de cada pessoa, quadro a quadro (MediaPipe, 33 articulações) | os personagens: figuras pintadas sem rosto; o protagonista usa casaco vermelhão com forro dourado, echarpe creme e boina carmim; os demais usam casacos nas cores da noite |
| os cortes e o movimento da câmera | a sala: repintada a cada quadro em três camadas de pinceladas que seguem os contornos da luz |
| um mapa de luz de 32×18 da sala, sem as pessoas e borrado | a paleta: tudo reinterpretado como um noturno em azul e ouro |
| o andamento e a fase da dança (o clipe é mudo) | a música: jazz noir original em ré menor (sobe para mi menor), sintetizado em WebAudio |

Não são usados rostos, figurinos, textos, legendas nem logotipos do clipe. O protagonista é identificado
como a pessoa de tronco mais iluminado; a partir daí, só o movimento dele é usado.

Detalhes pintados: barras de casaco e echarpe simuladas (balançam e se arrastam atrás dos movimentos),
rastros de pincel atrás de mãos e pés rápidos, luz de recorte do lado do refletor, sombra de contato nos pés,
e a sala que se pinta de novo em uma varredura a cada corte. As luzes da sala pulsam com o bumbo e a caixa.

## Pipeline

```
python tools/extract.py ../clip-ref.mp4   # poses, luz, câmera, cortes -> data/raw.npz  (~4 min)
python tools/pack.py                      # rastreamento, suavização, andamento -> src/00-data.js
node tools/build.mjs                      # src/*.js + template -> index.html (autocontido, ~3 MB)
python tools/render.py                    # MP4 1280x720, um quadro por quadro do clipe, com a trilha
```

`extract.py` precisa de `opencv-python-headless mediapipe scipy` e do modelo
`tools/pose_landmarker_heavy.task` (download do MediaPipe, fora do repositório). O clipe de referência
e os MP4 renderizados também ficam fora do repositório.

## Assistir

Abra `index.html` no Chrome (WebGL2). Clique para começar com som, `M` tira o som, duplo clique = tela
cheia, `?autoplay` começa sem som, `?t=12.5` mostra um só quadro.

## Arquivos

| arquivo | conteúdo |
|---|---|
| `00-data.js` | gerado: poses, cortes, câmera, mapa de luz, andamento |
| `01-core.js`, `10-gl.js`, `20-strokes.js` | o motor (tempo, renderizador WebGL2 de pinceladas, impasto) |
| `30-track.js` | decodifica os dados; paleta azul e ouro; ajuste do quadro do clipe à tela |
| `40-room.js` | a sala repintada a cada quadro, a fumaça |
| `60-dancer.js` | os dançarinos, a simulação do casaco e da echarpe |
| `80-audio.js` | instrumentos, mesa de som e a partitura original |
| `90-main.js` | orquestração do quadro, relógio, atalhos de teste |
