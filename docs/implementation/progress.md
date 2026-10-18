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

## Sprint 04 — Estado e preferências

*Ainda não iniciado.*

## Sprint 05 — Experiência avançada

*Ainda não iniciado — escopo depende de decisão pós-MVP.*

## Sprint 06 — Qualidade e entrega

*Ainda não iniciado.*
