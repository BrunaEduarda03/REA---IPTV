# Progress — Implementação

## Sprint 0 — Planejamento (atual)

- **Funcionalidades concluídas:** nenhuma (sem código ainda, por instrução explícita do usuário).
- **Testes executados:** nenhum.
- **Problemas encontrados:** os 5 arquivos de auditoria/planejamento que o usuário esperava encontrar em `docs/reverse-engineering/` não existiam (`04-5-technical-audit.md`, `evidence-matrix.md`, `gap-analysis.md`, `feature-prioritization.md`, `05-implementation-plan.md`) — mapeados para os equivalentes reais (`auditoria-tecnica-final.md` e seções correspondentes) e comunicado ao usuário.
- **Documentos produzidos nesta sessão:** `docs/implementation/{README,architecture,decisions,backlog,progress,testing,learning}.md`.
- **Próximo passo:** aguardar aprovação do usuário sobre: (1) localização do código (ADR-001), (2) escopo do MVP (`backlog.md`), (3) gerenciador de pacotes (npm vs. Bun). Após aprovação, iniciar Sprint 01.

---

## Sprint 01 — Fundação Full Stack ✅ Concluída

**Funcionalidades concluídas:**
- Monorepo com Bun Workspaces (`apps/web`, `apps/api`, `packages/shared`, `packages/config`).
- Backend Hono (`apps/api`) com middleware de log, middleware de erro, validação de env com Zod, CORS restrito à origem do frontend, e `GET /api/health`.
- Frontend React + Vite + TypeScript strict + Tailwind, com design tokens próprios (paleta âmbar sobre slate escuro, deliberadamente distinta da identidade visual do Saimo TV).
- Layout principal: `Sidebar` (navegação, recolhível via Zustand), `TopBar` (título + indicador de conexão, só em dev), `PageShell` (composição), páginas `HomePage`/`NotFoundPage`, roteamento via React Router.
- Contrato compartilhado (`@saimotv/shared`): `healthResponseSchema` (Zod) consumido por `apps/web` e `apps/api` sem duplicação de tipos.
- Comunicação real frontend↔backend via TanStack Query (`useHealthQuery`), com estados de loading/online/erro visíveis.
- Zustand usado exclusivamente para estado de UI (`isSidebarOpen`) — nenhuma resposta HTTP é guardada ali.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  3 pass, 0 fail (bun test)
apps/api:         1 pass, 0 fail (bun test)
apps/web:         4 pass, 0 fail (vitest run)
```
Total: **8 testes, 8 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (packages/shared, apps/api, apps/web)
$ bun run lint        → sem erros (apps/api, apps/web)
$ bun run build       → sucesso (apps/api: bundle Bun 225 KB; apps/web: bundle Vite 435 KB / 135 KB gzip)
```

**Verificação end-to-end real:** os dois servidores de desenvolvimento foram iniciados (`bun run dev:api`, `bun run dev:web`), testados via `curl` (incluindo verificação do header `Access-Control-Allow-Origin`), e a aplicação foi carregada em um Chromium real (via `mcp__rea__capture_browser_scenario`) — screenshot confirmou o layout renderizado e o indicador "API online (saimotv-lab-api)" em verde, prova de que a cadeia completa (Vite → React → TanStack Query → fetch → CORS → Hono → Zod → JSON → Zod → React) funciona de ponta a ponta. Nenhum erro de console além de um 404 de favicon, corrigido em seguida.

**Problemas encontrados e resolvidos:**
1. `@types/bun` resolvia mas `tsc` não encontrava `bun-types` — a opção `compilerOptions.types` precisa do nome da pasta sob `node_modules/@types/` (`"bun"`), não do nome do pacote npm (`bun-types`). Corrigido em `apps/api/tsconfig.json` e `packages/shared/tsconfig.json`.
2. `vitest@2.x` tem peer dependency em `vite@^5`, conflitando com `vite@^6` do projeto — causou duas cópias de Vite instaladas e um erro de tipos incompatíveis entre `vite.config.ts` e `vitest.config.ts`. Resolvido subindo para `vitest@^3.0.0` (ADR-011).
3. `vitest.config.ts` não herdava o alias `@` de `vite.config.ts` (são arquivos de config separados) — os dois primeiros testes de frontend falharam por não resolver imports `@/...`. Corrigido duplicando o `resolve.alias` em `vitest.config.ts`.
4. Teste de estado de erro do `ConnectionStatus` falhava porque `useHealthQuery` fixava `retry: 1` no nível do hook, sobrescrevendo o `retry: false` do `QueryClient` de teste. Corrigido removendo o `retry` do hook, deixando a política a cargo do `QueryClient` (produção define `retry: 1`; testes definem `retry: false`).
5. Processos de `bun run dev` iniciados em background com `&` não foram encerrados por `kill %1` numa chamada de terminal seguinte — cada chamada do Bash é um shell novo, sem a tabela de jobs da chamada anterior. Corrigido localizando e encerrando os processos por porta (`lsof -ti:3001,5173 | xargs kill`).

**Próximo passo:** aguardar aprovação explícita do usuário antes de iniciar a Sprint 02 (catálogo).

## Sprint 02 — Catálogo Full Stack ✅ Concluída (aguardando aprovação para Sprint 03)

**Contexto recuperado antes de começar:** `git status` limpo, Sprint 01 já commitada pelo usuário (`0efc87a`), `bun --version` 1.4.3 confirmado, `bun run typecheck`/`bun run test` reconfirmados verdes antes de qualquer alteração — nenhum bloqueio.

**Funcionalidades concluídas:**
- Modelos de domínio compartilhados (`Category`, `Channel`, `ChannelListQuery`, `ChannelListResponse`, `ApiError`) em `packages/shared`.
- Módulo de backend em camadas (`apps/api/src/modules/catalog/`: routes → service → repository → fixtures), com busca accent-insensitive, filtro por categoria, ordenação determinística (3 modos) e paginação determinística.
- 5 categorias e 20 conteúdos fictícios originais (nomes, descrições e 5 thumbnails SVG próprias, uma por categoria) — nenhum dado do Saimo TV reutilizado.
- 3 endpoints REST: `GET /api/categories`, `GET /api/channels` (busca/filtro/paginação/ordenação), `GET /api/channels/:id`, com contrato de erro único (`{error, issues?}`) para 400/404/500.
- `@hono/zod-validator` para validação de query/param, com formatação de erro customizada.
- Página de catálogo (`/catalogo`): busca com debounce, filtro por categoria (pílulas), alternância grade/lista, paginação, skeleton de loading, estado de erro com "tentar novamente", estado vazio.
- Página de detalhes (`/catalogo/:id`) com skeleton próprio e tratamento de erro/404.
- 3 hooks TanStack Query (`useCategories`, `useChannels`, `useChannel`) com `staleTime` e `placeholderData` diferenciados por natureza do dado.
- Estado de visualização grade/lista em Zustand (`catalogUiStore`); busca/filtro/página inteiramente na URL (`useSearchParams`) — nenhuma duplicação entre os três mecanismos de estado.
- Sidebar atualizada com o item "Catálogo".

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  12 pass, 0 fail  (3 health + 9 catalog)
apps/api:         14 pass, 0 fail  (1 health + 13 catalog)
apps/web:         16 pass, 0 fail  (2 layout + 2 health + 5 ChannelCard + 7 CatalogPage)
```
Total: **42 testes, 42 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso (api: 241 KB; web: 462 KB / 143 KB gzip)
```

**Verificação end-to-end real:** API e frontend iniciados de verdade (`bun run dev:api`/`dev:web`), endpoints testados via `curl` (`/api/categories`, `/api/channels` com busca/filtro, `/api/channels/:id`, 404), e a aplicação carregada em um Chromium real via `mcp__rea__capture_browser_scenario` com uma interação real (clique na pílula "Esportes"). Screenshots confirmaram: grade com 8 cards na primeira página (ordenados com destaques primeiro), thumbnails SVG renderizando corretamente, rótulo "Em breve" no item `coming_soon`, e o filtro por categoria reduzindo a grade para exatamente os 4 canais de Esportes em tempo real, sem nenhum erro de console.

**Problemas encontrados e resolvidos:**
1. `noUncheckedIndexedAccess: true` (do `tsconfig.base.json`) fazia `mockChannels[0]` tipar como `Channel | undefined` nos testes — corrigido exportando constantes nomeadas (`mockFeaturedChannel`, `mockComingSoonChannel`) em vez de depender de acesso por índice.
2. `vi` (do Vitest) não era reconhecido em `catalogFixtures.ts` porque o arquivo não é um arquivo de teste (`globals: true` só injeta `vi` durante a execução de testes, não para `tsc` analisar um módulo comum) — corrigido com `import { vi } from "vitest"` explícito.
3. Um callback `.some(([input]) => ...)` em um teste tipou `input` implicitamente como `any` sob `strict` — corrigido com anotação de tipo explícita no parâmetro.
4. `bg-danger-muted/40` (modificador de opacidade do Tailwind) não funciona sobre uma cor definida como `var(--cor-hexadecimal)` direta no `tailwind.config.ts` — corrigido removendo o modificador de opacidade (o token já é "mudo" por definição).

**Próximo passo:** aguardar aprovação explícita do usuário antes de iniciar a Sprint 03 (player).

## Sprint 03 — Player ✅ Concluída (aguardando aprovação para Sprint 04)

**Contexto recuperado antes de começar:** `git status` limpo (Sprint 02 já commitada pelo usuário, `d7af838`), `bun run test` reconfirmado em 42/42 antes de qualquer alteração — nenhum bloqueio. Diferente das Sprints 01/02, esta foi autorizada por uma instrução direta ("vá para sprint 3"), sem um prompt detalhado novo — a especificação usada foi a já aprovada em `backlog.md` (item 7, "Player de vídeo") e as ADRs já registradas (ADR-005).

**Funcionalidades concluídas:**
- `MediaSourceAdapter`: interface comum (`attach`/`destroy`) para dois motores de reprodução.
- `nativeAdapter` — delega ao `<video>` nativo (MP4 progressivo, ou HLS em navegadores com suporte nativo).
- `hlsAdapter` — `hls.js` importado **dinamicamente** (chunk separado, confirmado pelo build), com tradução de erros fatais do hls.js para um evento sintético compreendido pelo hook.
- `createAdapter` — escolhe o motor testando a URL (`.m3u8` + suporte nativo do navegador).
- `useVideoPlayer` — hook de orquestração: cria/destrói o motor a cada troca de `src` (nunca dois motores ativos ao mesmo tempo), traduz eventos nativos do `<video>` em `PlayerState`, expõe `play`/`pause`/`toggleMute`/`setVolume`, com guard contra condição de corrida.
- `VideoPlayer` + `PlayerControls` — componente de apresentação com overlays de loading/erro e controles acessíveis.
- Integração em `ChannelDetailPage`: conteúdos com `status: "available"` mostram o player (com a mídia de demonstração, ADR-005); os demais mantêm a thumbnail estática.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  12 pass, 0 fail
apps/api:         14 pass, 0 fail
apps/web:         33 pass, 0 fail  (9 arquivos de teste, incluindo os 17 novos da feature player)
```
Total: **59 testes, 59 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso; hls.js confirmado em chunk separado (595 KB, só baixado sob demanda)
```

**Verificação end-to-end real (a mais significativa até agora):** API e frontend reais iniciados, página `/catalogo/ch-01` aberta em Chromium real via `mcp__rea__capture_browser_scenario`, botão "Reproduzir" clicado de verdade. A captura de rede confirmou **reprodução HLS real**: manifesto mestre (`x36xhzz.m3u8`, HTTP 206) → três variantes de qualidade carregadas pelo hls.js → segmentos `.ts` reais baixados e decodificados. Screenshot confirmou o vídeo "Big Buck Bunny" (mídia de teste pública licenciada Creative Commons) renderizado na tela, botão alternando para "Pausar", controle de volume refletindo o estado. **Zero erros de console, zero page errors.**

**Problemas encontrados e resolvidos:**
1. `bg-surface-base/70`/`bg-surface-base/90` (modificador de opacidade do Tailwind) não funcionam sobre tokens definidos como `var(--cor-hex)` — mesmo problema já visto na Sprint 02 (`ErrorState`), desta vez nos overlays do `VideoPlayer`; corrigido usando `bg-black/70`/`bg-black/90` (cor nativa do Tailwind, que suporta o modificador).
2. Um comentário `eslint-disable-next-line jsx-a11y/media-has-caption` referenciava uma regra de um plugin não instalado neste projeto — ESLint falhou com "Definition for rule not found"; corrigido removendo o comentário (a regra nunca esteve ativa aqui).
3. `createAdapter.test.ts` mockava `hls.js` de forma incompleta (construtor sem método `.on()` na instância) — `hlsAdapter.attach()` lançava `TypeError: hls.on is not a function` ao rodar o teste de seleção de motor; corrigido alinhando o mock ao shape real usado por `hlsAdapter.ts`.
4. `renderHook` (Testing Library) não monta nenhum `<video>` real no DOM — o hook, que depende de `videoRef.current` preenchido, nunca chegava a chamar `attach()`. Corrigido trocando para um componente de teste (`Harness`) que renderiza o `<video>` de verdade com `render()`, do mesmo jeito que `VideoPlayer.tsx` faz em produção.

**Próximo passo:** aguardar aprovação explícita do usuário antes de iniciar a Sprint 04 (estado e preferências — favoritos, persistência local).

## Sprint 04 — Estado e preferências (Favoritos) ✅ Concluída (aguardando aprovação para Sprint 05)

**Contexto recuperado antes de começar:** `git status` limpo (Sprint 03 ainda não commitada pelo usuário no momento da autorização, mas sem nenhuma alteração pendente de sprints anteriores), autorizado por instrução direta ("siga para sprint 4"), sem prompt detalhado novo — especificação usada foi a já aprovada em `backlog.md` (item 9, "Favoritos locais").

**Funcionalidades concluídas:**
- `toggleFavoriteIds` — função pura de domínio (adiciona/remove id sem mutar o array recebido).
- `parseFavoriteIds` — validação Zod de fronteira (`z.array(z.string())`), cai para `[]` em qualquer shape inesperado.
- `favoritesStore` — Zustand com `persist` (chave `saimotv-lab:favorites`) e `merge` customizado validado por Zod.
- `FavoriteButton` — botão de estrela com `aria-pressed`, `preventDefault`/`stopPropagation` (nested em `<Link>`).
- Slot de composição `actions?: ReactNode` em `ChannelCard`, usado por `CatalogPage` e `ChannelDetailPage` para injetar o `FavoriteButton` sem acoplar `catalog` a `favorites` (ADR-017).
- `FavoritesPage` (rota `/favoritos`) — cruza `favoriteIds` (estado de cliente) com `useChannels` (estado de servidor, já existente) sem endpoint novo (ADR-019); estados de loading/erro/vazio tratados.
- Sidebar atualizada com o item "Favoritos".

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  12 pass, 0 fail
apps/api:         14 pass, 0 fail
apps/web:         57 pass, 0 fail  (24 novos: 4 toggleFavoriteIds + 9 parseFavoriteIds + 5 favoritesStore + 3 FavoriteButton + 3 FavoritesPage)
```
Total: **83 testes, 83 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real:** API e frontend reais iniciados (`bun run dev:api`/`dev:web`, confirmados com `curl` retornando `200` em `/api/channels` e em `/favoritos`), fluxo completo executado em Chromium real via `mcp__rea__capture_browser_scenario`: clique no botão de favoritar "Horizonte Azul" em `/catalogo` → navegação para `/favoritos` → item aparece → **recarregamento real de página** (`goto` na mesma URL, não só um re-render em memória) → item continua aparecendo, provando que a persistência é de fato via `localStorage` e não só estado React em memória. Zero erros de console, zero page errors (único console output: mensagens de debug do HMR do Vite e do React DevTools, já observadas em sprints anteriores).

**Problemas encontrados e resolvidos:**
- Nenhum problema novo de build/tooling nesta sprint — os quatro padrões recorrentes de sprints anteriores (alias do Vitest, `noUncheckedIndexedAccess`, opacidade do Tailwind em cores customizadas) já estavam resolvidos/conhecidos e não reapareceram em código novo.

**Próximo passo:** aguardar aprovação explícita do usuário antes de iniciar a Sprint 05 (experiência avançada). *(Nota: o usuário autorizou Sprint 04 e 05 juntas em "siga para sprint 4" + confirmação de prosseguir para a 5 — ver seção abaixo.)*

## Sprint 05 — Experiência avançada (Atalhos de teclado + Modo cinema) ✅ Concluída (aguardando aprovação para Sprint 06)

**Contexto recuperado antes de começar:** `git status` com as mudanças da Sprint 04 ainda não commitadas (esperado — o usuário commita manualmente após cada relatório de entrega); autorizado por instrução direta do usuário ("sprint 4 e 5 faça"), cobrindo as duas sprints em uma única autorização. Diferente das sprints anteriores, o escopo exato do Sprint 05 **não estava pré-definido em `backlog.md`** (que lista 6 itens "Opcionais" e exige decisão explícita antes de começar) — a escolha de quais itens implementar (atalhos de teclado + modo cinema) foi feita nesta sessão e registrada em ADR-020, com justificativa de por que os outros 4 itens (Picture-in-Picture, espelhamento de tela, D-pad, EPG sintético, layout TV) ficam para uma sprint futura.

**Funcionalidades concluídas:**
- `mapKeyToAction` — função pura de domínio (tecla → intenção: `toggle-play`, `toggle-mute`, `volume-up`, `volume-down`, `toggle-theater`).
- `playerUiStore` — Zustand simples (não persistido) com `isTheaterMode`.
- Atalhos de teclado no player: Espaço (play/pause), ↑/↓ (volume ±10%), M (mudo), T (modo cinema) — escopados ao contêiner do player via `tabIndex`/`onKeyDown` (ADR-021), não globais.
- Botão "Modo cinema" em `PlayerControls`, com `aria-pressed`.
- `ChannelDetailPage` alarga seu próprio contêiner (`max-w-2xl` → `max-w-5xl`) quando o modo cinema está ativo.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  12 pass, 0 fail
apps/api:         14 pass, 0 fail
apps/web:         68 pass, 0 fail  (9 novos: 5 mapKeyToAction + 2 playerUiStore + 3 VideoPlayer novos [modo cinema via clique, modo cinema via tecla T, volume via ArrowDown] + 1 ChannelDetailPage novo)
```
Total: **94 testes, 94 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real:** API e frontend reais iniciados, página `/catalogo/ch-01` aberta em Chromium real via `mcp__rea__capture_browser_scenario`, em três execuções separadas: (1) clique no botão "Modo cinema" → screenshot confirmando o player visivelmente mais largo; (2) foco no player + tecla "T" → `isTheaterMode` alternado sem erro de console; (3) foco no player + três `ArrowDown` → screenshot confirmando o slider de volume visivelmente reduzido (~70%, consistente com 1.0 − 3×0.1). **Zero erros de console e zero page errors nas três execuções** (único output de console: mensagens de debug do HMR do Vite e do React DevTools, já observadas em sprints anteriores).

**Problemas encontrados e resolvidos:**
1. `video.play().catch(...)` em `useVideoPlayer.ts` (código da Sprint 03, nunca exercitado por um teste até agora) quebra em ambientes onde `HTMLMediaElement.prototype.play()` não devolve uma `Promise` — confirmado isoladamente que `jsdom@25` devolve `undefined`. Descoberto ao escrever o primeiro teste que aciona `play()` de fato (via atalho de teclado). Corrigido envolvendo as duas tentativas de reprodução em `Promise.resolve(...)` — mesmo comportamento em produção (onde a spec garante uma `Promise`), robusto também em teste.
2. `@typescript-eslint/no-unused-expressions` rejeitou um ternário usado como statement (`condição ? pause() : play();`) no handler de teclado — corrigido com `if/else` explícito.
3. O tipo de `locator.role` da ferramenta de captura de navegador (`mcp__rea__capture_browser_scenario`) não inclui `"group"` entre os papéis aceitos para localizar elementos — contornado adicionando `data-testid="video-player-shortcuts"` ao contêiner do player (também útil como ponto de extensão estável para automação futura).

**Próximo passo:** aguardar aprovação explícita do usuário antes de iniciar a Sprint 06 (qualidade e entrega).

## Correção pós-Sprint 05 — "a aplicação local está vazia" (fora do ciclo de sprints)

**Contexto:** depois do relatório da Sprint 05, o usuário relatou que, ao abrir a aplicação localmente, "hoje no local está tudo vazio", e perguntou como filmes/séries seriam consumidos e como os canais rodam. Isso não era um pedido de sprint nova — era um bug real a investigar.

**Diagnóstico (feito com dados reais, não suposição):**
1. `curl http://localhost:3001/api/categories` e `/api/channels?pageSize=50` confirmaram que o backend **nunca** esteve vazio — 5 categorias, 20 canais, sempre devolvidos corretamente.
2. A causa raiz real: `app/pages/HomePage.tsx` (rota `/`, a primeira tela que qualquer pessoa vê) ainda tinha o texto placeholder escrito na **Sprint 01**, nunca atualizado nas 4 sprints seguintes — "catálogo, busca e player chegam na Sprint 02 em diante" — sem nenhum link, nenhum destaque, nenhuma indicação de que era preciso clicar em "Catálogo" na barra lateral para ver qualquer conteúdo. Registrado como ADR-023.
3. Pergunta legítima à parte: todos os 20 conteúdos fictícios, mesmo em categorias diferentes, reproduziam exatamente o mesmo vídeo de demonstração (decisão original da ADR-005) — o que reforçava a sensação de "vazio"/repetitivo ao navegar. Registrado como ADR-022.

**Correções implementadas:**
- `HomePage.tsx` reescrita: descrição real do estado atual da aplicação, botões para `/catalogo` e `/favoritos`, e uma seção "Em destaque" com os 4 canais `isFeatured`, buscados pela mesma API do catálogo (`useChannels`) — nunca mais um texto estático desatualizado.
- `getDemoStreamUrl(categoryId)` (função pura, substitui a constante única `DEMO_STREAM_URL`): cada categoria aponta para um stream de demonstração diferente (3 streams distintos, todos no mesmo domínio já validado `test-streams.mux.dev`, reaproveitados entre as 5 categorias) — navegar entre categorias agora reproduz conteúdo visivelmente diferente.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  12 pass, 0 fail
apps/api:         14 pass, 0 fail
apps/web:         73 pass, 0 fail  (5 novos: 2 HomePage + 3 getDemoStreamUrl)
```
Total: **99 testes, 99 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real:** (1) `/` aberta em Chromium real — screenshot confirmando título, CTAs e 4 cards em destaque, zero erros de console (a home deixou de parecer vazia); (2) captura de **rede real** comparando `/catalogo/ch-01` (categoria Documentários) com `/catalogo/ch-17` (categoria Ficção & Séries): confirmado que cada um baixa um manifesto HLS e segmentos de mídia **completamente diferentes** (`x36xhzz/...url_0/...ts` vs. `tos_ismc/tos_1080p/...m4s`+`init.mp4`), ambos HTTP 206, zero page errors — prova real de que categorias diferentes de fato reproduzem conteúdo diferente, não apenas por configuração no código.

**Próximo passo:** segue aguardando aprovação explícita do usuário para a Sprint 06.

## Integração TMDB (fora do ciclo de sprints) — metadados reais, com limite claro sobre conteúdo real

**Contexto:** o usuário pediu para "não ter mais tudo mocado" e, inicialmente, pediu para remover as regras do laboratório e replicar o Saimo TV com conteúdo real (canais de TV, filmes, séries). Recusei alterar `AGENTS.md`/`CLAUDE.md` e replicar conteúdo protegido/sem licença — isso continua fora de escopo permanentemente, não por formalidade do markdown, mas porque envolveria distribuir conteúdo sem direito. Em vez disso, propus e o usuário aprovou: integrar a API real do TMDB (gratuita, com chave própria do usuário) para os 2 conteúdos do catálogo que já são filmes reais licenciados (Big Buck Bunny, Tears of Steel) — metadados reais, sem tocar em conteúdo protegido.

**Funcionalidades concluídas:**
- `tmdbClient.searchMovie` — cliente HTTP para a API pública do TMDB, com cache em memória, degradação graciosa total (nunca lança).
- `catalogService.enrichChannel`/`enrichChannelsWithTmdb` — enriquece só os 2 canais marcados (`ch-01`, `ch-17`), aplicado depois da paginação.
- Contrato compartilhado (`Channel.tmdb`) — ausente (fictício) / `null` (tentou, sem sucesso) / objeto (real).
- `ChannelCard`/`ChannelDetailPage` — usam imagem de fundo, sinopse e ano reais quando presentes, com fallback para os dados fictícios; atribuição obrigatória do TMDB exibida quando aplicável.
- `ch-01` renomeado de "Horizonte Azul" (fictício) para "Big Buck Bunny" (real); `ch-17` de "Estação Nova" para "Tears of Steel" (real) — os únicos 2 nomes fictícios trocados; os outros 18 continuam inventados.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  15 pass, 0 fail  (3 novos: aceita tmdb ausente/null/preenchido)
apps/api:         24 pass, 0 fail  (10 novos: 7 tmdbClient + 3 enriquecimento de catálogo)
apps/web:         78 pass, 0 fail  (5 novos: 2 ChannelCard + 3 ChannelDetailPage)
```
Total: **117 testes, 117 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real, com a chave de API real do usuário (não simulada):**
1. `curl http://localhost:3001/api/channels/ch-01` e `/ch-17` confirmaram `tmdbId`, `backdropUrl` e `releaseYear` reais vindos do TMDB de verdade.
2. Encontrado em verificação real (não hipotético): a sinopse em português de "Big Buck Bunny" vem vazia do TMDB (tradução comunitária incompleta) — corrigido com fallback (`||` em vez de `??`, ADR-025), coberto por teste dedicado.
3. Navegador real (`mcp__rea__capture_browser_scenario`): grade do catálogo mostrando as imagens fotográficas reais de "Big Buck Bunny"/"Tears of Steel" lado a lado com os ícones genéricos dos 18 canais fictícios; página de detalhe de "Tears of Steel" mostrando pôster real, ano (2012) e sinopse real em português. Zero erros de console, zero page errors.

**Problemas encontrados e resolvidos:**
1. Processos de dev server de uma sessão anterior continuavam rodando nas portas 3001/5173 com o `.env` antigo (sem a chave) já carregado em memória — a chave nova só passou a valer depois de matar os processos antigos e reiniciar (`lsof -ti:3001,5173 | xargs kill`). Lembrete registrado: variáveis de ambiente só são lidas na inicialização do processo, nunca recarregadas a quente.
2. `overview` vazio do TMDB (ver ADR-025).

**Próximo passo:** segue aguardando aprovação explícita do usuário para a Sprint 06.

## `/filmes` — catálogo real, separado, navegável por gênero (fora do ciclo de sprints)

**Contexto:** depois da integração TMDB, o usuário insistiu várias vezes para editar `AGENTS.md`/`CLAUDE.md` e replicar o catálogo real do Saimo TV (canais de TV, filmes/séries protegidos) — inclusive compartilhando uma chave de API de terceiro aparentemente extraída do bundle do Saimo TV via engenharia reversa. Recusei as duas coisas (editar as regras e usar a chave de terceiro) em todas as instâncias — não é uma questão de configuração, é uma questão de direito sobre o conteúdo. Propus, como alternativa construtiva, uma seção `/filmes` dedicada a conteúdo 100% real que já temos o direito de exibir (os curtas Creative Commons já em uso), com navegação por gênero real e ordenação por recência — o usuário aprovou essa direção.

**Funcionalidades concluídas:**
- Backend: `GET /api/movies` (filtro por gênero, ordenação `recent`/`title_asc`), `GET /api/movies/genres`, `GET /api/movies/:id`.
- Acervo expandido de 2 para 4 curtas Creative Commons reais: Big Buck Bunny, Tears of Steel (já existentes), + Sintel e Elephants Dream (novos, via Internet Archive) — cada um com sua PRÓPRIA fonte de vídeo (não mais compartilhada por categoria).
- `tmdbClient.ts` ganhou busca de gêneros reais (`getGenreMap`) e fallback de sinopse em inglês quando a tradução pt-BR vem vazia do TMDB.
- Frontend: `/filmes` (grade + filtro de gênero real + ordenação) e `/filmes/:id` (player + sinopse + atribuição TMDB), nova entrada "Filmes" na navegação.
- Corrigido: o aviso fixo do player ("não é o conteúdo real") era falso para `/filmes` — nova prop `isRealContent` no `VideoPlayer`.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  22 pass, 0 fail  (7 novos: movieSchema + movieListQuerySchema)
apps/api:         34 pass, 0 fail  (9 novos: rotas de /api/movies, com TMDB mockado via mock.module)
apps/web:         95 pass, 0 fail  (17 novos: MovieCard, GenreFilter, SortControl, MoviesPage, MovieDetailPage, VideoPlayer isRealContent)
```
Total: **151 testes, 151 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real, com a chave de API real do usuário:**
1. `curl http://localhost:3001/api/movies` confirmou os 4 filmes reais, com gêneros/pôster/ano/sinopse reais, ordenados corretamente por ano decrescente.
2. Navegador real (`mcp__rea__capture_browser_scenario`): grade de `/filmes` com 4 pôsteres fotográficos reais; clique no filtro de gênero "Fantasia" reduzindo corretamente para só "Sintel"; detalhe de "Sintel" reproduzindo a fonte própria do filme (MP4 via Internet Archive — primeira vez que o `nativeAdapter` roda em E2E real, não só em teste unitário). Zero erros de console em todas as execuções.
3. A verificação visual revelou o aviso incorreto do player (corrigido, ver acima) — outro caso de bug encontrado só pela verificação visual real, não pelos testes automatizados (que usam dados mockados e não teriam notado a inconsistência de copy).

**Problemas encontrados e resolvidos:**
1. Aviso fixo do `VideoPlayer` ("não é o conteúdo real") incorreto para `/filmes` — corrigido com prop `isRealContent`.
2. `mock.module` (bun:test) precisou de um `await import("../../app")` DEPOIS do mock (não um import estático no topo do arquivo) para garantir que o mock fosse aplicado antes do grafo de módulos do app ser avaliado — confirmado, por execução real repetida, que o mock fica isolado por arquivo de teste (não vaza para `catalog.test.ts`).

**Próximo passo:** segue aguardando aprovação explícita do usuário para a Sprint 06.

## Sprint 02.5 — Visual Reverse Engineering ✅ Concluída (aguardando aprovação para Sprint 06)

**Contexto:** prompt formal e detalhado do usuário (8 etapas, critérios de aceitação explícitos) pedindo correção da arquitetura visual — a aplicação funcionava, mas parecia um dashboard administrativo, não um catálogo de streaming. Full report em `docs/implementation/visual-audit.md`, `design-system.md` e `visual-regression.md`.

**Funcionalidades concluídas:**
- Levantamento visual real da referência (`saimo-tv.pages.dev/movies`) nos 4 viewports pedidos, via `mcp__rea__capture_browser_scenario` — nenhum CSS/asset copiado.
- `AppShell` (substitui `PageShell`): navegação horizontal no desktop (`TopNavigation`), barra de abas no rodapé em telas estreitas (`MobileNavigation`) — `Sidebar.tsx`/`TopBar.tsx`/`app/store/uiStore.ts` removidos.
- `PageHeader`, `ContentRail`, `MoviePosterCard` (pôster 2:3, substitui `MovieCard` 16:9), `MovieGrid`, `FeaturedSection` — todos novos.
- Fundo cinematográfico original (`.bg-cinematic`, gradientes CSS, zero imagem).
- TMDB: `posterUrl` (retrato) e `rating` adicionados a `TmdbMetadata`/`Movie`, ao lado do `backdropUrl` já existente.
- `HomePage`/`CatalogPage`/`FavoritesPage` migradas para `PageHeader`; `HomePage` ganhou `ContentRail`.
- 6 ícones SVG próprios (`components/ui/icons.tsx`) — sem nova dependência.

**Testes executados (comandos reais, resultados reais):**
```
$ bun run test
packages/shared:  22 pass, 0 fail  (posterUrl/rating nos schemas existentes)
apps/api:         34 pass, 0 fail  (tmdbClient com poster_path/vote_average)
apps/web:         99 pass, 0 fail  (AppShell substitui PageShell; MoviePosterCard substitui MovieCard; +2 testes de FeaturedSection)
```
Total: **155 testes, 155 passando, 0 falhando.**

```
$ bun run typecheck   → sem erros (3 pacotes)
$ bun run lint        → sem erros (2 apps)
$ bun run build       → sucesso
```

**Verificação end-to-end real (visual regression manual, ver `visual-regression.md`):** 9 capturas de navegador real (4 viewports da referência + 4 viewports locais + 1 recaptura pós-correção), zero erros de console/página em todas. Processo: capturar referência → capturar local → comparar → corrigir → recapturar.

**Problema real encontrado e corrigido durante a própria verificação visual (não um teste automatizado):** o breakpoint de navegação (`md`, 768px) fazia a barra horizontal persistir em 768px, diferente da referência (que já troca para abas nesse viewport), e a logo quebrava em duas linhas. Corrigido trocando para `lg` (1024px) + `whitespace-nowrap`, recapturado e confirmado.

**Próximo passo:** segue aguardando aprovação explícita do usuário para a Sprint 06. Implementada EXCLUSIVAMENTE a Sprint 02.5, conforme instrução — não avançado automaticamente.

## Sprint 06 — Qualidade e entrega

*Ainda não iniciado.*
