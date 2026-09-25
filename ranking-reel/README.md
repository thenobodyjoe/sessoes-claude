# Ranking dos Políticos: "Escolha com critério" (45 s, 9:16)

Peça vertical de motion graphics (1080x1920, 45 s, com trilha) que chama o público para consultar o
[Ranking dos Políticos](https://ranking.org.br) antes de votar. Tudo é feito em código: formas, tipografia
cinética, transições, pós-processamento e a trilha (sintetizada em WebAudio, sem samples). Fonte: Poppins.

## Tempo

A edição foi desenhada em 32 "tempos de história" (a versão curta de 15 s). A versão de 45 s toca a mesma
história num relógio mais lento: `REMAP` em `src/00-core.js` liga cada tempo de saída (24 compassos a 128 BPM =
45,0 s) a um tempo de história por uma curva monotônica suave. As animações rodam a 30-60% da velocidade e cada
momento-chave segura (quase parado, sem congelar) o suficiente para ser lido; os cortes caem nas barras da música.
Para voltar aos 15 s, basta `REMAP = [[0, 0], [32, 32]]`.

## Roteiro (tempos da versão de 15 s; na de 45 s cada bloco dura cerca de 3x)

| tempo | tela | ideia de motion |
|---|---|---|
| 0,0–1,9 s | **VAI VOTAR NO ESCURO?** | uma lâmpada falhando revela as letras vazadas; blecaute; o apito do mestre de bateria chama a entrada |
| 1,9–3,8 s | bandeira → Congresso Nacional | o losango, o círculo, a faixa e as 27 estrelas se montam; o globo inunda a tela e vira a noite de Brasília; a metade de cima vira a cúpula do Senado, a de baixo a cuia da Câmara, o losango achata na laje e as torres sobem; espelho d'água; contadores **81 senadores / 513 deputados** |
| 3,8–5,2 s | **QUEM TRABALHA POR VOCÊ?** | a cuia vira de cabeça para baixo e cresce até o plenário: 513 cadeiras que ganham a cor da pontuação (+/−) |
| 5,2–6,6 s | **CONSULTE O RANKING** | as cadeiras escoam para os avatares de um card de navegador em `ranking.org.br`: busca, filtros, pontuações contando |
| 6,6–8,0 s | **ESCOLHA COM CRITÉRIO.** | critérios (Presença, Votações, Gastos, Processos) somam e tiram pontos; o ranking se reordena e coroa um novo 1º |
| 8,0–9,4 s | **LEVA SÓ 2 MINUTOS** | o card vira um cronômetro; o dígito rola até 2 enquanto o arco dá a volta |
| 9,4–11,3 s | **SEU VOTO NÃO É DESPERDIÇADO.** | wipe com três barras (verde, amarelo, azul, com o canto do logo); urna: os campos se preenchem, CONFIRMA, **FIM** |
| 11,3–15,0 s | logotipo + CTA | as letras de FIM e as teclas da urna viram formas metamórficas em órbita; um disco as engole e ondula como líquido; o capitel entra pelos lados; três pontos sobem e esticam nas barras do ranking; a marca desliza, o nome nasce letra a letra de formas, "15 Anos" sai de trás do disco; **Consulte antes de votar. / ranking.org.br / Leva só 2 minutos.** |

O meio da peça é cortado em grupos de três tempos (cortes nos tempos 8, 11, 14, 17, 20): uma hemíola contra o
4/4 da bateria, que empurra a edição para a frente.

Cuidados: nenhum político, partido ou número de candidato aparece (a urna mostra os campos preenchidos com
pontos, nunca dígitos; os nomes no ranking são tarjas). Textos importantes ficam na área segura de Reels/TikTok
(entre y≈250 e y≈1550).

## Identidade

- Logotipo: `assets/logo-ranking-15anos.png` (branco sobre transparente). `tools/embed_assets.py` recorta cada
  letra do nome, o "15" e "Anos" num atlas de sprites posicionados nas coordenadas originais; o símbolo
  (disco com capitel e três barras) é reconstruído em vetor a partir das medidas do PNG para poder metamorfosear.
- Fonte: Poppins 500–900 (SIL OFL, `assets/fonts/OFL.txt`), embutida no HTML.
- Paleta (`C` em `src/00-core.js`): azul-marinho de fundo, amarelo de destaque, verde/vermelho para pontos
  positivos/negativos, e as cores da bandeira nos momentos de Brasil. Não consegui acessar o site
  (bloqueado na rede deste ambiente); troque os valores de `C` pelos hex oficiais, se houver.

## Assistir

Abra `index.html` num Chrome/Edge/Safari/Firefox recente (WebGL2). Toque/clique para começar com som, `M` tira
o som, duplo clique em tela cheia, `?autoplay` pula o pôster, `?t=12.5` desenha um quadro.

## Build e render

```
python tools/embed_assets.py      # só se o logo ou as fontes mudarem -> src/01-assets.js
node tools/build.mjs              # src/*.js + src/template.html -> index.html
python tools/render.py            # 1080x1920, 60 fps, 4 sub-quadros de motion blur -> ranking-reel.mp4
python tools/render.py --fps 30 --blur 8 --jobs 3
python tools/render.py --sheet 0.5,4,8,14.9 --out sheet.png   # folha de contato
```

A peça é função pura do tempo, então `render.py` percorre os quadros no Chromium headless, acumula sub-quadros
na GPU (obturador de 180°), passa cada quadro ao ffmpeg em paralelo (`--jobs`), junta os segmentos e coloca por
baixo a trilha renderizada offline pela mesma mesa de som.

## Módulos

`00-core` tempo, easing, paleta · `01-assets` (gerado) · `02-load` fontes e atlas · `10-morph` formas
metamórficas (reamostragem por comprimento de arco) · `15-type` tipografia cinética · `20-fx` fundos, ponteiro,
partículas · `30-hook-flag` cenas 1–2 · `40-hemi-ui` cenas 3–4 · `50-clock-urna` cenas 5–6 · `60-logo` cena 7 ·
`70-post` motion blur e lente (WebGL2) · `80-audio` trilha · `90-main` orquestração e ganchos (`window.__reel`).
