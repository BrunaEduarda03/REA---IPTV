# Visual Regression — Sprint 02.5

## Ferramenta usada (e por que não Playwright)

A Sprint pedia "configure um processo de validação com Playwright". Decidimos **não adicionar Playwright como dependência nova** e usar `mcp__rea__capture_browser_scenario` (MCP REA) — a mesma ferramenta de captura de navegador real já usada em TODA a Fase 05 para verificação end-to-end (Sprints 01-05, integração TMDB, etc.), com suporte nativo a viewport customizado, screenshot determinístico e captura de console/erros de página.

**Justificativa**, seguindo a instrução explícita da própria Sprint ("não introduza novas dependências sem necessidade", ETAPA 4): Playwright resolveria exatamente o mesmo problema que o REA já resolve aqui (abrir um Chromium real, navegar, capturar) — adicioná-lo como `devDependency` só para este propósito duplicaria uma capacidade já presente no ambiente, sem nenhum ganho real de cobertura. Registrado como ADR-027.

## Processo seguido

Para cada viewport pedido (1440×900, 1280×800, 768×1024, 390×844):

1. Capturar a referência (`saimo-tv.pages.dev/movies`) — ver `visual-audit.md`, ETAPA 1.
2. Capturar `/filmes` local, no mesmo viewport.
3. Comparar estrutura e composição (não pixel a pixel — conteúdo é diferente entre as duas aplicações, por design) — ver `visual-audit.md`, ETAPA 2, para a tabela completa.
4. Identificar os problemas de maior impacto.
5. Corrigir o problema de maior impacto.
6. Capturar de novo, confirmar.

## Os 5 problemas de maior impacto identificados (antes da implementação)

1. **Navegação em sidebar administrativa**, não horizontal — estrutural (P0).
2. **Cards de filme em 16:9**, não pôster 2:3 — estrutural (P0).
3. **Nenhum fundo cinematográfico** — cor sólida chapada (P1).
4. **Nenhum trilho horizontal** — só grade, sem a sensação de "catálogo vivo" (P1).
5. **Cabeçalho de página fraco** — título pequeno, sem destaque numérico (P1).

Todos os 5 foram corrigidos nesta sprint (ver `design-system.md` para os componentes criados).

## Problema encontrado DEPOIS da primeira implementação (ciclo de iteração real)

A primeira versão do `TopNavigation`/`MobileNavigation` usava o breakpoint `md` (768px) do Tailwind. Capturando `/filmes` local em 768×1024 e comparando com a captura da referência no MESMO viewport, dois problemas ficaram visíveis:

1. A navegação horizontal ainda aparecia a 768px (a referência já tinha trocado para a barra de abas nesse viewport).
2. A logo "SaimoTV Lab" quebrava em duas linhas ("SaimoTV" / "Lab"), apertada contra os itens de navegação.

**Correção:** breakpoint trocado de `md` (768px) para `lg` (1024px) em `TopNavigation.tsx`, `MobileNavigation.tsx` e `AppShell.tsx` (padding reservado para a barra de abas); `whitespace-nowrap` adicionado à logo. Recapturado em 768×1024 — confirmado: barra de abas aparece, logo não quebra mais. Ver captura `local_768x1024_fixed` (depois) vs. a primeira tentativa.

## Comparação por viewport (resumo)

| Viewport | Referência | Nossa implementação (depois) | Zero erros de console? |
|---|---|---|---|
| 1440×900 | Nav horizontal, header "On Demand", categorias ilustradas, trilho | Nav horizontal, header "Filmes" + "4 títulos", filtros de gênero reais, grade de pôsteres 2:3 | ✅ |
| 1280×800 | Igual, mais compacto | Igual, mais compacto; sem quebra de layout | ✅ |
| 768×1024 | Barra de abas no rodapé, título abaixo do pôster | Barra de abas no rodapé (após correção), título abaixo do pôster | ✅ |
| 390×844 | Barra de abas, 1 categoria + fração visível | Barra de abas, 2 pôsteres por linha, filtros em quebra de linha | ✅ |

Todas as capturas (referência e local, 4 viewports cada + a correção do breakpoint) foram feitas com `mcp__rea__capture_browser_scenario`, com `capture.events: ["console", "page-errors"]` — **zero page errors e zero console warnings não-debug em todas as 9 execuções** desta sprint (4 referência + 4 local + 1 recaptura do fix).

## O que NÃO foi replicado (decisão deliberada, registrada para não ser "esquecida")

- **Seção "Categorias" ilustrada** (tiles grandes com colagem de pôsteres de fundo): não implementada — exigiria um novo tipo de asset (colagem de imagens por categoria) que não existe no nosso domínio real (`Movie`/`Channel` não têm esse conceito). Nossos `GenreFilter`/`CategoryFilter` (pílulas simples) cobrem a mesma FUNÇÃO (filtrar por categoria/gênero), só não a mesma apresentação ilustrada.
- **Barra única combinando breadcrumb + abas de seção + busca + ordenação**: mantivemos `GenreFilter` e `SortControl` como controles separados (mais simples de testar isoladamente, e nossa aplicação tem só 2 seções reais — `/catalogo` e `/filmes` — não 5 como a referência, então uma barra de abas de seção não se aplicaria da mesma forma).
- **Estados de hover/focus da referência**: não capturados (a ferramenta de automação disponível não tem ação de "hover"). Nossos próprios estados de hover/focus (`group-hover:-translate-y-1`, `shadow-elevated`, `:focus-visible` global) foram implementados com base no PADRÃO esperado de um card de mídia interativo, não copiados de nenhuma observação pixel-a-pixel da referência (que não conseguimos capturar).

## Problemas conhecidos / ajustes pendentes

- O breakpoint exato em que a referência troca de navegação não foi medido com precisão além de "já troca em 768px" — não testamos um viewport intermediário (ex.: 900px) na referência para encontrar o ponto exato. Nosso corte em 1024px é mais conservador (troca mais cedo, ou seja, mostra a barra de abas numa faixa um pouco maior de larguras).
- `CatalogPage`/`FavoritesPage` ganharam `PageHeader` (consistência visual), mas não um trilho `FeaturedSection` — fora do escopo desta sprint, que pediu foco em `/filmes`.
- Nenhum teste de regressão visual AUTOMATIZADO (screenshot-diff rodando em CI) foi configurado — o processo desta sprint foi manual (capturar, comparar, corrigir, recapturar), documentado aqui para repetição manual futura. Automatizar isso é um candidato de sprint futura, não decidido agora.
