# Passagem: animar o vídeo "Alerta" do Ranking dos Políticos

Documento para continuar o trabalho numa sessão nova. Tudo o que é preciso está neste repositório
(branch `claude/zen-wozniak-bmiawo`, pasta `ranking-alerta/`).

## Objetivo

Vídeo vertical 1080x1920, ~65 s, que acompanha a narração `ranking-alerta/narracao.mp3`
(voz "Hank" do ElevenLabs, eleven_v3). Estética de agência. A primeira metade é sombria (preto e
vermelho, "transmissão de alerta"); a partir de 0:38 entra a identidade do Ranking (azul-marinho,
amarelo, logo branco). Fonte: Poppins. Metáfora central: **lobos em pele de cordeiro**. Todo
político é um rosto humano sorridente (a máscara); por trás há um lobo sombrio (vermelho) ou, para
poucos, um cordeiro (verde). O usuário pediu para abusar dessa linguagem.

**Estado:** os 9 quadros-chave estão prontos (`src/40-kv.js`) e foram enviados para validação.
**Ainda não foi animado nada.** Confirme com o usuário se os quadros foram aprovados antes de animar.

## Narração (texto e tempos medidos)

| tempo (s) | frase |
|---|---|
| 0.00–2.70 | Isso é um chamado ao povo brasileiro: |
| 3.04–4.53 | dia 4 de outubro, |
| 4.69–6.13 | não vá votar... |
| 6.51–9.57 | Não sem antes assistir a este alerta. |
| 10.07–13.19 | Todo mundo só fala da eleição pra presidente. |
| 13.70–15.73 | Mas é o deputado e o senador |
| 15.96–18.29 | que decidem o imposto no seu salário, |
| 18.55–21.17 | o remédio que falta no posto de saúde, |
| 21.40–22.66 | a lei que garante |
| 22.89–23.56 | — ou tira — |
| 23.78–25.45 | o seu direito amanhã. |
| 25.81–27.70 | São centenas de nomes, |
| 27.93–29.56 | centenas de sorrisos, |
| 29.73–32.13 | jurando que vão trabalhar pelo povo. |
| 32.51–34.89 | Mas quem votou a favor do cidadão? |
| 35.17–37.90 | E quem só votou a favor de si mesmo? |
| 38.31–41.43 | É pra isso que o Ranking dos Políticos existe. |
| 41.77–43.14 | Cruzamos presença, |
| 43.31–44.05 | votação, |
| 44.24–45.33 | gasto público |
| 45.49–47.07 | e processo na Justiça — |
| 47.27–48.79 | e entregamos uma nota: |
| 48.99–50.24 | de zero a dez. |
| 50.42–51.52 | Sem discurso. |
| 51.69–52.77 | Só histórico. |
| 53.12–55.06 | Consulte antes de votar. |
| 55.35–59.02 | Dois minutos que decidem os próximos quatro anos. |
| 59.32–61.02 | Compartilha esse alerta. |
| 61.30–65.2 | Pode ser o vídeo mais importante antes do dia quatro. |

(Medido com `silencedetect` do ffmpeg; a duração total do mp3 é 65,36 s.)

## Os 9 quadros-chave (`KV` em `src/40-kv.js`)

| # | id | tempo | o que mostra |
|---|---|---|---|
| 1 | chamado | 0:00–0:10 | bandeira em traço vermelho, rachada; olhos de lobo no escuro; "UM CHAMADO AO POVO BRASILEIRO", selo "DIA 4 DE OUTUBRO", "NÃO VÁ VOTAR." (branco com eco vermelho), "não sem antes assistir a este alerta." |
| 2 | palco | 0:10–0:13 | holofote no político sorridente com faixa presidencial atrás do púlpito; celulares filmando; olhos nas laterais; "TODOS OS OLHOS NO PRESIDENTE." e "enquanto isso, no escuro..." |
| 3 | congresso | 0:13–0:25 | lobo gigante (traço vermelho, olhos em brasa) sobre o Congresso; 3 cartões arranhados por garras: imposto no salário, remédio que falta no posto, o seu direito; "DEPUTADOS E SENADORES DECIDEM A SUA VIDA." |
| 4 | sorrisos | 0:25–0:32 | plenário de políticos sorridentes em fileiras até o fundo; algumas sombras com orelhas de lobo; "CENTENAS DE SORRISOS." |
| 5 | mascaras | 0:32–0:38 | varredura vertical: à esquerda "O QUE ELES MOSTRAM" (sorrisos), à direita "QUEM ELES SÃO" (lobos e ~1 em 5 cordeiros, mesmas posições); "LOBOS EM PELE DE CORDEIRO."; legenda cordeiro/lobo |
| 6 | virada | 0:38–0:41 | céu azul da marca; o símbolo do Ranking vira lanterna; o feixe de luz revela lobos e cordeiros, fora dele só sorrisos; "É PRA ISSO QUE O RANKING DOS POLÍTICOS EXISTE: SEPARAR LOBOS DE CORDEIROS." |
| 7 | nota | 0:41–0:53 | dois cards estilo site: cordeiro nota 8,7 e lobo nota 2,1, barras de Presença/Votações/Gasto público/Processos; chips dos critérios; "SEM DISCURSO. SÓ HISTÓRICO." |
| 8 | tempo | 0:53–0:59 | cronômetro "2 MINUTOS" → quatro blocos 2027–2030 com cordeiros; "CONSULTE ANTES DE VOTAR", "DOIS MINUTOS DECIDEM QUATRO ANOS." |
| 9 | compartilhe | 0:59–1:05 | logo completo com "15 Anos", botão "COMPARTILHE O ALERTA", ranking.org.br, rebanho de cordeiros |

## O código

- `src/00-core.js`: paletas `D` (mundo escuro) e `C` (Ranking), easing (`E`), `pr`, `kick`, cores.
- `src/01-assets.js`: Poppins embutida e atlas do logo (gerado em `ranking-reel/tools/embed_assets.py`).
- `src/10-morph.js`, `src/15-type.js`: formas metamórficas e tipografia cinética (`kLine`), herdadas do `ranking-reel`.
- `src/20-fx.js`: `bgDark`, `smoke`, `eyesField`, `alertUI` (moldura de alerta + ticker), `headline`, `bgNavy`, `dotGrid`, `drawMark`, `drawLockup`.
- `src/30-art.js`: traço vetorial via Path2D: `wolf`, `lamb`, `human` (5 cabelos, óculos, terno/blusa, `sash` = faixa presidencial), `eyesInDark`, `claws`, `congressLine`, `flagLine`, `crack`, `podium`, `phone`, ícones.
- `src/40-kv.js`: `crowd()` (fileiras com neblina; `kind(i,row,x,y,rr)` escolhe humano/lobo/cordeiro com posições estáveis por seed), `CROWD` compartilhado entre as cenas 4–6, e o array `KV`.
- `src/70-post.js`: pós em WebGL2 (motion blur por acumulação, CA, bloom por mipmap, grain, vinheta); `postStill(dark)`.
- `src/90-main.js`: por enquanto só o visualizador de quadros (`?kv=N`, `window.__kv`).

Build: `node tools/build.mjs`. Quadros: `python tools/keyvisuals.py --out <pasta>` (PNG por quadro + `board.png`).
Dependências no ambiente: `pip install playwright==1.56.0 imageio-ffmpeg pillow numpy` (o Chromium já está em `/opt/pw-browsers`).

## Plano de animação

Reaproveitar o pipeline do `ranking-reel` (mesma arquitetura):

1. **Relógio.** `DUR = 65.36`. Cenas como funções de `t` em segundos, amarradas à tabela de tempos acima.
   Cada cena desenha o seu KV com progressos locais (entrada → estado do KV → saída). Criar `50-scenes.js`
   e um despachante em `90-main.js` como no `ranking-reel/src/90-main.js` (`drawScene`, `renderFrame` com
   sub-quadros de motion blur, `window.__reel.render/dur/audioWav/sheet`).
2. **Áudio.** A narração é o áudio principal. Por baixo, uma trama tensa (drone grave, pulso de
   coração, impactos nos cortes, "whooshes"), que vira algo mais aberto e esperançoso na virada (0:38).
   Dá para reaproveitar os instrumentos de `ranking-reel/src/80-audio.js`. Mixar a narração com ffmpeg
   no final (música ~-18 dB sob a voz, com ducking).
3. **Render.** Copiar `ranking-reel/tools/render.py` (tem `--jobs`, sub-quadros e junção de segmentos) e
   trocar o mux de áudio pela mixagem narração + trilha. 30 fps com 4 sub-quadros é um bom equilíbrio de tempo.

Ideias de movimento por cena (sugestões, validar com o usuário):
- 0:00 escuro total; olhos de lobo acendem um a um; a bandeira se desenha em traço; "NÃO VÁ VOTAR." bate
  seco em 4.69 s com glitch; em 6.5 s o subtítulo corrige ("não sem antes...").
- 10 s: holofote liga com estalo; celulares sobem; em 13.7 s o holofote apaga e os olhos em volta ficam fortes.
- 13.7–25.5 s: câmera sobe do escuro até o Congresso; o lobo gigante se revela atrás; cada cartão entra na
  sua frase (15.96 / 18.55 / 21.40) e a garra risca na palavra-chave; "ou tira" (22.9 s) rasga o cartão do direito.
- 25.8–32 s: fileiras de sorrisos entram do fundo para a frente, em ritmo de contagem.
- 32.5–38 s: a varredura atravessa da esquerda para a direita e cada máscara vira lobo ou cordeiro ao ser tocada
  ("quem votou a favor do cidadão?" = cordeiros acendem; "e quem só votou a favor de si mesmo?" = lobos rosnam).
- 38.3 s: virada. O céu azul desce, o símbolo acende como lanterna e o feixe varre a multidão.
- 41.8–48.8 s: os 4 critérios entram um por palavra; a nota conta até 8,7 / 2,1 em "de zero a dez" (49 s).
- 53–59 s: o cronômetro gira; os anos entram um a um em "quatro anos".
- 59.3 s: logo monta (pode reusar a montagem metamórfica do `ranking-reel/src/60-logo.js`), CTA e compartilhar.

## Decisões em aberto (perguntar ao usuário)

- Aprovação dos 9 quadros e dos textos de tela ("LOBOS EM PELE DE CORDEIRO", "SEPARAR LOBOS DE CORDEIROS",
  "TODOS OS OLHOS NO PRESIDENTE", "enquanto isso, no escuro...").
- Proporção de cordeiros (hoje ~1 em 5; `isLamb` em `src/40-kv.js`).
- Notas de exemplo 8,7 e 2,1 (ilustrativas, personagens genéricos, nenhum político real).
- Cores oficiais do Ranking (o site ranking.org.br é bloqueado neste ambiente; foi usado azul-marinho + amarelo).

## Para economizar tokens

- Revisar por folhas de contato pequenas (`--scale 0.2`), não por PNGs em 1080x1920.
- Usar Sonnet para animar/ajustar e renderizar; Opus só para decisões de design.
- Agrupar as correções e renderizar o vídeo completo só no fim (~20–30 min com `--jobs 3`).

## Prompt sugerido para a nova sessão

> Leia `ranking-alerta/HANDOFF.md` no branch `claude/zen-wozniak-bmiawo` e anime o vídeo "Alerta" do
> Ranking dos Políticos a partir dos quadros-chave já aprovados, sincronizado com `ranking-alerta/narracao.mp3`.
> Revise com folhas de contato pequenas e só renderize o vídeo completo no final.
