# VIGÍLIA — Documento de Projeto

*Título provisório. Jogo 2D de plataforma e puzzles para navegador, com progressão oculta e pano de fundo católico.*
*Versão 0.2 — referência obrigatória para todos os agentes que constroem o jogo.*

---

## 1. Visão em uma frase

Um jogo curto, bonito e difícil que parece terminar em uma hora — e que, a cada vez que você "joga de novo", revela que não tinha terminado nada, até chegar a um juízo final que ressignifica tudo o que você fez.

**Pilares**
1. **Prestar atenção é o jogo.** Os segredos, os puzzles e o centro moral são a mesma coisa: notar o que parece insignificante ("Senhor, quando foi que te vimos?", Mt 25,37).
2. **Nada é decoração gratuita.** Cada detalhe do mapa pode ser pista, consequência ou chave.
3. **O mundo lembra.** O que você fez fica no mapa, nas pessoas e no seu corpo.
4. **Puzzles são caminho, não pausa.** Todo puzzle está no trajeto e na história; só se avança resolvendo.
5. **Artesanal, nunca genérico.** Arte, letra e som com direção rígida e curadoria — nada com "cara de IA".

---

## 2. Estrutura: uma vida em fases

- O protagonista vive **uma única vida**, contada em **fases** (infância → juventude → maturidade → velhice). O jogador não sabe quantas são.
- **Cada fase termina com algo idêntico a uma morte** (na primeira, com créditos falsos). O jogador acha que zerou.
- Depois dos créditos o menu oferece só **"Jogar"**. O jogador aperta achando que vai recomeçar — e o personagem **acorda anos depois**, no mesmo mundo, com tudo o que fez ainda lá.
- Essas "mortes" são, na verdade, momentos em que a vida deveria ter acabado e a misericórdia deu mais tempo: a parábola da figueira estéril — "deixa-a ainda este ano" (Lc 13,6–9; 2Pd 3,9).
- **A morte real chega igual às falsas**, no fim da última fase, sem aviso: "Vigiai, porque não sabeis o dia nem a hora" (Mt 25,13). O jogador que aprendeu que "sempre volta" é pego exatamente pela vez em que não volta.
- **O Juízo Final só acontece no fim de tudo**, nunca durante as fases. Quem para nos primeiros créditos nunca sabe que ele existe.
- **A morte não depende de descobertas** (todos são julgados). As descobertas mudam **o que o juízo revela**.
- Depois do fim, "viver de novo" = **uma nova vida** (nova pessoa), gerações depois, no mesmo mundo — com o túmulo e a figueira da vida anterior lá. É o "buraco sem fundo": você sabe o que procurar.

**Regra de jogo derivada de Hb 9,27:** não existe "morrer e tentar de novo". Quedas e perigos causam recuos (fade curto, voltar à borda), nunca morte. No jogo inteiro só existe uma morte.

---

## 3. Pano de fundo teológico (oculto durante o jogo, explícito no final)

| Elemento | Durante o jogo parece… | No Juízo Final se revela… |
|---|---|---|
| Prólogo: água que cai do teto, círio alto com 5 grãos vermelhos, o Estranho acende a sua vela | Um ritual misterioso numa ruína | O seu **batismo**. "Recebei a luz de Cristo… para que, quando o Senhor vier, possais ir ao seu encontro" (rito do batismo, eco de Mt 25,1–13). Os 5 grãos do **círio pascal** são as 5 chagas |
| A vela | Sua única luz | A **graça** recebida de graça, que pede cuidado (óleo das virgens prudentes) |
| O Estranho mudo | Um andarilho que às vezes ajuda | **Cristo**, reconhecido como em Emaús (Lc 24). Mãos feridas visíveis só na luz quente. Sua única fala é no Juízo |
| O jardineiro da figueira | Alguém cuidando de uma árvore seca | O mesmo Estranho (Madalena o confundiu com o jardineiro, Jo 20,15) intercedendo: "deixa-a ainda este ano" |
| As falsas mortes | Loops, além-túmulo? | Tempo de misericórdia dado a uma vida que ainda não deu fruto |
| O cenário escuro | Terra dos mortos, limbo | **Terra dos vivos**: o mundo caído "gemendo em dores de parto" (Rm 8,22). "Agora é o tempo favorável" (2Cor 6,2) |

**Regras doutrinárias (não violar)**
- Não há segunda chance depois da morte (Hb 9,27; CIC 1021–1022). As segundas chances existem **durante a vida** (Confissão, "segunda tábua de salvação depois do naufrágio da graça perdida", CIC 1446).
- Uma só vida por save. Nada que sugira reencarnação.
- Desfechos: **Luz plena**; **Purificação** — fogo que dói mas não consome, e depois luz (Purgatório, CIC 1030–1032); **Autoexclusão** — a pessoa vira as costas e fecha a porta *por dentro* (CIC 1033). A condenação é sugerida, nunca mostrada como castigo.
- O Juízo Final revela o bem feito ou deixado de fazer "até as últimas consequências" (CIC 1039): as pessoas que sua vida tocou aparecem, e o mapa inteiro surge **em cor plena pela primeira vez** ("novos céus e nova terra").
- Simbologia durante o jogo está nos **gestos** (partir o pão, carregar alguém, ajoelhar, estender a mão), não em cruzes escondidas. Gestos parecem só humanos; no final se revelam evangélicos.

---

## 4. Sistemas

### 4.1 O coração (invisível)
Valor interno de −10 a +10, em cinco níveis: **muito ruim · ruim · médio · bom · muito bom**. Muda devagar. Nunca aparece na tela.
Atos e omissões contam ("deixastes de fazer", Mt 25,45). A gravidade depende de matéria, conhecimento e consentimento (CIC 1857): fazer algo sem enxergar pesa menos — **mas a cegueira que vem de escolhas anteriores também pesa** (CIC 1791).

### 4.2 A vela
- **Chama** e **raio de luz** crescem ou diminuem com o coração; a luz fica mais quente ou mais fria.
- **Cor do mundo**: quanto melhor o coração, mais saturado o mundo, sobretudo perto da chama.
- **O olhar** (Mt 6,22–23): detalhes que importam (a respiração na "pedra", as chagas do Estranho, pistas) só aparecem dentro da **luz quente**. Quem age mal literalmente deixa de ver as pessoas.
- **Vento comum** dobra e encolhe a chama, nunca a apaga (provação não tira a graça). Proteger a chama com a mão a mantém forte, mas deixa o personagem mais lento.
- **Pecado grave e consciente**: silêncio súbito, uma rajada fria vinda do nada **apaga a vela e o mundo inteiro fica preto e branco**.
- **Reacender**: só voltando ao lugar do mal e se ajoelhando. O Estranho vem e reacende a chama **com um sopro** (Jo 20,22–23: o sopro de Cristo ligado ao perdão dos pecados). A cor volta na hora, mas fraca: o perdão é imediato, a cura dos hábitos leva tempo (CIC 1459).

### 4.3 O corpo
Postura e andar mostram quem o personagem está se tornando (virtude e vício são hábitos, CIC 1804, 1865): ereto e leve ↔ curvado e pesado; passos mais pesados no som. Nada de chifres ou auréolas.

### 4.4 O mundo (as reações)
Pássaros pousam perto ou fogem; uma criança se aproxima ou se esconde; portas abertas ou fechadas; pessoas específicas lembram o que você fez com elas nas fases seguintes.

### 4.5 O que nunca muda: o Estranho
Ele trata o jogador exatamente igual, faça o que fizer. Tudo reage a você, menos ele. É doutrina (Deus não retira a oferta) e é pista (o jogador atento percebe que ele é a única coisa no mundo que não muda).

---

## 5. Puzzles — integrados à história

Princípios: todo puzzle está **no caminho obrigatório**; nasce de uma necessidade da história; ensina pela falha (como no Limbo); é difícil mas justo — a solução está sempre visível para quem olha; nenhum puzzle pode travar o jogo (objetos voltam se caírem onde não deviam).

| Lugar | Necessidade da história | Mecânica | Camada moral |
|---|---|---|---|
| Ruína (prólogo) | Sair da escuridão com a vela recém-recebida | Chão alagado: só a luz da vela revela as pedras firmes | Ensina que a luz revela o caminho |
| O monte do vento | Seguir o Estranho morro acima | Rajadas com aviso sonoro; avançar de abrigo em abrigo; proteger a chama | Provações não apagam a vela |
| O portão da aldeia | Entrar na aldeia; a mulher faminta está do lado de fora | Placa de pressão que só segura o portão enquanto há peso; correr não basta (ensina pela falha); é preciso trazer o caixote de um lugar alto | Se você partiu o pão com ela, ela tem forças para entrar junto e voltar para casa; se não, fica para fora |
| O abismo | O Estranho espera do outro lado, só olhando | Caminho difícil: subir até a saliência e soltar a pedra-calço para derrubar o tronco como ponte. Caminho fácil: empurrar a "pedra" escura que está ali | A "pedra" é uma pessoa morrendo de frio. Quem enxerga (luz quente) pode acordá-la |
| A fuga | A escuridão persegue | Corrida com obstáculos | O Estranho protege você, sempre |
| A figueira (fase 2) | O jardineiro rega uma figueira seca | Liberar o canal: tirar a pedra que o bloqueia e erguer a comporta | Cooperar com a graça é literalmente trabalhar junto |

---

## 6. Fatia vertical (o protótipo de ~10 minutos)

**Objetivo do teste:** o "ah, então era isso…" funciona? O personagem é gostoso de controlar? Os puzzles prendem? Arte e som convencem?

**Prólogo — A ruína (~1–2 min).** Escuro total, gotas. A criança acorda no chão de pedra. Anda até a única luz: um círio alto. Passa sob um fio d'água que cai do teto (água na cabeça). O Estranho, encapuzado, acende uma vela no círio e a põe nas mãos dela, protegendo a chama. Puzzle do chão alagado. Saída pela porta de pedra.

**Fase 1 — Infância (~6–8 min).**
1. Orla da floresta. O Estranho caminha à frente e some na névoa (seguir).
2. Riacho (pulo; cair = molhar-se e subir de volta).
3. **Pássaro preso nos espinhos** (segurar para libertar, custa tempo) — ou passar.
4. **Monte do vento** (puzzle).
5. **Carroça abandonada**: o pão (pega sozinho).
6. **A mulher faminta** junto ao portão: partir o pão — ou passar.
7. **Portão da aldeia** (puzzle). A mulher entra para casa se tiver comido.
8. **O abismo** (puzzle + escolha principal). O Estranho espera do outro lado.
9. **A fuga**: a escuridão vem; obstáculos; beco sem saída num penhasco com uma capela em ruínas; o Estranho se põe entre você e a escuridão, braços abertos; clarão; silêncio.
10. **Créditos falsos.** Volta ao título, sutilmente mudado: um vulto cava ao lado da figueira; som de enxada. Menu: só "Jogar".

**Fase 2 — Anos depois, outono (~3–4 min).**
1. Acorda na mesma orla, adulto. Fogueira do Estranho: cinzas frias.
2. Reações: pássaros (e o pássaro libertado, que vem até você), a criança, a casa da mulher (aberta e iluminada ou fechada e escura).
3. Riacho com ponte de tábuas; portão velho aberto.
4. **O abismo agora tem ponte.** Se o viajante foi acordado: ele está lá, mais velho, e acena. Se não: **um túmulo**, e alguém esperando ao lado, no frio. Quem nunca enxergou que a "pedra" era gente descobre aqui.
5. Ajoelhar no túmulo: o Estranho chega, ajoelha-se junto e, se a vela estiver apagada, a reacende com um sopro. Dar o próprio manto a quem espera (o personagem segue sem manto).
6. **A figueira** (puzzle do canal). O jardineiro rega; a água corre; cavar junto; as mãos feridas aparecem na luz quente.
7. Fim da demonstração + tela "o que o jogo registrou" (só no protótipo, para avaliar o sistema).

---

## 7. Direção de arte — a bíblia contra a "cara de IA"

**Conceito:** *uma pintura a óleo em movimento, ao entardecer.* Luz baixa, contemplativa, sagrada sem ser religiosa.

**Referências de arte (não de jogo):** Caspar David Friedrich (solidão, névoa, figuras pequenas contra a paisagem), Jean-Baptiste-Camille Corot (cinzas prateados, árvores vaporosas), Vilhelm Hammershøi (silêncio, contenção), Rembrandt e Georges de La Tour (luz de vela, claro-escuro), Andrew Wyeth (secura, textura). Referências de jogo apenas para o ritmo: Limbo, Inside, Gris.

**Regras de imagem**
- **Paleta restrita** por fase (fase 1: cinza-azulado, verde-musgo, ocre pálido; fase 2: úmbrias, ocre, âmbar; prólogo: pedra fria e o âmbar da chama). Só a chama da vela é quente de verdade.
- **Uma direção de luz** por cena: sol baixo à direita, mais a vela.
- **Pinceladas visíveis**, bordas quebradas, perspectiva atmosférica (longe = mais claro, mais azul, mais macio).
- **Figuras pequenas** num mundo grande.
- **Composição feita à mão**: cada área é composta como um quadro, sem fundos repetidos visíveis.
- **Tratamento único** em tudo, no shader do jogo: mesma gradação de cor, textura de tela, grão, vinheta. É isso que faz imagens de origens diferentes parecerem um só mundo.

**Proibido (sinais de "cara de IA")**: brilho plástico, detalhe excessivo e uniforme, saturação alta, "fantasia épica genérica", simetria perfeita, objetos derretidos ou ilógicos, mãos e rostos estranhos, perspectiva incoerente, texto/letras falsas, iluminação de cartaz de cinema, cada imagem num estilo diferente.

**Pipeline**
- **Higgsfield**: cenários pintados por área (céu, planos distantes e médios), peças principais (figueira nos 3 estados, casa, capela, portão, ponte, círio, porta da ruína) e a arte do título. Processo: (1) gerar **chaves de estilo** e aprovar com o dono do projeto; (2) usar as chaves aprovadas como **referência** em todas as gerações; (3) remover fundos, separar planos; (4) curadoria rígida — descartar o que tiver qualquer sinal da lista proibida.
- **Código (pintura procedural)**: o que precisa se mover, se repetir ou mudar entre fases com colisão exata — chão, água, névoa, primeiro plano, partículas, caixote, placa, tronco, raízes, bordas do abismo. Também serve de reserva enquanto as imagens não ficam prontas.
- **Personagens**: boneco articulado desenhado em código (silhueta pequena, manto com física, postura que muda com o coração). Plano futuro: personagem 3D renderizado em sprites com captura de movimento.

**Tipografia**
- **Título**: logotipo desenhado sob medida (letras com irregularidade de entalhe/tinta), nunca uma fonte pronta.
- **Textos** (menus, créditos): **IM Fell English** (digitalização dos tipos de Fell, século XVII — irregularidade autêntica de impressão). Itálico para os créditos.
- UI mínima: quase nada na tela. Sem HUD. Indicações de controle só no começo, discretas.

---

## 8. Som — a bíblia

- **O silêncio é um instrumento.** Há trechos quase mudos (o prólogo, o instante antes da vela apagar) e trechos em que o ambiente toma conta (o vento no monte, a escuridão).
- **Tudo tem som**: cada passo conforme o chão (grama, folhas, madeira, pedra), pulo, aterrissagem, arrastar, água caindo na terra quando o jardineiro rega, o vento que dobra a chama.
- **Camadas**: ambiente em loop longo por área (com crossfade) + pontuais + "acentos" raros (o hum do Estranho).
- **Música quase ausente** (como Limbo). Só nos créditos e em pouquíssimos momentos sagrados.
- **Geração**: ElevenLabs (efeitos por prompt), processados com ffmpeg (normalização, cortes, mono para pontuais). Seleção objetiva automática + **revisão de ouvido pelo dono do projeto**.
- Mixagem no jogo: volume por distância da fonte, pan estéreo pela posição na tela, ambientes com crossfade de 2 s entre áreas.

---

## 9. Tecnologia

- **Phaser 4** (4.2.1) + **TypeScript** + Vite. Roda direto no navegador, por um link.
- Luz da vela, cor, preto-e-branco, escuridão, vinheta e grão: um **filtro de câmera próprio** (shader) — o tratamento único da arte.
- Física Arcade com controle feito à mão para a "sensação de jogo": aceleração, coyote time, pulo guardado, altura variável, câmera que antecipa.
- **Save** no navegador + **código de save** exportável (copiar e colar). Opção escondida "apagar esta vida".
- **Modo teste** (protótipo): pular para qualquer fase e definir coração, vela e escolhas.
- Controles: teclado e **toque na tela** (o dono do projeto testa no celular).
- Publicação: página privada (Artifact) para jogar pelo link; código no repositório.

---

## 10. Decisões em aberto
- Número de fases do jogo completo (4–5?) e duração de cada uma.
- Pipeline definitivo do personagem (código vs 3D renderizado).
- O que exatamente o Juízo Final mostra para cada combinação de escolhas.
- Uma vela que encurta a cada fase (marcador de tempo de vida)?

## 11. Fora do escopo da fatia vertical
Juízo Final, fases 3+, nova vida após o fim, áreas secretas (Limbo dos Patriarcas), narrativa completa.
