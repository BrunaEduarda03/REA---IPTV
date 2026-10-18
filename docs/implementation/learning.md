# Learning — Conceitos Aprendidos na Construção

Diferente de `docs/reverse-engineering/learning.md` (conceitos aprendidos *observando* o Saimo TV), este arquivo registra conceitos aprendidos **construindo** nossa própria implementação — incluindo onde escolhemos um caminho diferente do observado e o que isso ensinou por comparação.

Preenchido progressivamente, a cada sprint, seguindo o ciclo da Etapa 6 (problema → solução → código → alternativas → trade-offs → testes → exercício).

---

## Sprint 01 — Fundação Full Stack

### 1. Por que Bun Workspaces

**Problema:** frontend e backend têm ciclos de vida, dependências e runtimes diferentes (um roda no navegador, outro no servidor), mas precisam compartilhar tipos e evoluir junto.

**Solução:** `workspaces` no `package.json` raiz (`["apps/*", "packages/*"]`) diz ao Bun: "trate essas pastas como um único projeto para fins de instalação". Cada pasta ainda tem seu próprio `package.json` (suas próprias dependências, scripts, versão), mas o `bun install` roda uma vez só, resolve tudo, e cria um único `bun.lock` na raiz.

**Código real** (`package.json` raiz):
```json
{
  "workspaces": ["apps/*", "packages/*"]
}
```
E em `apps/api/package.json`:
```json
{ "dependencies": { "@saimotv/shared": "workspace:*" } }
```
O protocolo `workspace:*` diz ao Bun "não baixe isso do npm, é um pacote local do monorepo" — ele cria um symlink (`apps/api/node_modules/@saimotv/shared` → `packages/shared`), então qualquer mudança em `packages/shared/src` é vista instantaneamente por quem o importa, sem publicar nada.

**Alternativas:** `npm`/`pnpm`/`yarn` workspaces (mesmo conceito, sintaxe quase idêntica — a escolha por Bun aqui é a do runtime, não do conceito de workspace em si); Turborepo/Nx (adicionam cache de build e orquestração de tarefas — overkill para 2 apps + 2 pacotes nesta fase).

**Trade-off:** ganhamos compartilhamento de tipos sem publicar pacote nenhum; perdemos o isolamento total que repositórios separados dariam (um bug em `packages/shared` pode, em teoria, quebrar os dois apps ao mesmo tempo — mitigado pelos testes do próprio `packages/shared`).

**Exercício:** adicione um terceiro workspace fictício `packages/ui` com um componente simples, importe-o em `apps/web` via `workspace:*`, e observe o `bun install` criar o symlink sem precisar reinstalar nada do zero.

---

### 2. Por que separar `apps/web` e `apps/api`

**Problema:** se o frontend e o backend vivessem no mesmo processo/projeto, não daria para implantá-los de forma independente (ex.: escalar a API sem reconstruir o frontend), nem testar um sem iniciar o outro.

**Solução:** dois apps completamente independentes, cada um com seu próprio `vite.config.ts`/entry point, falando entre si **só por HTTP** — exatamente como dois serviços em produção falariam, mesmo rodando lado a lado em desenvolvimento.

**Trade-off:** mais configuração (dois `tsconfig.json`, dois `package.json`) do que um único projeto full-stack "mágico" (ex. Next.js API routes) ofereceria — mas em troca, nenhuma mudança de frontend força rebuild do backend e vice-versa, e cada um pode, no futuro, ter um ciclo de deploy próprio.

**Exercício:** pare o backend (`Ctrl+C` no processo `dev:api`) com o frontend ainda rodando, recarregue a página, e observe o `ConnectionStatus` mudar para "Falha ao conectar" sem o frontend quebrar — prova de que são processos de fato independentes.

---

### 3. Como o frontend se comunica com o backend

**Fluxo real, rastreado ponta a ponta:**

1. `apps/web/src/lib/env.ts` lê `import.meta.env.VITE_API_URL` (o Vite só expõe variáveis prefixadas com `VITE_` ao código do navegador — é uma proteção contra vazar segredos de `.env` sem querer).
2. `apps/web/src/lib/httpClient.ts` (`apiGet`) monta a URL completa e chama `fetch`.
3. `apps/web/src/features/health/api/getHealth.ts` chama `apiGet("/api/health")` e **valida** a resposta com `healthResponseSchema.parse(...)` antes de devolvê-la tipada.
4. `apps/web/src/features/health/hooks/useHealthQuery.ts` embrulha isso num `useQuery` do TanStack Query — cache, retry e refetch automático "de graça".
5. `apps/web/src/features/health/components/ConnectionStatus.tsx` só lê o resultado do hook (`isLoading`/`isError`/`data`) e renderiza — nenhuma lógica de rede no componente.

Do outro lado: `apps/api/src/app.ts` monta o Hono, aplica CORS restrito a `WEB_ORIGIN`, e monta `healthRoutes` em `/api`. `apps/api/src/index.ts` só inicia o servidor (`Bun.serve` implícito via `export default { fetch, port }` — é assim que o runtime do Bun sabe o que servir).

**Por que essa separação em camadas** (env → httpClient → api/ → hooks/ → components/) **importa:** cada camada pode ser testada isoladamente. O teste de `ConnectionStatus` (Sprint 01) não testa rede de verdade — ele troca `fetch` por um mock e testa só a renderização. Um teste futuro de `getHealth` poderia testar só a validação Zod, sem renderizar nada.

---

### 4. Como funcionam os contratos Zod compartilhados

**O problema que isso resolve:** em APIs tradicionais, é fácil o backend mudar um campo e o frontend só descobrir em produção, quando algo quebra silenciosamente.

**Como funciona, no código real** (`packages/shared/src/schemas/health.ts`):
```typescript
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("saimotv-lab-api"),
});
export type HealthResponse = z.infer<typeof healthResponseSchema>;
```
`z.infer<typeof X>` extrai um **tipo estático do TypeScript** a partir do schema **em runtime** — você escreve a validação uma vez, e ganha o tipo de graça, sem duplicar como `interface HealthResponse { status: "ok"; service: "saimotv-lab-api" }` separadamente (que poderia divergir do schema com o tempo).

O backend usa esse schema para **construir** a resposta (`healthResponseSchema.parse({...})` em `health.routes.ts`) — se um campo obrigatório faltar, o servidor falha explicitamente, não envia um JSON incompleto. O frontend usa o **mesmo** schema para **validar** o que recebeu (`getHealth.ts`) — se o backend mudar o shape sem avisar, o frontend recebe um erro de parsing claro, não um `undefined` silencioso em algum lugar da UI.

**Alternativa que NÃO usamos:** gerar tipos TypeScript a partir de uma spec OpenAPI/Swagger separada — funciona, mas introduz uma ferramenta de geração de código e um arquivo de spec que pode ficar dessincronizado do código real. Zod compartilhado é "a spec É o código".

**Exercício:** adicione um campo opcional `uptime: z.number()` ao `healthResponseSchema`, faça o backend preenchê-lo (`process.uptime()` não existe no Bun da mesma forma — pesquise `Bun.nanoseconds()` ou um timestamp de início guardado em módulo), e observe o TypeScript do frontend reclamar em qualquer lugar que assumia o shape antigo.

---

### 5. Por que Zustand e TanStack Query têm responsabilidades diferentes

**O conceito central: client state vs. server state.**

| | Client state | Server state |
|---|---|---|
| **Onde "mora" de verdade** | Só no navegador | No backend; o navegador só tem uma cópia |
| **Exemplo neste sprint** | `isSidebarOpen` (Zustand) | Resposta de `/api/health` (TanStack Query) |
| **Pode ficar desatualizado?** | Não — é a única fonte de verdade | Sim — por isso precisa de cache, revalidação, retry |
| **Quem deveria gerenciar** | Uma store simples (Zustand, Context, `useState`) | Uma lib feita para isso (TanStack Query, SWR) |

**Por que isso importa na prática:** se você guardasse a resposta de `/api/health` numa store Zustand (`useHealthStore`), teria que implementar, à mão, tudo que o TanStack Query já resolve: refetch periódico, deduplicação de requisições simultâneas, estado de loading/erro, cache entre componentes que usam o mesmo dado. Zustand **não tem opinião nenhuma** sobre essas coisas — e não deveria, não é o problema dele.

**Código real que ilustra a fronteira:**
```typescript
// Client state — Zustand (app/store/uiStore.ts): nunca expira, não "busca" nada
export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
}));

// Server state — TanStack Query (features/health/hooks/useHealthQuery.ts): busca,
// cacheia, revalida sozinho a cada 15s
export function useHealthQuery() {
  return useQuery({ queryKey: ["health"], queryFn: getHealth, refetchInterval: 15_000 });
}
```

**Exercício:** tente justificar, em uma frase, por que "favoritos" (Sprint 04) é **client state** mesmo sendo uma lista que poderia, teoricamente, vir de um servidor — pista: onde o dado é a fonte de verdade quando não há conta de usuário nem backend de favoritos.

---

### 6. Como funciona a inicialização do Hono

**Código real** (`apps/api/src/app.ts` + `index.ts`):
```typescript
// app.ts — monta o app, SEM iniciar servidor (importante para testes)
export function createApp() {
  const app = new Hono();
  app.use(requestLogger);
  app.use("/api/*", cors({ origin: env.WEB_ORIGIN }));
  app.route("/api", healthRoutes);
  app.onError(errorHandler);
  return app;
}

// index.ts — só aqui o servidor de fato sobe
const app = createApp();
export default { port: env.PORT, fetch: app.fetch };
```

**Por que separar `createApp()` de `index.ts`:** o teste de `health.routes.test.ts` importa `createApp`, chama `app.request("/api/health")` **sem nunca abrir uma porta de rede real** — Hono simula a requisição inteira em memória. Isso torna o teste instantâneo (25ms para rodar) e elimina qualquer flakiness de porta ocupada/timing de rede.

**O `export default { port, fetch }`:** essa é a convenção do runtime do Bun para "aqui está um servidor" — não é uma API do Hono, é o Bun reconhecendo esse shape e chamando `Bun.serve()` internamente. `fetch: app.fetch` conecta o roteador do Hono a cada requisição recebida.

**Exercício:** adicione um segundo módulo (`apps/api/src/modules/ping/ping.routes.ts`, por exemplo) com uma rota `GET /ping` que devolve texto puro, monte-o em `app.ts` com `app.route("/api", pingRoutes)`, e escreva um teste seguindo o padrão de `health.routes.test.ts`.

---

### 7. Como executar e testar (resumo prático)

Ver `README.md` (raiz) para o passo a passo completo. Resumo do que foi **de fato executado e verificado** nesta sprint:

```bash
bun install                 # 373 pacotes instalados
bun run typecheck            # 0 erros, 3 pacotes
bun run lint                  # 0 erros, 2 apps
bun run test                   # 8/8 testes passando
bun run build                   # api: 225 KB · web: 435 KB (135 KB gzip)
bun run dev                      # api :3001 + web :5173, verificado com curl e screenshot real
```

---

## Sprint 02 — Catálogo Full Stack

### 1. Como funciona uma API REST (no nosso caso concreto, não na teoria genérica)

Uma API REST expõe **recursos** (substantivos: "categorias", "canais") através de **URLs** e deixa o **método HTTP** dizer a intenção (`GET` = ler, sem efeito colateral). Nossa API tem três recursos/ações:

```
GET /api/categories           → coleção de categorias
GET /api/channels             → coleção de canais, filtrável/paginável via query string
GET /api/channels/:id         → um canal específico, pelo identificador na própria URL
```

O que torna isso "RESTful" na prática, não só "uma API qualquer": (1) o recurso está no caminho (`/channels/:id`), não num parâmetro (`/api?resource=channel&id=...`); (2) parâmetros que **filtram uma coleção** (busca, categoria, página) vão na **query string** (`?search=...`), porque não identificam um recurso único, só restringem quais da coleção você quer ver; (3) o código de status HTTP comunica o resultado antes mesmo do corpo da resposta (`200` = achou, `404` = não existe, `400` = seu pedido está malformado).

**Exercício:** se quiséssemos permitir **criar** um conteúdo (não faz parte do backlog atual, é só para pensar), qual método HTTP e qual URL você usaria — e por quê `POST /api/channels` é mais "RESTful" que `GET /api/channels/create`?

---

### 2. Como separar routes, services e repositories (com o código real desta sprint)

```typescript
// catalog.routes.ts — só sabe de HTTP: ler entrada, chamar algo, devolver resposta
.get("/channels", zValidator("query", channelListQuerySchema, hook), (c) => {
  const query = c.req.valid("query");
  return c.json(catalogService.listChannels(query)); // não sabe COMO a lista é montada
})

// catalog.service.ts — só sabe de REGRA DE NEGÓCIO: filtrar, ordenar, paginar
listChannels(query: ChannelListQuery): ChannelListResponse {
  let items = catalogRepository.findAllChannels(); // não sabe DE ONDE os dados vêm
  if (query.categoryId) items = items.filter(/* ... */);
  // ...
}

// catalog.repository.ts — só sabe de ACESSO A DADOS: hoje um array, podia ser qualquer coisa
findAllChannels(): Channel[] {
  return [...channelFixtures]; // só isso muda se um dia virar Drizzle
}
```

**O teste que prova que a separação vale a pena:** em `catalog.test.ts`, chamamos `app.request("/api/channels?...")` — o teste nunca importa `catalog.repository` nem `catalog.fixtures` diretamente. Ele testa o **comportamento observável** (dado um pedido HTTP, que resposta volta), não a implementação interna. Se trocássemos o repository por Drizzle amanhã, **nenhum teste existente precisaria mudar**.

**Exercício:** sem rodar nada ainda, escreva (só no papel/num arquivo) a assinatura de um `catalog.service.test.ts` que testasse `listChannels` **sem** passar por HTTP nenhum — só chamando a função diretamente. O que isso testaria que `catalog.test.ts` (via HTTP) não testa tão bem, e vice-versa?

---

### 3. Como os dados percorrem o sistema (ponta a ponta, com nomes de arquivo reais)

```
Usuária digita "pulso" na busca
  → SearchInput.tsx (debounce 400ms)
    → CatalogPage.tsx: patchParams({ search: "pulso" }) → useSearchParams muda a URL
      → useMemo recalcula `query` com channelListQuerySchema.parse(...)
        → useChannels(query) — queryKey mudou → TanStack Query dispara nova busca
          → catalogApi.ts: getChannels(query) monta a query string
            → httpClient.ts: apiGet("/api/channels?search=pulso&...")
              → [rede] → apps/api/src/app.ts recebe a requisição
                → catalog.routes.ts valida com zValidator
                  → catalog.service.ts filtra/ordena/pagina
                    → catalog.repository.ts devolve os dados fictícios
                  ← ChannelListResponse volta validado por channelListResponseSchema (no service/rota)
                ← JSON
              ← [rede] ← resposta chega no browser
            ← catalogApi.ts valida de novo com o MESMO schema (frontend)
          ← TanStack Query guarda em cache sob a queryKey ["catalog","channels",{search:"pulso",...}]
        ← CatalogPage recebe `data`, re-renderiza
      ← grade de cards atualizada na tela
```

Repare: o schema `channelListResponseSchema` valida a resposta **duas vezes** — uma vez implicitamente (o backend só devolve o que `listChannels` retorna, que já é tipado como `ChannelListResponse`) e uma vez explicitamente no frontend (`getChannels` chama `.parse()`). Isso não é redundância sem propósito: o backend garante que **ele mesmo** não quebra o contrato; o frontend garante que **não confia cegamente** no que chegou pela rede, mesmo vindo do "seu próprio" backend (que podia estar numa versão diferente, atrás de um proxy, etc.).

**Exercício:** usando as DevTools do navegador (aba Network), observe a requisição real de `GET /api/channels` ao trocar de página no catálogo — qual é a `queryKey` que você imagina que o TanStack Query usou, só olhando a query string da URL?

---

### 4. Como funciona a validação com Zod (no nível de query string HTTP)

A parte menos óbvia não é validar um objeto JSON — é validar uma **query string**, que chega como texto puro:

```typescript
// A URL real: GET /api/channels?page=2&pageSize=8
// c.req.query() devolve: { page: "2", pageSize: "8" }  ← tudo string!

export const channelListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  //     ^^^^^^^^ converte "2" → 2 ANTES de validar que é um inteiro positivo
});
```

Sem `z.coerce`, `z.number()` rejeitaria `"2"` (é uma string, não um número) — um erro clássico de quem começa a validar query strings com Zod. `z.coerce.number()` tenta `Number("2")` primeiro, e só então aplica as regras (`int()`, `positive()`) sobre o resultado.

**O ganho de ter isso no `packages/shared`:** o `.default(1)` só existe escrito **uma vez**. Se amanhã decidirmos que a página padrão deveria ser diferente, ou que `pageSize` máximo deveria subir de 50 para 100, mudamos em um lugar e tanto a validação do backend quanto a leitura da URL no frontend (`CatalogPage.tsx`) pegam a mudança automaticamente.

**Exercício:** adicione um novo parâmetro opcional `status` (filtrar por `ChannelStatus`) ao `channelListQuerySchema`, implemente o filtro correspondente em `catalog.service.ts`, e escreva um teste para ele em `catalog.test.ts`.

---

### 5. Como o TanStack Query gerencia server state (com os três hooks reais)

| Hook | `staleTime` | `placeholderData` | Por quê essa combinação |
|---|---|---|---|
| `useCategories` | 5 min | — | Dado quase estático; refetch frequente seria desperdício |
| `useChannels` | 30s | `keepPreviousData` | Muda com frequência (cada filtro/busca/página é uma combinação nova), mas trocar de página não deveria fazer a tela "piscar" |
| `useChannel` | padrão (0) | — | Página de detalhe isolada; sempre buscar fresco ao entrar nela é aceitável |

**`staleTime` não é "tempo de cache"** — é "por quanto tempo um dado em cache é considerado **bom o suficiente** para não refazer a busca". Mesmo depois do `staleTime` vencer, o dado **continua no cache** (não desaparece) — só que a próxima vez que alguém pedir aquela `queryKey`, o TanStack Query mostra o que tem **imediatamente** (sem tela de loading) e dispara um refetch **em paralelo** (`isFetching: true` enquanto `isPending` já é `false`). É exatamente essa diferença que `CatalogPage.tsx` usa para mostrar "Atualizando…" (sutil) em vez do esqueleto inteiro (`isRefreshing = isFetching && !isPending`).

**Invalidação de cache** (não usada ainda nesta sprint, mas o mecanismo que resolveria "favoritar um canal deveria atualizar a lista" na Sprint 04): `queryClient.invalidateQueries({ queryKey: catalogKeys.channel(id) })` marca aquela entrada como stale e dispara um refetch na próxima vez que alguém a estiver observando.

**Exercício:** usando o React Query Devtools (não instalado ainda — seria `@tanstack/react-query-devtools`), você conseguiria ver visualmente quais `queryKey`s estão em cache agora mesmo. Avalie: isso valeria a pena instalar já, ou é "biblioteca para checklist" nesta fase? Justifique com um critério, não só uma opinião.

---

### 6. Quando usar Zustand e quando usar URL state (a terceira perna do tripé, depois de client state vs. server state)

Até a Sprint 01 só tínhamos dois tipos de estado (client state via Zustand, server state via TanStack Query). A Sprint 02 introduz uma distinção mais fina **dentro** do client state:

| Pergunta | Se "sim" → | Exemplo real |
|---|---|---|
| Um link com esse estado deveria mostrar a mesma coisa para outra pessoa? | **URL** | busca, categoria, página |
| É preferência de "como eu, pessoalmente, quero ver isso agora"? | **Zustand** | grade vs. lista |

**O teste decisivo:** imagine enviar o link atual para alguém. Se a resposta intuitiva for "ela deveria ver exatamente a mesma busca/filtro/página que eu" → URL. Se for "ela pode preferir ver de outro jeito, isso é só meu" → Zustand (ou até `localStorage`, numa sprint futura, se quisermos persistir entre sessões).

**Por que não colocamos o modo grade/lista na URL também** (seria tecnicamente possível, `?view=list`): poluiria a URL com algo que não faz parte do "o que" está sendo mostrado, só do "como" — e todo link de catálogo passaria a carregar esse parâmetro sem necessidade.

**Exercício:** dos itens do backlog ainda não implementados (favoritos, preferências do player), classifique cada um como "deveria estar na URL" ou "deveria ser client state local" — e justifique um deles com o teste do link acima.

---

### 7. Como evitar acoplamento entre frontend e backend

Três mecanismos, já em uso, que fazem isso na prática (não só em teoria):

1. **Contrato compartilhado** (`packages/shared`): o frontend não "adivinha" o formato da resposta — importa o mesmo tipo que o backend usa para construí-la. Se o backend mudar um campo sem atualizar o schema compartilhado, o **próprio backend** para de compilar (`catalog.service.ts` teria que devolver algo que bate com `ChannelListResponse`).
2. **Services isolados do transporte** (`catalogApi.ts` no frontend, `catalog.service.ts` no backend): nenhum componente React chama `fetch` diretamente, e nenhuma rota Hono tem lógica de filtro/ordenação dentro do handler — cada lado tem uma camada fina que esconde "como" o dado é obtido, expondo só "o que" foi obtido.
3. **IDs opacos, não estrutura interna**: o frontend trata `channel.id` como uma string opaca (`"ch-05"`) — nunca assume nada sobre seu formato. Se o backend decidisse trocar para UUIDs amanhã, nenhuma lógica do frontend quebraria.

**Exercício:** tente imaginar uma mudança no backend que **quebraria** o frontend mesmo com essas três camadas em vigor. (Dica: pense em algo que nenhum tipo estático consegue capturar.)

---

### 8. Como substituir dados em memória por PostgreSQL no futuro (sem reescrever tudo)

Ver a seção "Estratégia futura de persistência" em `architecture.md` para o código ilustrativo lado a lado. O resumo conceitual: a interface do `catalogRepository` (três funções, nomes e assinaturas) é o **contrato** entre o service e "onde quer que os dados morem". Hoje a implementação é `[...channelFixtures]`; com Drizzle, seria uma consulta `db.select().from(channels)`. O `catalog.service.ts` **nunca precisaria saber a diferença** — só passaria a usar `await` nas chamadas, porque uma consulta a banco é assíncrona e um array em memória não.

Essa é a mesma ideia, em miniatura, do padrão "Repository" usado em arquiteturas maiores (hexagonal, ports & adapters): a regra de negócio depende de uma **interface**, não de uma **implementação concreta** de acesso a dados.

**Exercício final da sprint:** escreva (sem instalar Drizzle, só como exercício de design) a assinatura de tipos de uma tabela `channels` no estilo Drizzle (`pgTable("channels", { id: ..., name: ..., ... })`) que corresponderia ao schema Zod `Channel` que já temos — quais tipos de coluna PostgreSQL você escolheria para `status` (um enum de 3 valores) e para `isFeatured` (booleano)?

---

## Sprint 03 — Player

### 1. O padrão Adapter, na prática (não só o nome)

**O problema:** o elemento `<video>` nativo só sabe tocar o que o navegador entende sozinho. HLS (`.m3u8`) não é um desses formatos na maioria dos navegadores (só Safari) — por isso existe `hls.js`, uma biblioteca que "ensina" o navegador a tocar HLS via Media Source Extensions. Se `useVideoPlayer` chamasse `hls.js` diretamente, ficaria para sempre acoplado a essa biblioteca específica.

**A solução, com o código real:**
```typescript
// types/player.ts — o CONTRATO, não uma implementação
export interface MediaSourceAdapter {
  attach(video: HTMLVideoElement, src: string): void | Promise<void>;
  destroy(): void;
}

// hooks/useVideoPlayer.ts — só conhece o contrato
const adapter = createAdapter(video, src); // podia devolver QUALQUER implementação
adapterRef.current = adapter;
await adapter.attach(video, src);
```

O hook nunca escreve `import Hls from "hls.js"` — só `createAdapter`, que é a ÚNICA peça que sabe que hls.js existe. Isso é "inversão de dependência": em vez do código de alto nível (`useVideoPlayer`) depender do de baixo nível (`hls.js`), os dois dependem de uma interface no meio.

**Por que isso não é over-engineering aqui (mas poderia ser, em outro contexto):** o teste disso é se existe mais de uma implementação real, hoje ou previsivelmente amanhã. Aqui já existem duas (`nativeAdapter`, `hlsAdapter`), e uma terceira (Shaka/DASH) é um caminho natural documentado (ADR-016) — a interface já está "pagando aluguel".

**Exercício:** esboce a assinatura de um `shakaAdapter` (sem implementar) que cumpriria a mesma interface `MediaSourceAdapter` — o que mudaria na função `createAdapter` para escolher entre os três motores?

---

### 2. `import()` dinâmico para code-splitting de uma biblioteca pesada

```typescript
// hlsAdapter.ts
async attach(video, src) {
  const { default: Hls } = await import("hls.js"); // só baixado AQUI, só quando chamado
  // ...
}
```

**A prova de que funcionou**, direto do output do `bun run build`:
```
dist/assets/index-*.js   468.18 kB   ← tudo, EXCETO hls.js
dist/assets/hls-*.js     595.01 kB   ← só hls.js, em arquivo separado
```

Vite (o bundler) detecta automaticamente um `import()` dinâmico e cria um chunk separado para o que é importado — ninguém que só navega pelo catálogo (sem nunca abrir um vídeo) baixa esses 595 KB. Isso é diferente de um `import Hls from "hls.js"` no topo do arquivo, que entraria no bundle principal sempre, usado ou não.

**Exercício:** usando as DevTools (aba Network, com cache desabilitado), confirme você mesma: abra `/catalogo` (sem clicar em nenhum conteúdo) e observe que `hls-*.js` NÃO é baixado; depois abra um conteúdo disponível e observe o chunk aparecer na lista.

---

### 3. Traduzindo eventos nativos do `<video>` em um `PlayerState` próprio

A API nativa de eventos de mídia (`canplay`, `playing`, `waiting`, `error`, ...) é rica, mas "crua" — não existe um único campo "status atual" no elemento `<video>`. `useVideoPlayer` escuta um subconjunto desses eventos (os mesmos que a engenharia reversa confirmou que o Saimo TV também usa, `docs/reverse-engineering/findings.md` E-024) e os traduz para uma máquina de estados pequena e própria:

```typescript
type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error" | "ended";
```

**Por que não expor os eventos nativos direto para a UI:** `VideoPlayer.tsx` só precisa saber "estou em qual desses 6 estados" para decidir o que desenhar — não precisa (nem deveria) saber a diferença entre os eventos `waiting` e `stalled`, por exemplo. Essa tradução é o que torna o componente de apresentação simples (`{state.status === "error" && <Overlay/>}`), sem `if`s espalhados reagindo a eventos de DOM.

**O evento sintético (`hlsFatalError`):** nem todo erro do hls.js dispara o evento nativo `error` do `<video>` — a biblioteca tem seu próprio sistema de eventos. Para não duplicar a lógica de "o que fazer quando o player falha" em dois lugares, `hlsAdapter` traduz o erro do hls.js para um evento de DOM sintético (`video.dispatchEvent(new ErrorEvent("hlsFatalError", ...))`), que o hook escuta exatamente como escuta o `error` nativo. Um único caminho de tratamento de erro, não importa a origem.

**Exercício:** adicione um evento `progress` (dispara enquanto o navegador baixa dados) e exponha, no `PlayerState`, uma informação simples derivada dele (ex.: `hasBuffered: boolean`, true depois do primeiro `progress`).

---

### 4. O guard de condição de corrida, de novo — agora em código nosso

Documentamos esse padrão só como OBSERVAÇÃO na Fase 03 da engenharia reversa (`docs/reverse-engineering/learning.md`, item 15). Na Sprint 03, implementamos a mesma ideia, de forma original:

```typescript
useEffect(() => {
  let cancelled = false;
  // ... várias operações assíncronas (ex.: adapter.attach(), que pode envolver import() de hls.js) ...
  someAsyncOperation().then((result) => {
    if (cancelled) return; // o efeito já foi "substituído" — ignora o resultado tardio
    setState(/* aplica o resultado */);
  });
  return () => { cancelled = true; }; // React chama isso ANTES de rodar o efeito de novo
}, [src]);
```

**O cenário real que isso evita:** usuária clica rapidamente em dois conteúdos HLS diferentes. O primeiro `attach()` ainda está esperando o `import("hls.js")` resolver quando o segundo começa. Sem o guard, o resultado do PRIMEIRO poderia "vencer a corrida" e sobrescrever o estado depois do segundo já ter assumido — um bug sutil, de timing, difícil de reproduzir manualmente mas fácil de garantir com um teste.

**O teste que prova isso** (`useVideoPlayer.test.tsx`, via dois adapters falsos com `destroyCallOrder`):
```typescript
rerender(<Harness src="src-b" />);
await waitFor(() => expect(adapterB.attach).toHaveBeenCalledTimes(1));
expect(adapterA.destroy).toHaveBeenCalledOnce();      // o antigo foi destruído
expect(destroyCallOrder).toEqual(["A"]);               // ANTES do novo ser criado
```

**Exercício:** remova temporariamente o guard `cancelled` do hook (comente as duas linhas que o usam) e tente escrever um teste que **falhe** por causa disso — qual cenário de timing você precisaria simular?

---

### 5. Por que simplificamos em relação ao que vimos no Saimo TV (e isso é uma decisão, não uma lacuna)

A Fase 03 da engenharia reversa documentou um sistema de recuperação de reprodução bem mais sofisticado no alvo: múltiplas fontes por canal, watchdog de 12s (sem primeiro frame) e de 25s (travamento, checado a cada 2s), fallback automático para a próxima fonte, tudo registrado em `docs/reverse-engineering/findings.md` (E-020). A Sprint 03 **não** replica isso (ADR-016) — e a justificativa não é "não deu tempo", é estrutural: nosso catálogo fictício não tem múltiplas fontes por conteúdo (todas apontam para a mesma mídia de demonstração), então não haveria "próxima fonte" para qual fazer fallback.

**A lição de engenharia aqui:** reconhecer um padrão sofisticado (pela engenharia reversa) não obriga a implementá-lo — obriga a reconhecer *quando* ele se aplicaria, e documentar essa decisão (em vez de simplesmente não pensar nela). Se o backlog crescer para incluir múltiplas fontes por conteúdo, o padrão já está estudado e documentado, pronto para ser reimplementado (com código original) quando fizer sentido.

**Exercício:** usando a assinatura de `MediaSourceAdapter` já existente, esboce (só em texto/pseudocódigo) como um hook `usePlayerWithFallback(sources: string[])` poderia envolver `useVideoPlayer` para tentar a próxima fonte da lista quando `state.status === "error"` — sem reescrever `useVideoPlayer` por dentro.

---

### 6. O padrão "actions slot": decoupling sem Context, sem evento global

A Sprint 04 trouxe o primeiro caso real de duas features precisando aparecer juntas na tela: um botão de favorito, dentro de um card de catálogo. A tentação óbvia seria `ChannelCard` importar `FavoriteButton` direto — mas isso criaria uma dependência de `catalog` sobre `favorites`, quebrando a regra de que features não se conhecem diretamente.

**O que encontramos:** uma prop `actions?: ReactNode` em `ChannelCard`:

```tsx
// features/catalog/components/ChannelCard.tsx — não sabe o que é "favoritos"
interface ChannelCardProps {
  channel: Channel;
  actions?: ReactNode;
}
function ChannelCard({ channel, actions }: ChannelCardProps) {
  return (
    <article>
      <img src={channel.thumbnail} />
      {actions /* renderizado sobre a thumbnail, mas o card não sabe o que é */}
      <h3>{channel.name}</h3>
    </article>
  );
}
```

```tsx
// app/pages/CatalogPage.tsx — a ÚNICA camada que conhece as duas features
<ChannelCard
  channel={channel}
  actions={<FavoriteButton channelId={channel.id} channelName={channel.name} />}
/>
```

**Como isso difere de outras formas de "conectar" duas features:** uma alternativa comum é um barramento de eventos global (`eventBus.emit("favorite:toggled", id)`) ou colocar tudo num Context compartilhado. Ambos resolvem o problema, mas escondem a dependência — ao ler só `ChannelCard.tsx`, não dá pra saber que ele pode disparar um evento de favoritos. Com o slot de composição, a dependência é **visível e local**: olhando só `CatalogPage.tsx`, você vê exatamente quais duas features estão se encontrando ali, e em nenhum outro lugar.

**Por que isso importa:** esse é o mesmo princípio por trás de "inversão de dependência" (a feature de baixo nível, `catalog`, não depende da de cima, `favorites` — é o contrário: `favorites` é injetado de fora). Não veio de nenhuma leitura do código do Saimo TV — é um padrão de composição React padrão, aplicado aqui porque o próprio `architecture.md` deste projeto já declarava a regra ("features não se importam diretamente") antes mesmo de existir um caso concreto para testá-la.

**Como verificar:** `grep -r "features/favorites" apps/web/src/features/catalog/` não deveria retornar nenhum resultado — e de fato não retorna (confirmado na Sprint 04).

**Exercício:** imagine uma terceira feature, `features/watch-later` (assistir depois), que também precisa de um botão no card. Como o slot `actions` (hoje um único `ReactNode`) precisaria mudar para comportar os dois botões ao mesmo tempo, sem que `catalog` precise saber que agora são duas features, não uma?

---

### 7. `persist` do Zustand: o que ele garante sozinho, e o que você ainda precisa garantir

**O que encontramos:** `favoritesStore` usa o middleware `persist`, que serializa o estado para `localStorage` a cada mudança e o lê de volta ao carregar a página:

```typescript
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({ favoriteIds: [], toggleFavorite: /* ... */ }),
    {
      name: "saimotv-lab:favorites",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => ({
        ...current,
        favoriteIds: parseFavoriteIds((persisted as { favoriteIds?: unknown } | null)?.favoriteIds),
      }),
    },
  ),
);
```

**O que `persist` garante sozinho:** serialização (`JSON.stringify`) ao mudar, leitura (`JSON.parse`) ao iniciar, e um `name` que vira a chave do `localStorage`. Isso resolve "persistir entre recarregamentos" — metade do critério de aceitação do backlog.

**O que `persist` NÃO garante sozinho:** que o dado lido de volta tem o shape esperado. Se alguém editar o `localStorage` manualmente via DevTools, ou se uma versão futura do app mudar o schema de `favoriteIds` (ex.: de `string[]` para `{ id: string, addedAt: Date }[]`) e um usuário ainda tiver o formato antigo salvo, `persist` sozinho aceitaria esse dado sem reclamar — o Zod mora exatamente na opção `merge`, o ponto de extensão que o `persist` expõe para "eu decido o que fazer com o que foi lido antes de aceitar".

**A lição de engenharia, ligada à auditoria de RE:** a Fase 04 encontrou o Saimo TV fazendo `JSON.parse` com `try/catch` defensivo em vários pontos de leitura de estado persistido — evidência de que esse é um problema real, não hipotético, mesmo em uma aplicação madura. Replicamos o *princípio* ("nunca confiar que o dado persistido ainda tem o shape que o código atual espera"), com uma implementação própria baseada em Zod, mais forte que um `try/catch` genérico porque valida o **shape**, não só a sintaxe JSON.

**Como verificar:** rode `favoritesStore.test.ts` e leia o teste "localStorage com shape inesperado" — ele escreve `{ state: { favoriteIds: "ch-01,ch-02" }, version: 0 }` diretamente no `localStorage` (uma string, não um array) e confirma que a store abre com `favoriteIds: []`, não com um erro ou um valor corrompido propagado para a UI.

**Exercício:** remova a opção `merge` customizada do `favoritesStore` (deixe o `persist` usar o merge padrão dele) e rode `favoritesStore.test.ts` de novo. Quais testes passam a falhar, e por quê?

---

### 8. Um teste automatizado encontrou um bug que a verificação visual nunca encontraria

A Sprint 03 "provou" a reprodução de vídeo com uma verificação visual real (Chromium real, clique de verdade no botão "Reproduzir", vídeo de fato tocando na tela). Isso é evidência forte — mas é evidência de **um** ambiente: o navegador real. A Sprint 05 escreveu o primeiro teste automatizado que aciona `play()` (através de um atalho de teclado), e esse teste, rodando sob `jsdom` (não um navegador real), revelou isto:

```typescript
// useVideoPlayer.ts — código da Sprint 03, nunca quebrou na Sprint 03
video.play().catch(() => { /* ... */ });
```

```
$ bun run test
# erro: video.play(...).catch is not a function
```

**Por que isso nunca apareceu antes:** a especificação do DOM garante que `HTMLMediaElement.prototype.play()` devolve uma `Promise` — e todo navegador real cumpre isso. Mas `jsdom` (o ambiente que o Vitest usa para simular um DOM sem abrir um navegador de verdade) tem o método `play()` como "não implementado", e devolve `undefined` em vez de uma `Promise` rejeitada. Como nenhum teste anterior chamava `play()` de verdade (só `fireEvent` em eventos do vídeo, nunca um clique real no botão), esse detalhe nunca foi exercitado — nem pelos testes, nem pela verificação visual (que roda num Chromium real, onde o bug não existe).

**A correção, e por que ela não muda nada em produção:**
```typescript
// Promise.resolve(x) devolve x se x já é uma Promise, ou embrulha x numa
// Promise resolvida se não é — comportamento idêntico num navegador real
// (onde play() já é uma Promise), só adiciona segurança onde não é.
Promise.resolve(video.play()).catch(() => { /* ... */ });
```

**A lição de engenharia:** "verificado num navegador real" e "coberto por teste automatizado" são evidências **diferentes**, que encontram classes diferentes de problema. A verificação visual prova que o fluxo funciona no ambiente que o usuário final realmente usa. O teste automatizado, rodando num ambiente mais simples e mecânico (`jsdom`), força o código a não depender silenciosamente de garantias que só esse ambiente específico cumpre — e isso o torna mais robusto para qualquer ambiente futuro (um novo test runner, SSR, um navegador obscuro). Nenhuma das duas formas de verificação substitui a outra — é por isso que `testing.md` documenta as duas separadamente para cada sprint.

**Como verificar:** rode `bun run test` depois de reverter a correção (volte a `video.play().catch(...)` sem `Promise.resolve`) e observe o teste `"atalho de teclado 'T' ... também alterna o modo cinema"` ou qualquer teste que pressione espaço — eles não acionam `play()` diretamente neste conjunto específico (o espaço não foi testado de propósito, veja o exercício abaixo), então para reproduzir o erro originalmente encontrado, adicione um teste que pressione espaço no player focado.

**Exercício:** escreva um teste em `VideoPlayer.test.tsx` que foca o player e pressiona espaço (`await user.keyboard(" ")`), reverta a correção do `Promise.resolve`, e confirme que esse teste novo é quem detecta a regressão — depois reaplique a correção e confirme que ele passa a passar.

---

### 9. O mesmo "slot de composição" (item 6), aplicado de novo — agora entre player e página

O padrão `actions?: ReactNode` (item 6 acima) resolveu "duas features, um componente". O modo cinema é um problema-irmão: "uma feature (`player`) precisa influenciar o **layout da página que a envolve** (`app/pages/ChannelDetailPage.tsx`), sem que `player` saiba nada sobre `ChannelDetailPage`".

A solução aqui é um pouco diferente — não é uma prop de composição, é um **estado observável**:

```tsx
// features/player/store/playerUiStore.ts — player expõe o estado, não decide o layout
export function useIsTheaterMode(): boolean {
  return usePlayerUiStore((state) => state.isTheaterMode);
}

// app/pages/ChannelDetailPage.tsx — a página decide o que fazer com esse estado
const isTheaterMode = useIsTheaterMode();
<article className={isTheaterMode ? "max-w-5xl" : "max-w-2xl"}>
```

**Por que não é o mesmo padrão do item 6:** lá, `catalog` não sabia nada sobre `favorites` — a composição acontecia de fora, via prop. Aqui, é o oposto: `player` sabe que `isTheaterMode` existe (é o dono do estado) e o expõe através de um hook público (`useIsTheaterMode`), mas **não decide o que esse estado significa para quem o lê** — `player` nunca teria como saber que `ChannelDetailPage` usa `max-w-2xl`/`max-w-5xl`, isso é decisão exclusiva da página. É o mesmo princípio de "quem possui o estado não é obrigado a possuir todos os efeitos dele" já visto na tabela de favoritos (`favoritesStore` possui `favoriteIds`; `FavoritesPage` decide o que fazer com eles).

**Exercício:** hoje, só `ChannelDetailPage` lê `useIsTheaterMode()`. Se uma segunda página (hipotética, ex.: uma visão "assistir junto" com dois players lado a lado) também precisasse reagir ao modo cinema de forma diferente, o que mudaria — e o que **não** mudaria — em `playerUiStore.ts`?
