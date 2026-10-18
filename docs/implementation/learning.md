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
