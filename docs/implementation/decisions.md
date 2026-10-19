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
- **Status:** ✅ Implementada. URL escolhida: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8` — um master playlist HLS mantido publicamente pela Mux para testes de player, cujo conteúdo é o "Big Buck Bunny" (curta de animação licenciado Creative Commons, o material de teste de vídeo mais usado da indústria). Verificado em reprodução real (ver `progress.md`, Sprint 03): manifesto mestre + 3 variantes de qualidade + segmentos `.ts` baixados com sucesso (HTTP 206), confirmando adaptação de bitrate de verdade via `hls.js`. ~~Todos os 20 conteúdos fictícios do catálogo apontam para a mesma URL~~ — **revisado em ADR-022**: a partir de então, a URL varia por categoria.

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

## ADR-015 — `MediaSourceAdapter`: interface única para motor nativo e hls.js, com import dinâmico (Sprint 03)

- **Decisão:** `features/player/types/player.ts` define uma interface `MediaSourceAdapter` (`attach`/`destroy`) implementada por `nativeAdapter.ts` e `hlsAdapter.ts`; `createAdapter.ts` escolhe qual usar testando a URL (`.m3u8` + suporte nativo do navegador).
- **Contexto:** o objetivo explícito da sprint era suportar múltiplos motores sem acoplar o hook de orquestração a nenhum deles — o mesmo problema que o Saimo TV resolve (de forma muito mais elaborada, com 3 motores) segundo a Fase 03 da engenharia reversa.
- **Alternativas:** um único `if/else` dentro do próprio hook, sem interface formal (mais rápido de escrever agora, mas acopla o hook a `hls.js` diretamente, dificultando adicionar Shaka/DASH depois); usar uma biblioteca de player pronta (ex. Video.js) — rejeitado porque o objetivo de aprendizado explícito é entender a mecânica de troca de motor, não delegar isso a uma lib.
- **Justificativa:** com a interface, `useVideoPlayer` nunca importa `hls.js` — só `createAdapter`. Isso também torna o hook 100% testável com um adapter falso (ver `useVideoPlayer.test.tsx`), sem precisar simular a API real do hls.js em cada teste do hook.
- **`hls.js` é importado dinamicamente** (`await import("hls.js")`) dentro de `hlsAdapter.attach()`, não no topo do arquivo — confirmado pelo build (`bun run build`): o bundle principal do frontend ficou em ~468 KB, e `hls.js` (595 KB) foi parar em um chunk **separado**, baixado só quando um vídeo HLS é de fato aberto.
- **Consequências:** mais um nível de indireção (interface + 3 implementações) do que a abordagem mais direta — aceitável pelo ganho de testabilidade e pela possibilidade real de adicionar um adapter Shaka/DASH no futuro sem tocar no hook.

## ADR-016 — Watchdog de travamento simplificado (não replicado o sistema completo do Saimo TV)

- **Decisão:** a Sprint 03 **não** implementa os watchdogs de 12s/25s observados no Saimo TV (Fase 03, E-020) nem o sistema de múltiplas fontes por canal com fallback automático — o player trata apenas os eventos nativos do `<video>` (`error`, `waiting`, `ended`, etc.) e um evento sintético de erro fatal do hls.js.
- **Contexto:** esses mecanismos são bem documentados em `docs/reverse-engineering/` e seriam perfeitamente replicáveis como *padrão* (não como código) — mas o catálogo desta implementação não tem múltiplas fontes por conteúdo (ADR-005: todos apontam para a mesma mídia de demonstração), então um sistema de fallback entre fontes não teria nada para fazer fallback **entre**.
- **Justificativa:** implementar um mecanismo elaborado sem um cenário real para exercitá-lo violaria o princípio "evite abstrações desnecessárias" já seguido nas sprints anteriores.
- **Consequências:** registrado aqui como item explícito de **evolução futura** (ver `backlog.md`, Sprint 05/Opcional) — se o catálogo ganhar múltiplas fontes por conteúdo numa sprint futura, o watchdog + fallback é o próximo passo natural, e o padrão já está documentado em `docs/reverse-engineering/findings.md` (E-020) para quando for implementado.

---

## ADR-017 — `actions?: ReactNode` como slot de composição em `ChannelCard` (Sprint 04)

- **Decisão:** `ChannelCard` (feature `catalog`) ganha uma prop opcional `actions?: ReactNode`, renderizada sobre a thumbnail; `catalog` não importa `features/favorites` em nenhum arquivo.
- **Contexto:** a Sprint 04 precisava que um botão de favorito aparecesse dentro do card do catálogo — a primeira vez que duas features precisam compartilhar um elemento visual.
- **Alternativas:** (1) `catalog` importar `FavoriteButton` diretamente — mais rápido de escrever, mas viola o princípio já declarado em `architecture.md` ("features não se importam diretamente") e tornaria `catalog` inutilizável sem `favorites` no futuro; (2) mover o botão de favorito para fora do card, como uma camada separada posicionada por CSS — mais complexo de alinhar visualmente sem ganho real; (3) um "render prop" (`renderActions?: (channel) => ReactNode`) — mais flexível, mas `ReactNode` já é suficiente para o caso de uso atual (nenhuma necessidade de o card passar dados de volta para a função).
- **Justificativa:** a composição acontece em `app/pages/*` — a única camada que já tem permissão, pela arquitetura declarada, de conhecer múltiplas features ao mesmo tempo. `ChannelCard` continua testável e reutilizável sem favoritos (ex.: num contexto futuro sem essa feature).
- **Consequências:** qualquer feature futura que precise adicionar uma ação ao card (ex.: "adicionar à lista de assistir depois") reusa o mesmo slot, sem precisar de uma nova prop dedicada.

## ADR-018 — Zustand `persist` + `merge` customizado com Zod, em vez de sincronização manual (Sprint 04)

- **Decisão:** `favoritesStore` usa o middleware `persist` do próprio Zustand (`storage: createJSONStorage(() => localStorage)`), com uma função `merge` customizada que passa o dado lido por `parseFavoriteIds` (Zod) antes de aceitá-lo.
- **Contexto:** o backlog (item 9) exige persistência entre recarregamentos **e** que `localStorage` corrompido não quebre a aplicação. `persist` sozinho resolve a primeira exigência mas não a segunda — ele faz `JSON.parse` do valor salvo e aceita o resultado como estado novo sem validar o shape.
- **Alternativas:** (1) não usar `persist`, escrever um `useEffect` próprio que lê/escreve `localStorage` manualmente — rejeitado porque reimplementaria, pior, uma peça que o próprio Zustand já resolve para esse problema específico; (2) usar `persist` sem `merge` customizado, confiando que o dado salvo está sempre no formato esperado — rejeitado porque é exatamente a premissa que a auditoria de engenharia reversa (Fase 04) mostrou ser arriscada (dado de versão antiga do schema, ou corrompido).
- **Justificativa:** `merge` é o ponto de extensão que o próprio `persist` expõe para este problema — usá-lo é "biblioteca resolvendo o problema", não "reinventar a roda", e ainda assim fecha a lacuna de validação com uma função de 3 linhas que já tínhamos motivo para escrever (ADR da auditoria sobre `JSON.parse` defensivo).
- **Consequências:** 5 testes dedicados (`favoritesStore.test.ts`) cobrem especificamente JSON inválido e shape inesperado, usando `vi.resetModules()` + `import()` dinâmico para testar o comportamento de inicialização do módulo singleton sob diferentes estados pré-existentes de `localStorage`.

## ADR-019 — Reaproveitar `useChannels` para `/favoritos`, sem endpoint novo (Sprint 04)

- **Decisão:** `FavoritesPage` chama `useChannels({ page: 1, pageSize: 50, sort: "name_asc" })` (já existente, da Sprint 02) e filtra o resultado em memória pelos ids em `favoriteIds`.
- **Contexto:** era preciso resolver ids de favoritos para dados completos de canal (nome, thumbnail, descrição) para renderizar `/favoritos`.
- **Alternativas:** (1) um endpoint novo `GET /api/channels?ids=...` que aceita uma lista de ids — mais "correto" em escala, mas o catálogo fictício tem só 20 itens, então uma única página de `pageSize: 50` já cobre o catálogo inteiro sem paginação adicional; criar o endpoint agora seria complexidade sem problema real a resolver (viola o princípio "evite abstrações desnecessárias"); (2) duplicar os dados do canal dentro do próprio `favoritesStore` ao favoritar (salvar o objeto `Channel` inteiro, não só o id) — rejeitado porque duplicaria estado de servidor dentro de um estado de cliente, a mesma armadilha que `architecture.md` já evita explicitamente na tabela de decisões de estado do catálogo.
- **Justificativa:** o limite exato dessa decisão está documentado aqui para ser revisitado: se o catálogo crescer além de uma página razoável (ex.: centenas de itens), a filtragem client-side deixa de ser eficiente e o endpoint dedicado (alternativa 1) passa a se justificar.
- **Consequências:** `FavoritesPage` depende indiretamente do tamanho do catálogo caber em uma página — risco registrado, não ignorado.

## ADR-020 — Escopo do Sprint 05: atalhos de teclado + modo cinema, entre os itens "Opcional" do backlog

- **Decisão:** dos seis itens listados como "Opcional (candidatos ao Sprint 05)" em `backlog.md` (Picture-in-Picture, Theater Mode, espelhamento de tela, atalhos de teclado, navegação por D-pad/controle remoto, EPG sintético, layout dedicado para TV), esta sprint implementa **atalhos de teclado** e **modo cinema** (Theater Mode).
- **Contexto:** o próprio backlog exige uma decisão explícita antes de iniciar o Sprint 05 ("não iniciado sem decisão explícita sobre quais itens 'Opcionais' entram"). A autorização do usuário para esta sessão ("sprint 4 e 5 faça") não especificou quais itens — a escolha do escopo ficou a cargo da sessão, e é registrada aqui com a justificativa.
- **Por que estes dois, e não os outros quatro:**
  - **Picture-in-Picture** — depende da Document Picture-in-Picture API (ou do modo legado `requestPictureInPicture`), de suporte desigual entre navegadores e difícil de verificar de ponta a ponta em Chromium headless (a janela PiP é uma superfície do sistema operacional, fora do DOM capturável por `mcp__rea__capture_browser_scenario`). Ficaria sem a mesma verificação visual real já aplicada a toda funcionalidade deste laboratório.
  - **Espelhamento de tela** — já é **deliberadamente excluído** em `backlog.md` ("Múltiplos protocolos de cast" está em "Evolução futura", fora do escopo de qualquer sprint atual), não apenas adiado.
  - **Navegação por D-pad/controle remoto** — exigiria um sistema de gerenciamento de foco abrangendo toda a aplicação (catálogo, favoritos, player), não só o player — escopo de uma sprint dedicada, não um item entre outros.
  - **EPG sintético** — exigiria um novo domínio de dados (programação por horário) no backend, incluindo schema, fixtures e endpoints novos — maior que um ajuste de UI do player.
  - **Layout dedicado para TV** — é uma mudança transversal de design responsivo (breakpoints, navegação por controle remoto implícita), não uma funcionalidade isolada testável em uma sessão.
  - **Atalhos de teclado e modo cinema**, em contraste, são extensões diretas do player já existente (Sprint 03): reaproveitam 100% das ações já expostas por `useVideoPlayer` (`play`/`pause`/`toggleMute`/`setVolume`), não exigem nenhum domínio de dados novo, e são inteiramente verificáveis com as mesmas duas camadas de teste já usadas em todo o projeto (unitário + `mcp__rea__capture_browser_scenario`).
- **Justificativa:** escopo proporcional ao tempo de uma sessão, sem abrir uma funcionalidade pela metade (regra explícita da Fase 05: "nenhuma implementação pela metade").
- **Consequências:** os quatro itens não escolhidos permanecem registrados em `backlog.md` como candidatos a uma sprint futura, agora com a razão explícita de terem sido adiados (não só "não deu tempo").

## ADR-021 — Atalhos de teclado escopados ao contêiner do player (não ao `document` inteiro)

- **Decisão:** o `onKeyDown` dos atalhos (`mapKeyToAction`) fica anexado a um `<div tabIndex={0}>` que envolve o `<video>`, não a um listener global em `document`/`window`.
- **Contexto:** um listener global é a forma mais comum (e mais arriscada) de implementar atalhos de player — captura teclas em qualquer lugar da página, inclusive dentro de campos de busca ou formulários futuros.
- **Alternativas:** `document.addEventListener("keydown", ...)` dentro de um `useEffect` no `VideoPlayer` — mais simples de escrever (não exige o usuário clicar no player antes), mas interceptaria "M" ou espaço mesmo com o foco em um campo de texto em outra parte da tela (ex.: a busca do catálogo, se a página algum dia combinar player e busca na mesma view).
- **Justificativa:** escopar ao contêiner via `tabIndex` + `onKeyDown` é o padrão de acessibilidade recomendado para "regiões interativas" (`role="group"` com rótulo descritivo dos atalhos disponíveis) — o usuário precisa focar o player (clique ou Tab) antes dos atalhos valerem, o mesmo comportamento esperado de players de vídeo profissionais (YouTube, por exemplo, só reage a espaço/setas com o player em foco ou sem nenhum outro campo focado).
- **Consequências:** o atributo `aria-label` do contêiner documenta os atalhos disponíveis para tecnologia assistiva; um teste (`VideoPlayer.test.tsx`) prova que focar o contêiner e pressionar uma tecla de fato aciona a ação — não bastaria disparar o evento em `document` diretamente, porque é exatamente esse acoplamento ao elemento focado que está sendo verificado.

## ADR-022 — Mídia de demonstração variando por categoria (revisão de ADR-005)

- **Decisão:** `getDemoStreamUrl(categoryId)` (função pura, `features/player/lib/demoStream.ts`) devolve uma URL de stream diferente por categoria, em vez da única constante `DEMO_STREAM_URL` usada por todo o catálogo desde a Sprint 03.
- **Contexto:** feedback direto do usuário, fora do ciclo de sprints — ao abrir a aplicação localmente, a experiência pareceu "vazia"/repetitiva: navegar entre canais de categorias diferentes sempre reproduzia exatamente o mesmo vídeo, e a pergunta levantada foi "como colocar esses filmes e séries para serem consumidos, como rodam esses canais?". A causa raiz era dupla: (1) a home ainda mostrava o texto placeholder da Sprint 01 (ver ADR-023) e (2) todo o catálogo realmente tocava sempre o mesmo vídeo, por decisão original da ADR-005.
- **Alternativas:** (1) um vídeo distinto por **canal** (20 vídeos) — rejeitado por exigir 20 fontes públicas e legítimas, desproporcional ao objetivo educacional (mecânica de player, não um acervo); (2) manter uma única fonte, só explicando melhor em texto que é proposital — rejeitado porque não resolve a sensação de "vazio" ao navegar, só a justifica depois; (3) por categoria (escolhida) — 5 categorias, 3 streams distintos reaproveitados entre elas (ver mapa em `demoStream.ts`), equilibra variedade perceptível com simplicidade e risco externo baixo (as 3 URLs ficam no mesmo domínio `test-streams.mux.dev` já validado pela ADR-005, em vez de introduzir vários domínios de terceiros novos).
- **Justificativa:** `getDemoStreamUrl` é uma função pura, testável sem mock de rede (`demoStream.test.ts`), e documentada de forma explícita como ainda não sendo "um vídeo por conteúdo" — o modelo de domínio (`Channel`) continua sem nenhum campo de "fonte de mídia" próprio; a mídia é escolhida inteiramente no frontend, a partir da categoria, por ser só uma camada de apresentação/demonstração, nunca dado real de catálogo.
- **Verificação real:** confirmado por captura de rede real (`mcp__rea__capture_browser_scenario`, não presumido): abrir um canal de "Documentários" baixa segmentos `.ts` de `x36xhzz/...`; abrir um canal de "Ficção & Séries" baixa segmentos `.m4s`/`init.mp4` de `tos_ismc/...` — manifestos e segmentos efetivamente diferentes, HTTP 206 em ambos, zero page errors.
- **Consequências:** continua **não sendo** um sistema de múltiplas fontes por conteúdo com fallback (isso é o ADR-016, ainda não implementado) — é só uma seleção estática por categoria. Fica registrado aqui como o próximo degrau natural caso o catálogo evolua para precisar de fato de uma fonte por canal.

## ADR-023 — `HomePage` reescrita: o placeholder da Sprint 01 nunca foi atualizado

- **Decisão:** `app/pages/HomePage.tsx` passa a ser uma página inicial real — descrição atualizada do que a aplicação faz hoje, CTAs para `/catalogo` e `/favoritos`, e uma prévia "Em destaque" que busca os 4 canais `isFeatured` via a mesma API já usada por `/catalogo` (`useChannels`) — em vez do texto estático da Sprint 01 ("O catálogo, a busca e o player chegam na Sprint 02 em diante").
- **Contexto:** esse texto nunca foi revisado nas Sprints 02-05, mesmo com catálogo, busca, player, favoritos e atalhos de teclado todos já implementados e documentados havia várias sprints — um caso real de documentação (neste caso, a própria UI) ficando desatualizada por não fazer parte do escopo explícito de nenhuma sprint seguinte. Foi a causa raiz principal do relato do usuário de que a aplicação local "estava tudo vazio": `/` é a rota padrão, e quem abre a aplicação sem saber que precisa clicar em "Catálogo" via a barra lateral via só esse texto desatualizado, sem nenhum conteúdo visível.
- **Justificativa:** a nova home busca dados reais (não um mock estático) para nunca mais ficar "presa no tempo" da mesma forma — se o catálogo mudar, os destaques da home mudam junto, automaticamente.
- **Consequências:** nenhuma funcionalidade nova, só a página inicial deixando de mentir sobre o estado real da aplicação. Verificado visualmente em navegador real (ver `progress.md`): home mostra título, CTAs e 4 cards em destaque, zero erros de console. Lição registrada em `learning.md`: "funcionou na Sprint 01" não significa "continua correto na Sprint 05" quando nada força a revisão.

## ADR-024 — Integração real com a API do TMDB, só para os conteúdos que já são filmes reais licenciados

- **Decisão:** `apps/api/src/lib/tmdb/tmdbClient.ts` (`searchMovie`) busca, ao vivo, metadados reais (pôster/imagem de fundo, sinopse, ano) na API pública do TMDB — mas **só** para os 2 canais do catálogo que já correspondem a um filme real, licenciado sob Creative Commons, efetivamente reproduzido pelo player (`ch-01` = Big Buck Bunny, `ch-17` = Tears of Steel — marcados em `catalog.fixtures.ts`, `tmdbQueryByChannelId`). Os outros 18 canais continuam 100% fictícios e nunca disparam uma busca no TMDB.
- **Contexto:** pedido explícito do usuário para não ter mais um catálogo "mocado" — mas IPTV/canais de TV ao vivo real e conteúdo protegido (filmes/séries que não temos direito de exibir) permanecem **permanentemente fora de escopo** (`AGENTS.md`, item 15; `backlog.md`, "Deliberadamente excluído"). A integração com TMDB resolve a parte legítima do pedido — metadados reais, de uma API pública com uso autorizado mediante chave própria — sem abrir uma exceção na regra de conteúdo.
- **Alternativas:** (1) enriquecer TODOS os 20 canais fictícios com buscas por nome — rejeitado: os nomes fictícios ("Jornal Agora", "Mundo Pequeno"...) não correspondem a nenhum filme/série real, então a busca ou não encontraria nada (sempre `tmdb: null`, nenhum ganho) ou encontraria um resultado **errado** por coincidência de nome, associando dados reais de um filme/série real a um conteúdo que não é aquilo — pior que não ter o dado; (2) fazer a chamada ao TMDB a partir do **frontend** diretamente — rejeitado: exporia a chave de API no bundle JavaScript público, violando a prática básica de nunca enviar segredos ao cliente; o backend é a única camada com acesso à chave.
- **Decisões técnicas dentro da escolha:**
  - **Chave opcional** (`env.TMDB_API_KEY: z.string().optional()`): sem ela, `searchMovie` devolve `null` imediatamente, sem tentar rede — a aplicação nunca quebra por falta de configuração, só deixa de mostrar o enriquecimento (cai para os dados fictícios de fallback já existentes).
  - **`searchMovie` recebe a chave como parâmetro**, nunca lê `process.env`/`env` internamente — mantém a função testável só com mock de `fetch`, sem precisar mockar módulo nenhum.
  - **Cache em memória por processo** (`Map`, por `título|ano`): o catálogo é estático, a mesma busca sempre devolveria o mesmo resultado — evita bater na API do TMDB a cada requisição à API própria.
  - **Imagem de fundo (`backdrop_path`), não pôster (`poster_path`)**: o pôster é retrato (~2:3) e distorceria/cortaria mal dentro do layout de card já existente (`aspect-video`, ~16:9) — o backdrop já é paisagem, encaixa sem precisar mudar nenhum componente de layout.
  - **Enriquecimento só nos itens já paginados** (`catalogService.enrichChannelsWithTmdb`, chamado depois de `listChannels` fatiar a página), não no catálogo inteiro — menos chamadas de rede.
  - **Atribuição obrigatória**: quando `channel.tmdb` está presente, `ChannelDetailPage` mostra "Dados de TMDB — este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB", conforme os termos de uso da própria API.
- **Verificação real:** `curl` direto à API própria, com a chave real do usuário configurada em `apps/api/.env` (nunca commitada — `.gitignore`), confirmou `tmdbId`, `backdropUrl` e `releaseYear` reais para os dois canais, e `tmdb` ausente/`null` para os demais. Verificado também em navegador real (`mcp__rea__capture_browser_scenario`): grade do catálogo mostrando as imagens reais (fotográficas) de "Big Buck Bunny"/"Tears of Steel" lado a lado com os ícones genéricos dos canais fictícios — a distinção visual entre "real" e "fictício" é imediatamente perceptível. Zero erros de console.
- **Limitação conhecida e documentada (não corrigida por ser desproporcional ao escopo):** se, no futuro, uma chave real de produção for configurada em `apps/api/.env` E alguém rodar `bun test` sem o `apps/api/.env.test` (que zera `TMDB_API_KEY` explicitamente) sendo carregado corretamente pelo Bun, os testes de integração do catálogo passariam a fazer chamadas de rede reais ao TMDB — comportamento indesejado mas não verificado neste momento como um risco ativo (nenhuma chave de produção existia durante o desenvolvimento desta ADR). Ver `.env.test`.
- **Consequências:** `Channel` (contrato compartilhado) ganha um campo opcional `tmdb` — qualquer consumidor futuro do schema precisa saber que a maioria dos canais nunca o tem preenchido (ausência ≠ erro).

## ADR-025 — `overview` vazio do TMDB não deve vencer a descrição fictícia de fallback

- **Decisão:** no frontend, a sinopse exibida é `channel.tmdb?.overview || channel.description` (operador `||`), não `??`.
- **Contexto:** encontrado em verificação manual real (não hipotético): a busca por "Big Buck Bunny" em `pt-BR` devolveu um resultado válido do TMDB (pôster, ano, id reais) mas com `overview: ""` — a tradução comunitária da sinopse para português simplesmente não existe para esse título no TMDB. Com `??`, uma string vazia (que não é `null`/`undefined`) teria "vencido" e a página mostraria um parágrafo em branco.
- **Justificativa:** o objetivo da sinopse é sempre mostrar ALGO útil — uma string vazia nunca é melhor que a descrição fictícia de fallback que já escrevemos para esse canal.
- **Consequências:** coberto por um teste dedicado (`ChannelDetailPage.test.tsx`, "TMDB presente mas sem sinopse traduzida") que reproduz exatamente esse caso — `tmdb` presente (então a atribuição ainda aparece, os dados são reais), mas `overview: ""` (então o texto exibido é o da descrição fictícia).

## ADR-026 — `/filmes`: seção dedicada a conteúdo 100% real, separada do catálogo fictício

- **Decisão:** nova rota `/filmes` (+ `/filmes/:id`), backend `apps/api/src/modules/movies/`, schema próprio (`Movie`, distinto de `Channel`) — um acervo pequeno e curado (4 curtas-metragens Creative Commons: Big Buck Bunny, Tears of Steel, Sintel, Elephants Dream), cada um com sua PRÓPRIA fonte de vídeo (não mais uma fonte compartilhada por categoria), gênero/pôster/sinopse/ano reais do TMDB, navegável por gênero real e ordenável por "mais recente"/"A-Z".
- **Contexto:** o usuário insistiu, em várias mensagens, para que `AGENTS.md`/`CLAUDE.md` fossem editados para permitir replicar o catálogo real do Saimo TV (canais de TV ao vivo, filmes e séries protegidos) — recusado repetidamente (ver `progress.md`, seção "Integração TMDB", e as respostas da sessão: usar conteúdo protegido, ou mesmo uma chave de API de terceiro encontrada via engenharia reversa do bundle do Saimo TV, está fora de escopo permanentemente, não por configuração). Esta ADR documenta a resposta construtiva: o que "catálogo real, navegável por gênero, com destaque para recentes" significa quando aplicado SÓ a conteúdo que de fato temos o direito de exibir.
- **Por que um módulo novo, não uma extensão de `catalog`:** `Channel` representa um "canal" que PODE ser fictício (a maioria é) — `tmdb` é opcional e o item funciona com ou sem ele (ADR-024). Já `Movie` é uma categoria de domínio diferente: não existe "filme fictício de fallback" aqui — se o TMDB não resolver, o item simplesmente não aparece na lista (`moviesService.resolveMovie` devolve `null`, filtrado antes de chegar à resposta). Misturar os dois modelos exigiria um monte de campos opcionais "às vezes fictício, às vezes não" em `Channel`, confundindo a distinção que `backlog.md` já faz entre "Obrigatório" (catálogo fictício) e algo que nunca foi planejado como obrigatório.
- **Por que sem paginação:** o acervo é pequeno **de propósito** — crescê-lo exige adicionar um título real, verificado, licenciado, um por um em `movies.fixtures.ts` (nunca em lote, nunca por scraping). Paginação resolveria um problema que não existe aqui.
- **Fonte de cada vídeo:**
  - Big Buck Bunny / Tears of Steel: `test-streams.mux.dev` (mesmo domínio já validado pela ADR-005/ADR-022).
  - Sintel / Elephants Dream: `archive.org` (Internet Archive) — hospedagem pública, estável, de longa data, especificamente para arquivos de domínio público/Creative Commons; confirmado via `curl` com suporte a `Range` (HTTP 206) antes de adicionar ao código.
- **Gêneros reais, não um enum nosso:** `moviesService.listGenres()` deriva a lista de gêneros a partir do que de fato aparece no acervo atual (não a lista completa de gêneros que o TMDB conhece) — crescer o acervo com um filme de um gênero novo faz esse gênero aparecer automaticamente no filtro, sem precisar editar um enum em lugar nenhum.
- **Verificação real:** `curl` à API própria confirmou os 4 filmes com `tmdbId`/gêneros/pôster/ano reais; navegador real (`mcp__rea__capture_browser_scenario`) confirmou a grade com 4 pôsteres fotográficos reais, filtro por gênero reduzindo para o item certo, e a página de detalhe de "Sintel" reproduzindo a fonte própria (MP4 via Internet Archive, primeira vez que o `nativeAdapter` — não só `hlsAdapter` — é exercitado em E2E real, não só em teste unitário). Zero erros de console em todas as execuções.
- **Problema encontrado e corrigido nesta verificação:** o aviso fixo do `VideoPlayer` ("não é o conteúdo real deste título fictício") é **falso** para `/filmes` — ali o vídeo reproduzido É o conteúdo real. Corrigido com uma prop `isRealContent` (`VideoPlayer`), coberta por teste dedicado.
- **Consequências:** `tmdbClient.ts` ganhou `getGenreMap` (cache separado, por idioma) e um fallback de sinopse em inglês quando a tradução pt-BR vem vazia (mesmo problema da ADR-025, resolvido na origem desta vez, não só no consumidor) — usado tanto por `/filmes` quanto por `Channel.tmdb`.

## ADR-027 — Sprint 02.5: reconstrução visual, sem tocar em backend/lógica de player

- **Decisão:** substituição da `PageShell` (sidebar administrativa + barra superior estreita) por `AppShell` (navegação horizontal no desktop, barra de abas no rodapé em telas estreitas), introdução de `PageHeader`/`ContentRail`/`MoviePosterCard`/`MovieGrid`/`FeaturedSection`, fundo cinematográfico original (`.bg-cinematic`), e expansão dos metadados do TMDB com `posterUrl` (pôster retrato) e `rating` (nota), mantendo `backdropUrl` para onde já fazia sentido (canais fictícios, 16:9).
- **Contexto:** pedido explícito do usuário, com um levantamento visual formal da referência pública (`/movies`) como insumo — ver `visual-audit.md` para a tabela completa de diferenças e prioridades (P0/P1/P2).
- **Escopo deliberadamente NÃO tocado:** nenhuma rota de API nova, nenhuma mudança na lógica do player (`useVideoPlayer`, adapters), nenhum dado novo além do que o TMDB já expõe (`poster_path`, `vote_average` — campos que já vinham na mesma resposta de busca usada desde ADR-024, só não extraídos ainda).
- **Sem Playwright novo:** ver `visual-regression.md` — reaproveitado `mcp__rea__capture_browser_scenario`, já em uso desde a Sprint 01, em vez de adicionar uma dependência nova para resolver o mesmo problema (captura de navegador real com viewport customizado).
- **Sem biblioteca de ícones nova:** `components/ui/icons.tsx` — 6 SVGs inline desenhados à mão, suficientes para a navegação (início, catálogo, filmes, favoritos, busca, menu). Uma biblioteca completa (ex.: lucide-react) traria centenas de ícones não usados, por um ganho que 6 componentes de ~10 linhas cada já entregam.
- **`posterUrl` (retrato) além de `backdropUrl` (paisagem) no mesmo `TmdbMetadata`:** a Sprint anterior (ADR-024) só buscava `backdrop_path` porque o único card de filme existente era 16:9. Com `MoviePosterCard` em 2:3, o pôster retrato é a imagem correta — mas `backdropUrl` continua sendo usado pelo `VideoPlayer` (poster do elemento `<video>`, onde paisagem cabe melhor) e por `ChannelCard` (card de canal, que não mudou de proporção nesta sprint). Os dois convivem no mesmo objeto porque representam usos genuinamente diferentes, não redundância.
- **`rating` pode ser `null`:** o TMDB devolve `vote_average: 0` tanto para "sem avaliações" quanto, em tese, para uma nota real de zero — `searchMovie` trata `0` como "sem nota" (`> 0` para aceitar), documentado explicitamente no código e testado (`tmdbClient.test.ts`).
- **`AppShell` troca o breakpoint de navegação de `md` (768px) para `lg` (1024px):** encontrado só na verificação visual real, comparando nossa captura em 768px com a da referência no mesmo viewport — ver `visual-regression.md`, "Problema encontrado depois da primeira implementação", para o ciclo completo (captura → comparação → correção → recaptura).
- **`FeaturedSection` só aparece com mais de 4 filmes:** com exatamente 4 filmes reais no acervo atual, mostrar um trilho "Em destaque" E uma grade completa logo abaixo duplicaria os mesmos 4 pôsteres duas vezes na tela — decisão de produto tomada durante a implementação (não estava no pedido original), documentada e testada (`MoviesPage.test.tsx`).
- **Verificação real:** 9 capturas de navegador real (4 viewports × referência + 4 viewports × local + 1 recaptura pós-correção), `capture.events: ["console","page-errors"]` em todas — zero erros em todas as execuções. Ver `visual-regression.md` para a tabela completa.
- **Consequências:** `PageShell.tsx`, `Sidebar.tsx`, `TopBar.tsx` e `app/store/uiStore.ts` foram removidos (substituídos, não deixados como código morto) — `git log`/histórico preserva o conteúdo anterior se algum dia for preciso consultá-lo. `MovieCard.tsx` renomeado/reescrito para `MoviePosterCard.tsx` (mesma razão).

---

## Decisões do planejamento inicial (histórico — algumas substituídas acima)

1. ~~Localização do código~~ → substituída por ADR-007.
2. **Escopo exato do MVP** — ver `backlog.md`, Seção "Obrigatório vs. Opcional vs. Evolução futura" (ainda válido, catálogo chega na Sprint 02).
3. ~~Gerenciador de pacotes~~ → decidido: **Bun**, conforme definição explícita do usuário na Sprint 01.
