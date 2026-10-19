# Estratégia de Testes

## Princípios

- Um teste só é reportado como "passou" se foi **de fato executado** nesta sessão — nunca inferido ou presumido (regra explícita da Fase 05).
- Prioriza-se testar **funções puras de domínio** (fáceis, rápidas, sem mock de DOM) sobre testar detalhes de implementação de componentes.
- Teste de integração > teste de snapshot: preferimos verificar comportamento (o que o usuário vê/faz) a estrutura de markup, que muda com frequência no início do projeto.

## Camadas

| Camada | Ferramenta | O que cobre | Quando |
|---|---|---|---|
| Unitária | Vitest | Funções puras (parsers Zod, filtros, normalização de busca, adapters de player com mocks) | Todo sprint, desde o 01 |
| Componente/integração | Vitest + React Testing Library | Comportamento de componentes e fluxos curtos (clicar → navegar, digitar → filtrar) | A partir do Sprint 02 |
| End-to-end | Playwright | Fluxo crítico completo (abrir catálogo → selecionar → reproduzir), só se justificado | Avaliado no Sprint 06, não antes |
| Manual (documentado) | — | Reprodução real de vídeo, responsividade em viewport real, verificação visual | Todo sprint que tocar UI/player, registrado em `progress.md` com passos exatos |

## O que NÃO testamos (e por quê)

- **Estilo visual pixel-a-pixel:** Tailwind + revisão manual é suficiente para o escopo educacional; testes de snapshot de CSS teriam custo de manutenção alto sem benefício proporcional.
- **Bibliotecas de terceiros em si** (`hls.js`, Zustand, Zod): confiamos nos testes delas; testamos apenas **nosso uso** delas (ex.: nosso adapter chama `destroy()` corretamente).

## Registro de execução

Cada sprint, ao ser reportado como concluído, deve incluir nesta seção (ou em `progress.md`) o comando exato rodado e o resultado real (ex.: `vitest run` → `12 passed, 0 failed`). Nenhuma alegação de "testado" sem esse registro.

## Sprint 02 — cobertura real do módulo de catálogo

| Pacote | Ferramenta | O que cobre | Resultado real |
|---|---|---|---|
| `packages/shared` | `bun test` | Validação dos schemas `category`/`channel`/`channelListQuery` (aceitação e rejeição) | 9 testes novos, 12 no total do pacote, 0 falhas |
| `apps/api` | `bun test` | Listagem de categorias, listagem/busca/filtro/ordenação/paginação de canais, paginação determinística (sem repetição entre páginas), 400 para parâmetros inválidos, 404 para id inexistente | 13 testes novos, 14 no total do pacote, 0 falhas |
| `apps/web` | `vitest run` + React Testing Library + `user-event` | Renderização de card (nome, descrição, selo de destaque, rótulo de status, link), esqueleto de loading, estado de erro com retry, estado vazio, busca com debounce (verificada pela URL da requisição real disparada), filtro por categoria, navegação para a página de detalhes ao clicar em um card | 12 testes novos, 16 no total do pacote, 0 falhas |

**Total Sprint 02: 34 testes novos. Total do monorepo após a sprint: 42 testes, 42 passando, 0 falhando** (comando: `bun run test`, executado e conferido — ver `progress.md` para o output completo).

### Decisão de teste notável: mock de `fetch` por rota, não por teste

Em vez de mockar `fetch` de forma ad-hoc em cada teste do frontend, `apps/web/src/tests/catalogFixtures.ts` centraliza um `mockCatalogFetch()` que inspeciona o `pathname` da URL chamada e decide a resposta — reaproveitado por todos os testes de `CatalogPage`. Isso evita duplicar a lógica de "se for /api/categories, devolva X" em oito testes diferentes, e deixa cada teste focado só no que é específico dele (ex.: só o teste de erro passa `channelsStatus: 500`).

## Sprint 03 — cobertura real do player

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `adapters/nativeAdapter.test.ts` | `attach` define `video.src`; `destroy` chama `removeAttribute("src")` + `load()`; `destroy` sem `attach` anterior não lança | 3 testes |
| `adapters/hlsAdapter.test.ts` | `attach` cria instância do `Hls` mockado, chama `loadSource`/`attachMedia`; `destroy` chama `hls.destroy()` na instância certa | 3 testes |
| `adapters/createAdapter.test.ts` | Seleção de motor: `.mp4` → nativo; `.m3u8` + suporte nativo → nativo (não baixa hls.js); `.m3u8` sem suporte nativo → hls.js | 3 testes |
| `hooks/useVideoPlayer.test.tsx` | Anexa o motor da fonte inicial; **trocar `src` destrói o motor anterior antes de criar o novo** (critério de aceitação explícito da sprint); desmontar destrói o motor ativo; eventos nativos `error`/`playing` atualizam `state.status` | 5 testes |
| `components/VideoPlayer.test.tsx` | Renderiza `<video>` com rótulo acessível; mostra "Carregando vídeo…" antes do motor terminar de anexar; expõe os controles (play/pause, volume) | 3 testes |

**Total Sprint 03: 17 testes novos. Total do monorepo após a sprint: 59 testes, 59 passando, 0 falhando.**

### Por que o teste do hook usa um `MediaSourceAdapter` falso, não o `hls.js` mockado diretamente

`useVideoPlayer.test.tsx` mocka o **módulo `createAdapter`** (não `hls.js`) e injeta dois adapters falsos (`adapterA`/`adapterB`), cada um só registrando quando `attach`/`destroy` são chamados. Isso testa exatamente o que o hook é responsável por garantir — a ORDEM de destruição/criação ao trocar de fonte — sem depender de nenhum detalhe de como o hls.js funciona por dentro (isso já está coberto, separadamente, por `hlsAdapter.test.ts`). Sem essa separação, o teste do hook ficaria acoplado a dois motores ao mesmo tempo, dificultando saber qual dos dois quebrou quando um teste falha.

### Verificação manual real (não substituível por teste automatizado)

Reprodução real testada em Chromium headless via `mcp__rea__capture_browser_scenario` (ver `progress.md` para os detalhes): clique em "Reproduzir" → manifesto HLS mestre carregado → hls.js escolheu entre as variantes de qualidade disponíveis → segmentos `.ts` baixados (HTTP 206) → vídeo "Big Buck Bunny" renderizado na tela, botão mudando para "Pausar". Zero erros de console. Nenhum teste automatizado prova que o vídeo *de fato aparece na tela* — só a verificação manual/visual faz isso, por isso ela é registrada aqui como parte da cobertura real da sprint, não como substituível pelos testes unitários.

## Sprint 04 — cobertura real de favoritos

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `lib/toggleFavoriteIds.test.ts` | Adiciona id ausente; remove id presente; não muta o array recebido; alternar duas vezes volta ao estado original | 4 testes |
| `lib/parseFavoriteIds.test.ts` | Aceita array de strings (vazio incluso); `test.each` com 7 formas de dado corrompido (string solta, número, objeto, `null`, `undefined`, array de números, array misto) — todas caem para `[]` | 11 testes |
| `store/favoritesStore.test.ts` | `toggleFavorite` adiciona/remove; persiste sob a chave `saimotv-lab:favorites`; nova instância do módulo lê o que foi persistido antes; `localStorage` com JSON inválido cai para `[]`; `localStorage` com shape inesperado (`favoriteIds` não é array de strings) cai para `[]` | 5 testes |
| `components/FavoriteButton.test.tsx` | Começa não marcado e alterna ao clicar (`aria-pressed`); clique atualiza a store compartilhada; clique dentro de um `<Link>` não navega (prova via `useLocation()`, não via mock de `preventDefault`) | 3 testes |
| `app/pages/FavoritesPage.test.tsx` | Estado vazio quando nada foi favoritado; lista só os favoritados, cruzando `favoriteIds` (client state) com dados do catálogo (server state); **fluxo completo**: favoritar em `CatalogPage` → desmontar → montar `FavoritesPage` → item aparece (prova de integração entre store singleton e composição de página) | 3 testes |

**Total Sprint 04: 24 testes novos** (nota: `parseFavoriteIds.test.ts` tem 2 testes diretos + 7 casos via `test.each`, mas apenas os 9 testes de corrupção e aceitação do arquivo somam 11 — ver contagem exata acima). **Total do monorepo após a sprint: 83 testes, 83 passando, 0 falhando.**

### Decisão de teste notável: `vi.resetModules()` + `import()` dinâmico para testar um store singleton

Zustand cria a store **uma vez**, na primeira importação do módulo — e a reidratação do `persist` a partir do `localStorage` acontece nesse exato momento. Isso significa que testar "o que acontece quando o app abre com `localStorage` já populado/corrompido" não é possível só chamando `useFavoritesStore.setState(...)` depois (a store já existe, já reidratou). A solução:

```typescript
beforeEach(() => {
  localStorage.clear();
  vi.resetModules(); // força o próximo import() a reavaliar o módulo do zero
});

test("localStorage corrompido não quebra a store", async () => {
  localStorage.setItem(STORAGE_KEY, "isto não é JSON {{{");
  const { useFavoritesStore } = await import("./favoritesStore"); // reidrata AGORA, com esse localStorage
  expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
});
```

Sem `vi.resetModules()`, o módulo ficaria em cache entre testes (comportamento padrão de `import()`/`require()`), e todos os testes dessa suíte compartilhariam a mesma instância já reidratada do primeiro teste a importar o módulo.

### Verificação manual real (não substituível por teste automatizado)

Fluxo favoritar → navegar → **recarregar de verdade** testado em Chromium real via `mcp__rea__capture_browser_scenario` (ver `progress.md`): clicar na estrela de "Horizonte Azul" em `/catalogo`, ir para `/favoritos`, confirmar que o item aparece, recarregar a página de fato (nova navegação HTTP, não um re-render em memória) e confirmar que o item continua lá — a prova de que a persistência é real (`localStorage` sobrevivendo a um reload do navegador), não só um efeito de estado React mantido em memória durante a sessão de teste automatizado. Zero erros de console.

## Sprint 05 — cobertura real de atalhos de teclado e modo cinema

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `lib/mapKeyToAction.test.ts` | Espaço → `toggle-play`; `m`/`M` → `toggle-mute`; `ArrowUp`/`ArrowDown` → `volume-up`/`volume-down`; `t`/`T` → `toggle-theater`; qualquer outra tecla → `null` | 5 testes |
| `store/playerUiStore.test.ts` | Começa com `isTheaterMode: false`; `toggleTheaterMode` alterna o estado nos dois sentidos | 2 testes |
| `components/VideoPlayer.test.tsx` (3 testes novos) | Botão "Modo cinema" alterna `aria-pressed` e o estado compartilhado da store ao clicar; a tecla "T", com o player focado, também alterna o modo cinema; a tecla `ArrowDown`, com o player focado, reduz o valor refletido no slider de volume | 3 testes (total do arquivo: 6) |
| `app/pages/ChannelDetailPage.test.tsx` (novo arquivo) | Clicar em "Modo cinema" muda o atributo `data-theater-mode` do `<article>` da página de `"false"` para `"true"` — prova de que a composição (`ChannelDetailPage` lendo `useIsTheaterMode()`) funciona de ponta a ponta, não só o botão isolado | 1 teste |

**Total Sprint 05: 11 testes novos** (5 + 2 + 3 + 1). **Total do monorepo após a sprint: 94 testes, 94 passando, 0 falhando.**

### Decisão de teste notável: testar o atalho de teclado via `user.keyboard()` com o elemento focado, não via `fireEvent.keyDown` direto

```typescript
const player = screen.getByRole("group");
player.focus();
await user.keyboard("t");
expect(usePlayerUiStore.getState().isTheaterMode).toBe(true);
```

`user.keyboard()` (de `@testing-library/user-event`) despacha a sequência completa de eventos que um teclado real dispara (`keydown`/`keypress`/`keyup`), no elemento que está de fato focado no momento — diferente de `fireEvent.keyDown(elemento, { key: "t" })`, que dispara só o evento `keydown` manualmente no elemento indicado, sem passar pelo mecanismo real de foco do navegador. Como o próprio comportamento sendo testado é "o atalho só funciona com o player focado" (ADR-021), usar `user.keyboard()` depois de `player.focus()` testa exatamente essa dependência — um teste com `fireEvent.keyDown` não provaria que o foco importa, porque dispararia o evento independentemente de qualquer estado de foco real.

### Problema real encontrado por este teste (não hipotético)

O primeiro teste a de fato acionar `play()` (via atalho de espaço) revelou que `video.play().catch(...)` falha em `jsdom` porque `HTMLMediaElement.prototype.play()` devolve `undefined`, não uma `Promise`, nesse ambiente — um caso concreto de "o teste automatizado encontrou um bug que a verificação manual de navegador real (Sprint 03) nunca teria encontrado", porque em um navegador real `play()` sempre devolve uma `Promise`. Ver `progress.md` e `learning.md` para o detalhe completo. Corrigido em `useVideoPlayer.ts` com `Promise.resolve(video.play())`.

### Verificação manual real (não substituível por teste automatizado)

Modo cinema e atalhos de teclado testados em Chromium real via `mcp__rea__capture_browser_scenario` (ver `progress.md`): clique no botão "Modo cinema" alargando visivelmente o player; foco no player + tecla "T" alternando o estado sem erro; foco no player + três `ArrowDown` reduzindo visivelmente a posição do controle deslizante de volume (~70% da trilha, consistente com os 3 decrementos de 10%). Zero erros de console nas três execuções.

## Correção pós-Sprint 05 — cobertura real da home e da mídia por categoria

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `app/pages/HomePage.test.tsx` | Mostra título e links para `/catalogo` e `/favoritos`; carrega e exibe os destaques reais do catálogo (mesma API de `/catalogo`) | 2 testes |
| `features/player/lib/demoStream.test.ts` | Categorias diferentes devolvem streams diferentes; a mesma categoria é sempre determinística; categoria desconhecida cai para a stream padrão (nunca `undefined`) | 3 testes |

**Total: 5 testes novos. Total do monorepo: 99 testes, 99 passando, 0 falhando.**

## Integração TMDB — cobertura real

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `lib/tmdb/tmdbClient.test.ts` (backend) | Sem chave → `null`, zero chamadas de rede; resultado encontrado → campos normalizados (incluindo `backdrop_path` → URL completa); sem resultado → `null`; resposta não-OK → `null`; erro de rede → `null`; `backdrop_path` ausente → `null` sem quebrar os outros campos; cache evita 2ª chamada de rede para a mesma busca | 7 testes |
| `catalog.test.ts` (backend, bloco "Enriquecimento com TMDB") | Canal marcado (ch-01) tem `tmdb` presente mesmo sem chave (cai para `null`); canal fictício nunca tem o campo `tmdb` na resposta; a listagem enriquece cada item igual ao endpoint de detalhe | 3 testes — **nunca fazem chamada de rede real**: `TMDB_API_KEY` é explicitamente vazia em `apps/api/.env.test` |
| `catalog.test.ts` (shared) | Aceita canal sem `tmdb`; aceita `tmdb: null`; aceita metadados reais preenchidos | 3 testes |
| `ChannelCard.test.tsx` | Usa `tmdb.backdropUrl` quando presente; cai para `thumbnail` quando ausente (comportamento original preservado) | 2 testes |
| `ChannelDetailPage.test.tsx` | Mostra sinopse real + atribuição quando `tmdb` presente; mostra descrição fictícia sem atribuição quando ausente; `overview` vazio (caso real encontrado em produção) cai para a descrição fictícia mas mantém a atribuição (ADR-025) | 3 testes |

**Total: 18 testes novos. Total do monorepo: 117 testes, 117 passando, 0 falhando.**

### Por que `catalog.test.ts` nunca faz uma chamada de rede real ao TMDB

Diferente de `tmdbClient.test.ts` (que mocka `fetch` diretamente, testando o cliente isoladamente), os testes de integração do catálogo (`app.request()`, exercitando a rota completa) dependem de `env.TMDB_API_KEY` estar vazia — garantido por `apps/api/.env.test`, carregado automaticamente pelo Bun quando `NODE_ENV=test`. Isso é verificado hoje porque nenhuma chave real existe nesse arquivo; é uma garantia que vale a pena reconferir se o processo de configuração de ambiente mudar no futuro (ver ADR-024, "Limitação conhecida").

## `/filmes` — cobertura real

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `movies.test.ts` (shared) | `movieSchema` aceita filme válido e nulos onde esperado, rejeita `streamUrl` inválida e `genres` que não é array; `movieListQuerySchema` aplica padrão, aceita filtro+ordenação, rejeita sort inválido | 7 testes |
| `movies.test.ts` (backend) | Lista só os filmes resolvidos com sucesso; ordena por recência e por A-Z; filtra por gênero real (incluindo gênero sem resultado → lista vazia, não erro); lista só os gêneros que aparecem no acervo atual; detalhe de um filme existente; 404 para filme não-resolvido e para id inexistente | 9 testes — `tmdbClient` mockado via `mock.module` (dados determinísticos, não depende de `.env.test`) |
| `MovieCard.test.tsx`, `GenreFilter.test.tsx`, `SortControl.test.tsx` | Renderização, fallback de imagem ausente, navegação, interação de filtro/ordenação | 9 testes |
| `MoviesPage.test.tsx`, `MovieDetailPage.test.tsx` | Listagem, filtro por gênero reduzindo a grade, estado vazio, detalhe com sinopse/atribuição reais, stream próprio do filme (via `createAdapter` mockado, não leitura de `video.src`) | 7 testes |
| `VideoPlayer.test.tsx` (1 teste novo) | `isRealContent=true` mostra o aviso correto, nunca "não é o conteúdo real" | 1 teste |

**Total: 33 testes novos. Total do monorepo: 151 testes, 151 passando, 0 falhando.**

### Por que `movies.test.ts` (backend) mocka `tmdbClient` via `mock.module`, diferente de `catalog.test.ts`

`catalog.test.ts` confia em `TMDB_API_KEY` vazia (`.env.test`) para nunca fazer chamada real — suficiente lá porque só precisa provar "com/sem enriquecimento" (`null` vs. ausente). `movies.test.ts` precisa de MAIS que isso: precisa verificar ordenação por ano e filtro por gênero sobre dados REAIS variados — impossível de testar de forma determinística se toda busca sempre devolve `null`. `mock.module("../../lib/tmdb/tmdbClient", () => ({...}))`, chamado antes de um `await import("../../app")` dinâmico (não um import estático no topo do arquivo), garante que o mock é aplicado antes do grafo de módulos do app carregar a versão real — confirmado, rodando a suíte completa repetidamente, que o mock fica isolado a este arquivo (não corrompe `catalog.test.ts`, que roda com o `tmdbClient` real).

### Verificação manual real, com a chave de API real do usuário (não simulada)

`curl` direto à API confirmou `tmdbId`/`backdropUrl`/`releaseYear` reais para os 2 canais marcados. Em navegador real (`mcp__rea__capture_browser_scenario`): grade do catálogo mostrando fotos reais de "Big Buck Bunny"/"Tears of Steel" ao lado dos ícones genéricos dos 18 canais fictícios; detalhe de "Tears of Steel" com pôster, ano e sinopse reais em português. Essa verificação foi o que revelou o caso real do `overview` vazio corrigido pela ADR-025 — um exemplo de bug encontrado por testar com dados reais, não um mock, que nenhum teste automatizado (que usa dados inventados) teria revelado sozinho.

### Verificação manual real — a mais próxima de "prova de conteúdo", não só de mecânica

Diferente de toda verificação anterior do player (que sempre confirmava a MECÂNICA — troca de motor, controles, atalhos — com a mesma mídia de fundo), esta foi a primeira verificação a confirmar **conteúdo diferente entre navegações**, via captura de **rede real** (não só screenshot): abrir um canal de "Documentários" e depois um de "Ficção & Séries" no mesmo `mcp__rea__capture_browser_scenario`, com `capture.events` incluindo `"network"`. O resultado mostrou dois conjuntos de requisições completamente distintos — `x36xhzz/url_0/193039199_mp4_h264_aac_hd_7.ts` (HLS tradicional, segmentos `.ts`) para Documentários, e `tos_ismc/tos_1080p/init.mp4` + `1.m4s` (HLS com fMP4, um formato de segmentação diferente) para Ficção & Séries — todos HTTP 206, zero page errors. Essa é uma evidência mais forte do que um screenshot: prova que o **navegador de fato baixou bytes diferentes**, não só que a tela mostrou algo visualmente diferente.

## Sprint 02.5 (Visual) — cobertura real

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `AppShell.test.tsx` (substitui `PageShell.test.tsx`) | Duas navegações (desktop+mobile) coexistem no DOM com o mesmo rótulo acessível; link "Início" presente nas duas; nenhuma `role="complementary"` (sidebar) sobrevive | 3 testes |
| `MoviePosterCard.test.tsx` (substitui `MovieCard.test.tsx`) | Título+metadados; usa `posterUrl` (não `backdropUrl`); mostra nota real quando presente; placeholder sem pôster/nota; link correto | 5 testes |
| `MoviesPage.test.tsx` (+2 testes novos) | Com ≤4 filmes, o trilho "Em destaque" NÃO aparece duplicado sobre a grade; com >4, aparece com os mais recentes | 2 testes |
| `tmdbClient.test.ts` (atualizado) | Normalização de `poster_path`→`posterUrl` e `vote_average`→`rating` (incluindo `vote_average: 0` → `null`, não "nota zero") | cobertura estendida nos testes já existentes |

**Total: 99 testes no `apps/web` (era 95; +9 novos, -5 removidos com `MovieCard`/`PageShell`). Total do monorepo: 155 testes, 155 passando, 0 falhando.**

### Por que esta sprint não tem testes automatizados de "regressão visual" (screenshot-diff)

Diferente da cobertura funcional (sempre testada com Vitest/bun:test), a comparação visual desta sprint foi feita manualmente: capturar referência e local no mesmo viewport via `mcp__rea__capture_browser_scenario`, comparar como humano/IA, corrigir, recapturar — documentado passo a passo em `visual-regression.md`. Automatizar isso (rodar a cada CI, falhar se o layout mudar sem intenção) é um candidato de trabalho futuro, não decidido nesta sprint (ver "Problemas conhecidos" em `visual-regression.md`).
