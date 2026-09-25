# Agregador de Pesquisas: imagem de divulgação

Imagem horizontal 1200×628 (formato de link/OG) para o agregador de pesquisas do Ranking dos Políticos.

- `index.html`: fonte da peça (HTML + SVG, fonte Poppins local em `fonts/`, licença OFL).
- `agregador-pesquisas.png`: 1200×628. `agregador-pesquisas@2x.png`: 2400×1256 para telas retina.
- Render: `node render.mjs` (usa o Playwright instalado globalmente).

Os dados do gráfico são **ilustrativos** (gerados com semente fixa) e os candidatos são genéricos (A, B, C).
A paleta das séries (azul, laranja e aqua) foi validada para daltonismo sobre o fundo `#0d1627`.
O ícone ao lado do nome é um marcador genérico: troque-o pelo logotipo oficial se for usar a peça publicamente.
