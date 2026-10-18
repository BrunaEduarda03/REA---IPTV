# Decisões Técnicas (ADRs simplificados)

Cada entrada: Decisão → Contexto → Alternativas → Justificativa → Consequências. Numeração sequencial, nunca reutilizada mesmo se uma decisão for revertida depois (uma reversão vira uma nova ADR que referencia a anterior).

---

## ADR-001 — Novo código vive no mesmo repositório, em `src/` na raiz

- **Decisão:** a implementação própria fica no mesmo repositório Git do laboratório de engenharia reversa, com `src/` e `package.json` na raiz, ao lado de `docs/` e `research/`.
- **Contexto:** precisávamos decidir entre (a) mesmo repo, (b) subpasta dedicada (ex. `app/`), (c) repositório novo e separado.
- **Alternativas:** repositório separado manteria o laboratório "intocado" conceitualmente; subpasta dedicada evitaria qualquer confusão entre `docs/` do laboratório e do app.
- **Justificativa:** um único histórico Git preserva a narrativa completa (investigação → construção) para fins de portfólio; a separação já é feita por diretório (`docs/reverse-engineering/` vs. `docs/implementation/`) e por `.gitignore` (nada de `research/artifacts/` nunca entra no app).
- **Consequências:** o `.gitignore` da raiz passa a precisar de entradas típicas de projeto Node/Vite (`node_modules/`, `dist/`) além das já existentes.
- **Status:** ✅ Aprovada e implementada na Sprint 01 — com uma correção: em vez de um único `src/` na raiz, o usuário definiu (na mensagem que abriu a Sprint 01) uma estrutura de **monorepo com Bun Workspaces** (`apps/web`, `apps/api`, `packages/shared`, `packages/config`). Ver ADR-007.

---

## ADR-002 — Tailwind CSS em vez de uma biblioteca de componentes pronta (ex. MUI, Chakra, shadcn/ui)

- **Decisão:** usar Tailwind CSS com tokens de design próprios, construindo os componentes de UI do zero em `components/ui/`.
- **Contexto:** o MVP precisa de poucos componentes visuais (cards, botões, estados vazios, spinner) — não uma biblioteca completa de widgets.
- **Alternativas:** `shadcn/ui` (copia componentes para o projeto, mas ainda assim exigiria adaptar uma identidade visual pronta); Chakra/MUI (trariam opinião visual forte, mais peso de bundle, e dependeriam de sua própria forma de customização em vez dos tokens que queremos ensinar a definir).
- **Justificativa:** construir os poucos componentes necessários do zero, sobre Tailwind, é mais didático (ensina a pensar em sistema de design) e evita carregar uma biblioteca inteira para 5-6 componentes.
- **Consequências:** mais código nosso para escrever e testar (aceitável, é o objetivo educacional); exige disciplina para não reinventar padrões de acessibilidade que bibliotecas prontas já resolveriam (mitigação: seguir WAI-ARIA Authoring Practices nos poucos componentes interativos).

---

## ADR-003 — Zustand para estado global, mesmo sabendo que o Saimo TV usa Context + useReducer

- **Decisão:** usar Zustand para o estado global compartilhado entre features (conteúdo ativo, status do player, favoritos).
- **Contexto:** a auditoria (Fase 02/verificação) confirmou que o Saimo TV usa **Context API + `useReducer`** nativo do React, sem biblioteca de terceiros, para esse mesmo tipo de estado.
- **Alternativas:** replicar o padrão Context+`useReducer` (mais "fiel" ao que foi estudado); Redux Toolkit (mais cerimônia do que o projeto precisa).
- **Justificativa:** o objetivo do laboratório é *aprender*, não *clonar*. Usar uma abordagem **diferente** da observada para resolver o mesmo problema (estado global compartilhado) é deliberado: permite comparar, na prática, as duas estratégias (boilerplate de Context+reducer vs. API mínima do Zustand) em vez de só reproduzir a que já vimos. Fica registrado como exercício comparativo em `learning.md` quando chegarmos ao Sprint 04.
- **Consequências:** introduz uma dependência de terceiros que o alvo não usa — aceitável, pois é código 100% nosso, sem relação com o repositório original.

---

## ADR-004 — TanStack Query adiado, não removido do roadmap

- **Decisão:** não instalar TanStack Query no MVP; reavaliar quando houver uma fonte de dados remota real.
- **Contexto:** o catálogo do MVP é um JSON estático local (`mocks/`), não uma API.
- **Alternativas:** instalar já, "para quando precisar".
- **Justificativa:** Etapa 7 explicitamente veta "bibliotecas só para preencher checklist". Sem requisição de rede real para cachear/revalidar, TanStack Query não teria nenhum problema real para resolver ainda.
- **Consequências:** se decidirmos, num sprint futuro, buscar o catálogo de um endpoint mock (ex. `json-server` local) em vez de importar o JSON diretamente, essa é a entrada natural para TanStack Query — e a decisão será revisada nessa ADR, não criada do zero.
- **Status:** ❌ **Superada na Sprint 01.** O usuário definiu, ao abrir a Sprint 01, que haveria backend real desde o início (ADR-008) — logo, TanStack Query já tem um problema real para resolver (cache/estado de `GET /api/health`, e o catálogo real virá da API na Sprint 02). Instalado e em uso desde esta sprint (`features/health/hooks/useHealthQuery.ts`).

---

## ADR-005 — Mídia de demonstração: stream HLS público de teste, nunca conteúdo de TV/IPTV

- **Decisão:** o player (Sprint 03) reproduzirá apenas mídia de demonstração pública e amplamente usada para testes de desenvolvimento de players de vídeo (ex.: streams de teste mantidos por provedores de infraestrutura de vídeo para a comunidade de desenvolvedores), nunca qualquer canal de TV ao vivo, IPTV ou conteúdo protegido.
- **Contexto:** regra explícita do usuário e de `AGENTS.md`: nenhuma fonte não autorizada de streaming.
- **Alternativas:** gravar vídeo próprio e hospedar; usar apenas MP4 progressivo (mais simples, mas não exercitaria `hls.js`/adaptação de bitrate, que é um objetivo de aprendizado explícito do laboratório, ver Fase 03).
- **Justificativa:** um stream HLS de teste público resolve os dois requisitos (ensinar HLS de verdade, sem usar conteúdo não autorizado).
- **Consequências:** a URL exata do stream de demonstração será escolhida e documentada no Sprint 03 (não antes — ainda não precisamos dela para planejar).

---

## ADR-006 — Backend não é criado nesta fase

- **Decisão:** nenhum servidor próprio (NestJS ou outro) é criado na primeira entrega; favoritos/preferências ficam em `localStorage`.
- **Contexto:** instrução explícita do usuário ("Não criar inicialmente").
- **Alternativas:** criar desde já um backend mínimo "porque vai precisar depois".
- **Justificativa:** favoritos locais por dispositivo resolvem o requisito do MVP sem precisar de persistência compartilhada — e é, inclusive, o mesmo padrão que o Saimo TV usa (localStorage, sem conta de usuário, confirmado na auditoria).
- **Consequências:** se o backlog evoluir para exigir dado compartilhado entre dispositivos/usuários, essa ADR será revisitada com uma nova decisão (não antes).

---

## Decisões da Sprint 01 (arquitetura confirmada pelo usuário antes da implementação)

Estas substituem as decisões em aberto do planejamento inicial (abaixo, mantidas como histórico).

## ADR-007 — Monorepo com Bun Workspaces (`apps/*`, `packages/*`)

- **Decisão:** estrutura de monorepo com dois apps (`apps/web`, `apps/api`) e dois pacotes compartilhados (`packages/shared`, `packages/config`), orquestrados via `workspaces` no `package.json` raiz.
- **Contexto:** decisão explícita do usuário ao abrir a Sprint 01, substituindo a proposta original (ADR-001) de um único `src/` plano.
- **Alternativas:** `src/` único (mais simples, mas não isola frontend/backend); múltiplos repositórios (mais isolamento, mas perde o histórico único que ADR-001 buscava preservar).
- **Justificativa:** o escopo cresceu de "frontend com dados mock" para "full stack com backend real" (ADR-008) — monorepo com workspaces é o padrão para esse caso: cada app/pacote tem seu próprio `package.json`/`tsconfig.json`, mas compartilham lockfile e podem referenciar uns aos outros via `workspace:*`.
- **Consequências:** mais arquivos de configuração (4 `package.json`, 4 `tsconfig.json`) do que um projeto único teria; em troca, `apps/web` nunca pode importar algo de `apps/api` por acidente (só o que `packages/shared` expõe explicitamente) — acoplamento baixo por construção, não por disciplina.

## ADR-008 — Backend Hono em Bun é criado já na Sprint 01 (supersede ADR-006)

- **Decisão:** criar `apps/api` com Hono rodando no runtime do Bun, com um único endpoint (`GET /api/health`) nesta sprint.
- **Contexto:** ADR-006 havia decidido **não** criar backend na primeira entrega, usando `localStorage` para tudo. O usuário revisou essa decisão ao abrir a Sprint 01: o objetivo mudou para "fundação full stack" desde o início, com o catálogo (Sprint 02) sendo servido pela API, não por um JSON importado direto no frontend.
- **Alternativas:** manter o plano original (SPA pura até precisar de backend "de verdade"); usar Express/Fastify em vez de Hono.
- **Justificativa:** Hono é extremamente leve, tem suporte nativo ao runtime do Bun (sem camada de compatibilidade Node), e sua API de roteamento (`new Hono().get(...)`) é simples o bastante para não exigir muita cerimônia nesta fase — alinhado ao princípio "evite abstrações desnecessárias".
- **Consequências:** **ADR-006 está superada** por esta decisão — registrado aqui, não editado silenciosamente no ADR original (ver regra de preservação de histórico no topo deste arquivo).

## ADR-009 — `packages/shared` como fonte única dos contratos Zod entre frontend e backend

- **Decisão:** `packages/shared` exporta schemas Zod (ex. `healthResponseSchema`) e os tipos inferidos (`z.infer`), consumidos por `apps/web` e `apps/api` via `workspace:*` — nenhum dos dois redefine o shape manualmente.
- **Contexto:** sem isso, seria fácil o backend mudar um campo da resposta e o frontend não perceber até quebrar em runtime.
- **Alternativas:** gerar tipos a partir de um schema OpenAPI; duplicar interfaces TypeScript manualmente em cada lado (frágil, já é o problema que estamos evitando).
- **Justificativa:** Zod permite **validar em runtime E extrair o tipo estático** do mesmo lugar — um schema, duas garantias (ver `learning.md` para o exemplo comentado).
- **Consequências:** `packages/shared` precisa ser consumido como fonte TypeScript direta (sem etapa de build própria nesta sprint) — simples o bastante para não precisar de um pipeline de publicação de pacote.

## ADR-010 — `concurrently` para rodar frontend e backend em paralelo

- **Decisão:** o script raiz `bun run dev` usa o pacote `concurrently` para rodar `apps/api` e `apps/web` ao mesmo tempo, com saída colorida e prefixada por processo.
- **Alternativas:** `bun run --filter` (suporte a execução paralela de scripts de workspace no Bun, mas menos previsível para depurar logs intercalados de dois processos de longa duração); dois terminais manuais (não documentável/automatizável).
- **Justificativa:** solução simples, amplamente conhecida, fácil de explicar — exatamente o pedido da Etapa 8 ("solução simples e justificada").
- **Consequências:** mais uma dependência de desenvolvimento (aceitável: não é "preencher checklist", resolve um problema real de orquestração local).

## ADR-011 — Vitest 3.x (não 2.x) para compatibilizar com Vite 6

- **Decisão:** `apps/web` usa `vitest@^3.0.0`.
- **Contexto:** problema real encontrado durante a implementação — `vitest@2.x` tem peer dependency em `vite@^5`, mas o projeto usa `vite@^6`. O `bun install` resolveu **duas cópias de Vite** (5 e 6) simultaneamente, e `tsc` acusou erro de tipos incompatíveis entre `vite.config.ts` (Vite 6) e `vitest.config.ts` (Vite 5, via Vitest 2).
- **Como foi descoberto:** `bun run typecheck` falhou com um erro de tipos de ~40 linhas apontando para incompatibilidade entre dois `Plugin<any>` de versões diferentes do mesmo pacote — investigado conferindo `node_modules/.bun/` e encontrando as duas versões de fato instaladas lado a lado.
- **Justificativa da correção:** Vitest 3.x declara peer dependency compatível com Vite 6, eliminando a duplicata.
- **Consequências:** nenhuma — resolvido antes de qualquer código de aplicação depender da API do Vitest 2.

---

## ADR-012 — Módulo de catálogo em camadas: routes → service → repository (Sprint 02)

- **Decisão:** `apps/api/src/modules/catalog/` é dividido em `routes` (HTTP), `service` (regra de negócio) e `repository` (acesso a dados), cada um em arquivo próprio.
- **Contexto:** instrução explícita do usuário ao abrir a Sprint 02, com o objetivo de já deixar uma fronteira clara para trocar a persistência depois (ver "Estratégia futura de persistência" em `architecture.md`).
- **Alternativas:** tudo em um único arquivo `catalog.ts` (mais simples agora, mas a troca futura de persistência obrigaria misturar regra de negócio com acesso a dados numa reescrita maior); um ORM "ativo" (ex.: Active Record, onde o próprio modelo sabe se salvar) — mistura responsabilidades que preferimos manter separadas desde já.
- **Justificativa:** com só 3 endpoints, a separação em camadas é mínima o bastante para não ser "abstração excessiva" (instrução explícita da Sprint 02), mas já paga seu custo ao deixar claro, em `catalog.service.ts`, que **nenhuma linha ali sabe que os dados vêm de um array** — só chama `catalogRepository.findAllChannels()`.
- **Consequências:** 4 arquivos pequenos em vez de 1 grande; cada um testável/legível isoladamente.

## ADR-013 — `@hono/zod-validator` para validação de entrada nas rotas

- **Decisão:** usar o pacote oficial `@hono/zod-validator` para validar query params (`/api/channels`) e path params (`/api/channels/:id`).
- **Alternativas:** chamar `.safeParse()` manualmente em cada handler, com um `if (!result.success) return c.json(...)` repetido em cada rota.
- **Justificativa (quando uma lib resolve um problema mecânico, vale usá-la):** o código que `zValidator` substitui é puramente mecânico — ler `c.req.query()`/`c.req.param()`, validar, formatar erro — sem nenhuma regra de negócio. É o pacote oficial do próprio ecossistema Hono (não uma dependência de terceiros desconhecida), e o terceiro argumento (`hook`) permite customizar o formato do erro 400 para o nosso contrato `ApiError` único, mantendo a resposta de erro consistente em toda a API.
- **Consequências:** um aviso de peer dependency no `bun install` (`@hono/zod-validator` foi publicado antes do Zod 4 estabilizar certas APIs) — não afetou nenhum teste ou comportamento real; registrado aqui para revisitar se uma atualização futura do pacote remover o aviso.

## ADR-014 — Busca e paginação determinísticas com desempate por `id`

- **Decisão:** toda ordenação (`featured_first`, `name_asc`, `name_desc`) desempata por `id` quando o critério principal resulta em empate.
- **Contexto:** sem desempate, a ordem de itens com o mesmo valor de comparação dependeria da ordem de inserção do array — que é estável *hoje* (array fixo em memória), mas deixaria de ser uma garantia explícita se a fonte de dados mudar (ex.: para uma consulta SQL sem `ORDER BY` determinístico).
- **Justificativa:** paginação **só é confiável** se a mesma consulta sempre devolver os itens na mesma ordem — caso contrário, um item pode aparecer em duas páginas (duplicado) ou em nenhuma, dependendo de reordenações não intencionais entre duas requisições.
- **Consequências:** um teste dedicado (`catalog.test.ts`, "pagina deterministicamente") verifica exatamente essa propriedade — a página 2 nunca repete um id já visto na página 1.

---

## Decisões do planejamento inicial (histórico — algumas substituídas acima)

1. ~~Localização do código~~ → substituída por ADR-007.
2. **Escopo exato do MVP** — ver `backlog.md`, Seção "Obrigatório vs. Opcional vs. Evolução futura" (ainda válido, catálogo chega na Sprint 02).
3. ~~Gerenciador de pacotes~~ → decidido: **Bun**, conforme definição explícita do usuário na Sprint 01.
