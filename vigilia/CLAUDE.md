# Vigília: contexto para continuar o projeto

Jogo de navegador, de plataforma e puzzles, para publicar no itch.io (HTML5, um zip, sem pedidos externos).
O dono do projeto não programa e escreve em português: responda em português do Brasil, sem jargão.

## Onde está cada coisa

- `DESIGN.md`: o documento de projeto, aprovado sem correções. É a fonte da verdade para história, sistemas, puzzles, arte e som.
- Caderno do projeto (painel ao vivo): https://claude.ai/artifact/M1dLmP5VBEFpg4ZHssByvJ
  - O dono acompanha por ele, então ele deve refletir fielmente o que está sendo feito, em tempo real.
  - O banco do painel tem as coleções `hub/status` (campos `now`, `waiting`, `updatedAt`), `stages` (s1 a s7), `tasks` (t101 a t703, com `status` = feito | fazendo | a fazer | aguardando você | pausado, `progress` de 0 a 1, `weight`, `note`), `log` (l001 em diante, `{at, text}`) e `doc` (seções do documento).
  - Escreva nele com a ferramenta ArtifactData, sempre com `if_version`. Use a hora real (`date -u`) nos campos `at`, nunca uma hora futura.
- `src/core/`: módulos prontos, ainda não testados:
  - `state.ts`: save no navegador e código exportável `VIG1-`.
  - `morality.ts`: coração de -10 a 10, os atos e a função `lookFor`, que dá o visual a partir do coração.
  - `controls.ts`: teclado e toque.
  - `util.ts`
- `tools/audio/nodes.json`: os ids do fluxo do ElevenLabs "Vigília — sons do jogo" (`7KfDk6Cnz0iSyjKBBxXN`) e dos 50 nós de som.

## Tecnologia

- Phaser 4.2.1, TypeScript strict e Vite 6 (`base: './'`). Comandos:
  - `npm install`
  - `npm run dev`: servidor local.
  - `npm run typecheck`
  - `npm run build`: gera `dist/` para o itch.io.
- Resolução 1280x720; a linha do chão fica em y=600.
- Fonte IM Fell English embutida via `@fontsource/im-fell-english`.
- Leia os tipos em `node_modules/phaser/types/phaser.d.ts` e os guias em `node_modules/phaser/skills/`. O Phaser 4 não tem mais pipelines: efeitos de câmera são filtros, ou seja, um `Phaser.Filters.Controller` mais um nó `BaseFilterShader` registrado com `renderer.renderNodes.addNodeConstructor`.

## Estado em 07/11/2026

- **Feito:** documento de projeto, painel, módulos de `src/core/`.
- **Em andamento na nuvem** (podem chegar por `git pull`):
  - `src/entities/figure.ts`: boneco articulado desenhado em código.
    - `class Figure extends Phaser.GameObjects.Graphics`, `constructor(scene, x, y, style)`, com a posição nos pés.
    - Poses: stand, walk, jump, fall, land, push, shield, kneel, lie, sit, curl, dig, water, offer, reach, pick, wave, carry, armsOpen, cover.
    - Propriedades: `facing`, `pose`, `speed`, `hunch`, `heavy`, `candle {lit, flame, wind} | null`, `carrying`, `woundAlpha`, `shiver`, `front`, `cloakOn`.
    - Membros: `onStep`, `update(dt, vx?)`, `candleWorld()`, `handWorld()`.
    - Alturas: criança 82, adulto 108, Estranho 120, mulher 95.
  - `src/ui/ui.ts` e `ui.css`: interface em DOM.
    - Telas: `UI.init(canvas, root)`, `showTitle`, `showCredits`, `showSummary`, `showTest`, `showPause`.
    - Indicadores: `setPrompt`, `setHint`, `setHud`, `setLoading`.
    - Também cobre os botões de toque e todo o texto em PT-BR.
  - `src/render/brush.ts` e `src/render/art.ts`: toda a arte pintada em código.
    - `paintSet(textures, set)` com `set` = 'prologo' | 'fase1' | 'fase2' | 'titulo'.
    - Gera as mesmas chaves em todos os sets: sky, hills, treesFar, treesMid, fog, ground, water, fgGrass, fgTop e os objetos.
    - A prévia fica em `tools/art-preview.html`.
- **Travado:**
  - Higgsfield: a conta está no plano free com 0 créditos. Comprar é decisão do dono. Por isso toda a arte é pintada em código.
  - ElevenLabs: 32 versões dos 8 ambientes `amb_*` já foram geradas e pagas. Na nuvem, o download estava bloqueado (host `elevenlabsusercontent.com`).
    - Os outros 42 sons curtos ainda não foram gerados.
    - Pegue links novos consultando o status dos ids de sessão em `nodes.json`; não gere de novo o que já foi pago.
    - Destino: `public/audio/*.mp3`, mais `manifest.json` `{"version":1,"sounds":{id:{file,duration,loop}}}`.
  - Uso comercial das saídas do ElevenLabs e do Higgsfield: conferir o plano antes de publicar.
- **Decisão pendente do dono:** o nome do jogo. As sugestões foram Vigília (recomendado), Ainda Este Ano e Pavio.

## Próximos passos (versão 1 = fatia vertical: prólogo, fase 1, fase 2)

1. `index.html` (com `#game` e `#ui`) e `src/main.ts`. A configuração do Phaser 4 é 1280x720, modo FIT.
2. Física própria de caixas AABB, sem a Arcade, para ter controle fino. O controle do jogador precisa de:
   - aceleração;
   - coyote time de 0,1 s e pulo guardado de 0,12 s;
   - pulo variável, com gravidade menor no topo;
   - subir degraus baixos sozinho;
   - empurrar caixas.
3. Filtro de câmera "luz da vela" (`src/render/candle-filter.ts`):
   - luz em volta da vela e mais 4 luzes pontuais;
   - luz ambiente fria;
   - saturação geral e saturação perto da vela;
   - preto e branco quando a vela apaga;
   - parede de escuridão com borda de ruído;
   - vinheta, grão, textura de papel, clarão e fade.
   - Todos esses valores saem de `lookFor(coração suavizado, vela acesa)`.
4. Motor de som com WebAudio:
   - carrega o `manifest.json` se existir;
   - senão sintetiza o som no navegador (vento, riacho, fogo, passos por tipo de chão, pulo, rangido, água);
   - os ids seguem `tools/audio/nodes.json`.
5. Paralaxe com TileSprites em `scrollFactor 0` e `tilePositionX = scrollX * fator`. Câmera que antecipa o movimento.
6. As fases do `DESIGN.md`, seção 6, com os puzzles obrigatórios e ligados à história.
7. Créditos falsos, tela de título que muda, fase 2, tela "o que o jogo registrou" e modo teste.
8. Testes com capturas do Playwright, build para o itch.io e atualização do painel.
