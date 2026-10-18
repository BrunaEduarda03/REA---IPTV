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
