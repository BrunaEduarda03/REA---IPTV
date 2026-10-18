# Progress — Implementação

## Sprint 0 — Planejamento (atual)

- **Funcionalidades concluídas:** nenhuma (sem código ainda, por instrução explícita do usuário).
- **Testes executados:** nenhum.
- **Problemas encontrados:** os 5 arquivos de auditoria/planejamento que o usuário esperava encontrar em `docs/reverse-engineering/` não existiam (`04-5-technical-audit.md`, `evidence-matrix.md`, `gap-analysis.md`, `feature-prioritization.md`, `05-implementation-plan.md`) — mapeados para os equivalentes reais (`auditoria-tecnica-final.md` e seções correspondentes) e comunicado ao usuário.
- **Documentos produzidos nesta sessão:** `docs/implementation/{README,architecture,decisions,backlog,progress,testing,learning}.md`.
- **Próximo passo:** aguardar aprovação do usuário sobre: (1) localização do código (ADR-001), (2) escopo do MVP (`backlog.md`), (3) gerenciador de pacotes (npm vs. Bun). Após aprovação, iniciar Sprint 01.

---

## Sprint 01 — Fundação Full Stack ✅ Concluída (aguardando aprovação para Sprint 02)

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

## Sprint 02 — Catálogo

*Ainda não iniciado.*

## Sprint 03 — Player

*Ainda não iniciado.*

## Sprint 04 — Estado e preferências

*Ainda não iniciado.*

## Sprint 05 — Experiência avançada

*Ainda não iniciado — escopo depende de decisão pós-MVP.*

## Sprint 06 — Qualidade e entrega

*Ainda não iniciado.*
