# SaimoTV Lab

Monorepo com duas frentes:

- **`docs/reverse-engineering/`** — laboratório de engenharia reversa educacional do Saimo TV (investigação; código-fonte de terceiros nunca entra aqui).
- **`docs/implementation/`** — implementação própria, original e independente (este README cobre como rodá-la).

Ver `AGENTS.md`/`CLAUDE.md` para as regras do laboratório, e `docs/implementation/README.md` para o índice completo da documentação de implementação.

## Pré-requisitos

- [Bun](https://bun.sh) ≥ 1.4 (gerenciador de pacotes e runtime únicos deste projeto — sem npm/pnpm/yarn).

## Instalação

```bash
bun install
```

Instala as dependências de todos os workspaces (`apps/web`, `apps/api`, `packages/shared`, `packages/config`) de uma vez.

## Variáveis de ambiente

Cada app tem um `.env.example` documentando o que é necessário. Para rodar localmente:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
```

| App | Variável | Padrão | Papel |
|---|---|---|---|
| `apps/api` | `PORT` | `3001` | Porta HTTP do backend Hono |
| `apps/api` | `WEB_ORIGIN` | `http://localhost:5173` | Origem permitida pelo CORS |
| `apps/api` | `NODE_ENV` | `development` | — |
| `apps/web` | `VITE_API_URL` | `http://localhost:3001` | Base URL que o frontend usa para chamar a API |

## Rodando em desenvolvimento

```bash
bun run dev
```

Sobe **frontend e backend simultaneamente** (via `concurrently`, ver `docs/implementation/decisions.md` sobre essa escolha):

- Backend (Hono): **http://localhost:3001** — `GET /api/health` responde `{"status":"ok","service":"saimotv-lab-api"}`.
- Frontend (Vite): **http://localhost:5173** — mostra, no canto superior direito (só em desenvolvimento), o estado da conexão com a API.

Para subir só um dos dois: `bun run dev:api` ou `bun run dev:web`.

## Scripts disponíveis (raiz)

| Comando | O que faz |
|---|---|
| `bun run dev` | Frontend + backend em paralelo |
| `bun run build` | Build de produção de todos os pacotes |
| `bun run lint` | ESLint em `apps/api` e `apps/web` |
| `bun run typecheck` | `tsc --noEmit` em todos os pacotes TypeScript |
| `bun run test` | Testes de `packages/shared`, `apps/api` (`bun test`) e `apps/web` (`vitest run`) |

## Estrutura

```
apps/
  web/     React + Vite + TypeScript + Tailwind
  api/     Hono rodando no runtime do Bun
packages/
  shared/  Schemas Zod e tipos compartilhados entre web e api
  config/  tsconfig base compartilhado
docs/
  reverse-engineering/   investigação (histórica, não tocar sem justificativa)
  implementation/        arquitetura, decisões, backlog e progresso da implementação própria
research/
  artifacts/             evidências da engenharia reversa (fora do versionamento)
```

## Testando

Ver `docs/implementation/testing.md` para a estratégia completa. Resumo:

```bash
bun run test        # todos os pacotes
bun run --cwd apps/api test       # só o backend
bun run --cwd apps/web test       # só o frontend
```
