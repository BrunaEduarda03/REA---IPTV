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
