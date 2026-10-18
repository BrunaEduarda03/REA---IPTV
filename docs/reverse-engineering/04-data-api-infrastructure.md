# Fase 04 — Engenharia Reversa de Dados, APIs, Backend e Infraestrutura

**Data:** 2026-10-19
**Alvo:** https://saimo-tv.pages.dev/tv
**Pré-requisito lido:** `findings.md` (E-001 a E-034), `architecture.md`, `questions.md`, `02-javascript-analysis.md`, `03-streaming-player.md`

## Nota metodológica

Esta fase combina **análise estática** dos bundles já baixados (novo: o Service Worker público `sw.js`, baixado nesta fase) com **reexame de evidências de rede já capturadas na Fase 01** (`research/artifacts/capture-01-full.json`) — nenhuma nova requisição de rede foi feita ao site além de baixar `sw.js` (um recurso público estático, equivalente aos demais bundles já coletados). Nenhum endpoint privado foi enumerado, nenhuma autenticação foi contornada, e — seguindo as regras do laboratório — **os domínios de origem de stream de terceiros encontrados na lista de fallback embutida não são listados individualmente** (ver [E-034](./findings.md#e-034--dezenas-de-domínios-de-origem-de-stream-embutidos-na-lista-de-fallback-categorias-de-infraestrutura-observadas-sem-enumeração)), apenas suas categorias de infraestrutura.

---

## 0. Estado inicial e questões pendentes

Recuperado de `questions.md` antes de iniciar: Q-001 (formato do catálogo) parcialmente resolvida na Fase 03; Q-002 resolvida; Q-004 (conteúdo das abas) parcialmente em aberto — **esta fase resolve boa parte da aba "Eventos"**; Q-005 (corpo de `/v1/fontes`/`/v1/hello`) ainda em aberto; Q-006 (estratégia de cache do Service Worker) — **resolvida nesta fase**; Q-007/Q-008/Q-009 permanecem como registradas na Fase 03.

MCP REA confirmado conectado (ferramentas já validadas nas fases anteriores). Nesta fase, as ferramentas efetivamente usadas foram de **leitura de arquivos locais** (bundles já baixados) e `curl` para descobrir/baixar um novo recurso público (`sw.js`) — não foi necessário usar `capture_browser_scenario` novamente, pois a captura de rede da Fase 01 já contém todas as requisições relevantes para esta análise.

---

## 1. Mapeamento das fontes de dados

| ID | Tipo de dado | Origem observável | Momento do carregamento | Componente consumidor | Evidência | Confiança |
|---|---|---|---|---|---|---|
| D-01 | Catálogo de canais (TV) | Arquivo de texto `canais.txt`/`catalogo.txt`, GitHub (`raw.githubusercontent.com/gabrielsaimo/SaimoPlayer`) | No carregamento inicial, com cache-busting (`?t=`) | `catalog.js` | E-004, E-022 | Alta |
| D-02 | Catálogo VOD (filmes/séries) | Mesmo repositório GitHub, caminho `/vod/` | Provavelmente ao abrir a aba correspondente (não observado diretamente) | `catalog.js`/`player.js` | E-031 (referência ao caminho `/vod/`) | Média |
| D-03 | Cache local do catálogo | `localStorage` (`saimo-catalogo-v2`) | Lido antes da rede (mostra algo na tela rapidamente); escrito depois de buscar da rede | `catalog.js` | E-004, E-008 | Alta |
| D-04 | EPG (guia de programação) — TV ao vivo | 4 fontes externas combinadas: `guiadetv.com` (via proxy), PlutoTV (GitHub XML), `iptv-epg.org`, `open-epg.com` | No carregamento inicial, processado em Web Worker | `epgWorker.js` | E-005 | Alta |
| D-05 | "Agora tocando" por canal | Derivado em memória a partir de D-04 (não é uma nova fonte — é processamento local) | Calculado sob demanda (busca binária) e a cada 30s | `player.js` (store pub/sub) | E-014 (Fase 02) | Alta |
| D-06 | Status de servidores de stream | `saimo-monitor...workers.dev/v1/fontes` | No carregamento inicial | `catalog.js` | E-006 | Alta |
| D-07 | Metadados de VOD (pôster, classificação etária) | API pública TMDB (`api.themoviedb.org`, `image.tmdb.org`) | Sob demanda, provavelmente ao abrir a ficha de um filme/série | `catalog.js` | E-029 | Alta |
| D-08 | Eventos esportivos | API pública ESPN (`site.api.espn.com`) + `/api/events` (próprio) + `/v1/eventos` (Worker) — três fontes combinadas | Ao abrir a aba "Eventos" (inferido pelo nome da função) | `index.js` (função `Be()`) | E-030, E-032 | Alta (existência) / média (quando exatamente carrega) |
| D-09 | Legendas de VOD | Addon Stremio de OpenSubtitles (`opensubtitles-v3.strem.io`) | Sob demanda, ao reproduzir um VOD | `player.js` | E-031 | Alta |
| D-10 | Categorias canônicas | **Dado embutido no bundle** (array literal em `player.js`), não uma fonte externa | Carregado junto com o chunk `player.js` | `player.js`, `PainelDeCanais.js` | E-016 | Alta |
| D-11 | Lista de canais de fallback | **Dado embutido no bundle** (array literal em `player.js`) | Carregado junto com o chunk `player.js` | `player.js` | E-016 | Alta |
| D-12 | Logos de canal | Dezenas de hosts de imagem de terceiros, referenciados por URL dentro do catálogo (D-01) | Sob demanda (lazy loading de `<img>`) | `tv.js`/`PainelDeCanais.js` | E-010 | Alta |
| D-13 | Favoritos (TV) | `localStorage` (`saimo-tv-favoritos`) | Lido na montagem, escrito a cada toggle | `catalog.js`/`PainelDeCanais.js` | E-017 | Alta |
| D-14 | Favoritos (VOD) | `localStorage` (`saimo-vod-favoritos` + `-mudou`) | Idem | `catalog.js` | E-017, E-022 (função `vr()`) | Alta |
| D-15 | Preferências de usuário (volume, nitidez/upscaling, modo dev, canais personalizados) | `localStorage` (múltiplas chaves) | Variado | Vários | E-017 | Alta (existência) / baixa (uso exato de cada uma) |
| D-16 | App shell (HTML/JS/CSS/ícones) | Cache Storage via Service Worker (`saimo-casca-v1`) | Pré-cacheado na instalação do SW; atualizado em cada visita | — (infraestrutura, não componente de UI) | E-027 | Alta |

**Distinção importante (conforme pedido):** D-01, D-02, D-04 (parcialmente), D-07, D-08, D-09 são **respostas de serviços remotos** (de terceiros ou do próprio backend); D-10 e D-11 são **dados estáticos literalmente embutidos no código JavaScript** (não vêm de nenhuma requisição — fazem parte do bundle desde a build); D-03, D-13, D-14, D-15 são **dados persistidos no navegador**, não um backend.

---

## 2. Análise de requisições HTTP

Dados desta seção vêm do reexame da captura de rede já realizada na Fase 01 (`research/artifacts/capture-01-full.json`, carregamento de `/tv`), não de uma nova captura.

### Resumo por categoria

| Categoria | Exemplos observados | Métodos | Content-Type observável | Status |
|---|---|---|---|---|
| **1. Documentos HTML** | `GET /tv` | GET | `text/html` (implícito pelo fallback de SPA, E-012) | 200 |
| **2. JavaScript e CSS** | `/assets/*.js`, `/assets/*.css` | GET | `application/javascript`, `text/css` | 200 |
| **3. Assets estáticos** | `/favicon.png`, `/icons/icon-192.png`, `/manifest.webmanifest`, `/sw.js` | GET | `image/png`, `application/javascript` (confirmado para `sw.js`, E-027) | 200 |
| **4. Dados estruturados** | `canais.txt`/`catalogo.txt` (GitHub), respostas de `/api/proxy` | GET | texto puro (catálogo); HTML (proxy de `guiadetv.com`) | 200 |
| **5. Recursos de mídia** | Logos de canal (`.png`/`.jpg`/`.jpeg`) | GET | `image/*` | 200 (maioria); **1 ocorrência de 404** (`i.postimg.cc`, logo indisponível — consistente com o mecanismo de fallback de E-015) |
| **6. Serviços externos identificáveis** | `saimo-monitor...workers.dev` (`/v1/hello` **POST**, `/v1/fontes` GET), `raw.githubusercontent.com`, `fonts.googleapis.com`/`fonts.gstatic.com`, `gstatic.com` (Cast SDK) | GET (maioria) + **1 POST** | variado | 200 |

### Métodos HTTP observados
**126 requisições GET, 1 POST** (`POST /v1/hello` ao Worker de monitoramento — E-033, uma correção ao registro original E-006, que não especificava o método).

### Cache
- Headers de resposta do domínio próprio incluem `cache-control`, `etag`, `content-encoding` (nomes de header confirmados; valores não capturados na Fase 01, exceto para `sw.js`, cujo `Cache-Control: public, max-age=0, must-revalidate` foi lido diretamente nesta fase).
- A estratégia de cache do **Service Worker** (camada acima do cache HTTP do navegador) está completamente documentada em [E-027](./findings.md#e-027--service-worker-público-lido-por-completo-estratégia-de-cache-app-shell-resolve-q-006): network-first para navegação, cache-first para assets com hash, e **exclusão explícita de `/api/*`** de qualquer cache.

### Paginação
**Não observada em nenhum lugar.** O catálogo inteiro (334 canais) parece ser buscado de uma vez (um único arquivo de texto), não paginado. Não há evidência de parâmetros `page`/`offset`/`cursor` em nenhuma URL observada.

### Tratamento de erros
- No nível de UI: mensagens em português ("Erro ao carregar o canal. Tente novamente.", ver Fase 03).
- No nível de dados: fallback entre fontes de stream (Fase 03); fallback de logo quebrado (E-015); a Service Worker usa `.catch()` para servir do cache quando a rede falha em navegação (E-027).

---

## 3. Fluxo completo dos dados

Três fluxos escolhidos, cada um com diagrama de sequência dedicado em `diagrams/`.

### Fluxo 1 — Carregamento inicial do catálogo
Diagrama: [`diagrams/04-fluxo-catalogo-inicial.mmd`](./diagrams/04-fluxo-catalogo-inicial.mmd)

1. **Ação inicial:** usuário abre `/tv` (ou a navegação do React Router resolve essa rota).
2. **Componente:** `catalog.js` (núcleo de dados).
3. **Origem dos dados:** primeiro `localStorage` (cache local, D-03), depois rede (GitHub, D-01) em paralelo.
4. **Requisições:** 🟢 confirmado via captura de rede da Fase 01 — `GET canais.txt?t=...` e `GET catalogo.txt?t=...`.
5. **Processamento:** 🟢 confirmado — parser chave-valor por linha (E-022).
6. **Estado alterado:** lista de `Channel`/`Source[]` em memória; cache local atualizado.
7. **Atualização da interface:** 🟡 inferido — provavelmente renderização em duas etapas (cache primeiro, depois dado fresco), já que o cache é lido antes da requisição de rede completar.

### Fluxo 2 — Seleção de categoria
Diagrama: [`diagrams/04-fluxo-selecao-categoria.mmd`](./diagrams/04-fluxo-selecao-categoria.mmd)

1. **Ação inicial:** clique em uma pílula de categoria.
2. **Componente:** `PainelDeCanais.js` (já mapeado na Fase 02).
3. **Origem dos dados:** **nenhuma nova fonte** — reprocessamento em memória do catálogo já carregado (Fluxo 1).
4. **Requisições:** 🟢 confirmado — **nenhuma**. Esta é uma operação 100% client-side.
5. **Processamento:** 🟢 confirmado — dois `useMemo` encadeados (filtro, depois agrupamento).
6. **Estado alterado:** `categoriaAtiva` (`useState`).
7. **Atualização da interface:** 🟢 confirmado — re-render da lista agrupada.

### Fluxo 3 — Seleção de canal e EPG "agora tocando"
Diagrama: [`diagrams/04-fluxo-selecao-canal-epg.mmd`](./diagrams/04-fluxo-selecao-canal-epg.mmd)

1. **Ação inicial:** clique em um canal.
2. **Componente:** `PainelDeCanais.js` + store pub/sub de `player.js`.
3. **Origem dos dados:** EPG já processado e em memória desde o carregamento inicial (Fluxo 1, paralelo ao D-04) — **não há nova requisição ao trocar de canal**, apenas recomputação local (busca binária, Fase 03).
4. **Requisições:** 🟢 confirmado — nenhuma nova requisição de **dados de EPG**; a requisição de **mídia** (stream do canal) é um fluxo separado, já mapeado na Fase 03.
5. **Processamento:** 🟢 confirmado — função `Zm()` (Fase 03) recalcula periodicamente (a cada 30s).
6. **Estado alterado:** `activeChannelId`; dados de "agora tocando" no componente que assina o store.
7. **Atualização da interface:** 🟢 confirmado — barra de progresso e nome do programa atualizados sem nova requisição de rede.

**Observação importante:** nenhum dos três fluxos envolve um backend de aplicação tradicional respondendo com JSON de "canal selecionado" — **todo o processamento de seleção e filtragem acontece no cliente**, sobre dados já carregados. O backend/serviços externos só são acionados no **carregamento inicial** (Fluxo 1) e, presumivelmente, em pontos como abrir a aba Eventos (D-08) ou VOD (D-07, D-09) — não a cada interação do usuário.

---

## 4. Modelagem dos dados

Diagrama ER: [`diagrams/04-entities-er.mmd`](./diagrams/04-entities-er.mmd)

> Os nomes de entidade abaixo (`Channel`, `Source`, `Category`, `Program`, `MediaItem`, `Favorite`) são **propostas de modelagem educacional** para organizar o que foi observado — não são nomes de classes/tabelas reais do sistema original (que não usa um banco de dados tradicional, ver Seção 6).

### `Channel` — campos comprovados
```typescript
interface Channel {
  id: string;              // comprovado: data-channel-id no DOM
  name: string;             // comprovado
  logo?: string;             // comprovado: URL, pode ser vazia
  category: string;          // comprovado: string livre, não enum formal no código
  channelNumber: number;      // comprovado: atribuído sequencialmente (não é um campo do catálogo bruto)
  sources: Source[];          // comprovado: channel.sources (E-022)
}
```

### `Source` — campos comprovados (por linha do catálogo, E-022)
```typescript
interface Source {
  url: string;                 // comprovado: campo "fonte"
  referer?: string;             // comprovado: campo "referer"
  name?: string;                // comprovado: campo "nome"
  quality?: string;             // comprovado: campo "qualidade"
  userAgent?: string;           // comprovado: campo "agente"
  keyId?: string;                // comprovado: campo "chave" (parte 1)
  key?: string;                   // comprovado: campo "chave" (parte 2)
}
```

### `Program` (EPG) — campos comprovados (Fase 02/03, componentes do `ProgramGuide`)
```typescript
interface Program {
  id: string;                   // comprovado
  title: string;                 // comprovado
  startTime: Date;                // comprovado
  endTime: Date;                   // comprovado
  category?: string;               // comprovado (usado no modal de detalhes)
  description?: string;             // comprovado ("sinopse")
  thumbnail?: string;                // comprovado
  episodeInfo?: { season?: number; episode?: number }; // comprovado (função A() na Fase 02)
}
```

### `MediaItem` (VOD) — campos **sugeridos**, não comprovados em detalhe
```typescript
// 🟡 Parcialmente inferido: sabemos que existe posterPath (via TMDB) e
// classificação etária BR, mas não lemos a interface completa de VOD.
interface MediaItem {
  id: string;                      // inferido
  title: string;                    // inferido
  posterPath?: string;               // comprovado: construído via TMDB (E-029)
  contentRatingBR?: string;           // comprovado: função Nn() em catalog.js (E-029)
}
```

### Relacionamentos
- `Channel` **1 → N** `Source` — 🟢 comprovado (array `sources`).
- `Channel` **N → 1** `Category` — 🟢 comprovado, mas `Category` é apenas uma **string livre** no código observado, não uma entidade separada com ID próprio — modelá-la como entidade é uma **proposta de normalização**, não um fato do sistema original.
- `Channel` **1 → N** `Program` — 🟢 comprovado (grade de EPG por canal).
- `Favorite` (TV e VOD) — 🟢 comprovado como **dois conjuntos separados de IDs** em `localStorage`, não uma tabela relacional com chave estrangeira.

---

## 5. Persistência e cache

| Mecanismo | Uso observado | Quando salva | Quando lê | Finalidade provável | Evidência |
|---|---|---|---|---|---|
| `localStorage` | 19+ chaves (catálogo, favoritos TV/VOD, EPG versionado v3–v6, preferências, telemetria, etc.) | A cada mudança relevante de estado | Na montagem dos componentes/efeitos | Persistir preferências e cache de dados entre sessões, sem precisar de login | E-008, E-017 |
| `sessionStorage` | **Nenhum uso observado** | — | — | — | E-008 |
| `IndexedDB` | **Nenhum uso observado** em nenhum bundle lido | — | — | — | E-028 |
| `Cache Storage` (via Service Worker) | Cache nomeado `saimo-casca-v1`: app shell + assets com hash | Na instalação do SW (pré-cache) + a cada fetch bem-sucedido de asset com hash (runtime cache) | A cada navegação (fallback) e a cada fetch de asset (cache-first) | Permitir abertura instantânea/instalação como PWA, **sem envelhecer dados dinâmicos** (API/catálogo/mídia deliberadamente fora do cache) | E-027 |
| Cache HTTP do navegador | Padrão do navegador, não customizado pela aplicação além do que os headers do Cloudflare Pages já definem | — | — | Cache de rede padrão (fora do controle direto da aplicação) | Fase 01 (header names) |
| Memória temporária (variáveis JS, não persistida) | Estado do catálogo após parse, resultado de `useMemo`/`useState`, store pub/sub do player | Durante a sessão da aba | Durante a sessão da aba | Evitar reprocessamento a cada render | Fases 02/03 |

### Implicações de desempenho (observável, não medido)
- O padrão "cache local primeiro, rede depois" (Fluxo 1) prioriza **tempo de carregamento percebido** sobre dado sempre atualizado — escolha de performance deliberada.
- A exclusão explícita de `/api/*` do cache do Service Worker (E-027) prioriza **correção dos dados** (nunca mostrar lista de canais/fontes obsoleta) sobre desempenho offline para essas rotas — um trade-off consciente e bem documentado pelo próprio autor no código.
- Nenhuma estratégia de paginação/streaming de dados foi observada — o catálogo inteiro é carregado de uma vez, o que é aceitável para ~334 itens de texto simples, mas não escalaria indefinidamente sem mudança de abordagem.

---

## 6. Investigação de backend e serviços

**Importante, conforme instruído:** o uso de Cloudflare Pages para o frontend **não comprova** qual tecnologia roda por trás de cada serviço externo. O que segue é estritamente o que foi observado, sem inferir linguagem/framework/banco de dados do lado servidor desses serviços (exceto o que o próprio Cloudflare Pages/Workers implica estruturalmente, por serem plataformas conhecidas).

| Serviço | Tipo observável | Responsabilidade aparente | Evidência |
|---|---|---|---|
| `saimo-tv.pages.dev/api/proxy` | Cloudflare Pages Function | Proxy CORS para EPG (`guiadetv.com`) e para fontes de mídia inseguras/especiais | E-005, E-019 |
| `saimo-tv.pages.dev/api/events` | Cloudflare Pages Function | Dado de eventos esportivos (papel exato não confirmado — combinado com ESPN e o Worker) | E-032 |
| `saimo-monitor.gabrielsaimo68.workers.dev` | Cloudflare Worker (independente do Pages) | Múltiplas responsabilidades: `/v1/hello` (POST, provável telemetria/heartbeat), `/v1/fontes` (status de servidores de stream), `/v1/eventos` (dado de eventos) | E-006, E-032, E-033 |
| GitHub (`raw.githubusercontent.com`) | CDN de arquivos estáticos de um repositório público | Fonte de verdade para o catálogo (texto) e EPG PlutoTV | E-004, E-005 |
| TMDB | API pública de terceiros | Metadados de VOD | E-029 |
| ESPN | API pública de terceiros | Dados de eventos esportivos | E-030 |
| Stremio/OpenSubtitles | Serviço comunitário público | Legendas de VOD | E-031 |
| `iptv-epg.org`, `open-epg.com` | Serviços públicos de terceiros | Fontes adicionais de EPG (XMLTV) | E-005 |

**O que não é afirmado:** nenhuma linguagem de programação, framework de backend, ou banco de dados por trás de `saimo-monitor...workers.dev` foi identificado — Cloudflare Workers executa JavaScript/TypeScript (ou WASM) por design da plataforma, mas isso não implica nada sobre como os dados de `/v1/fontes`/`/v1/eventos` são armazenados ali dentro (poderia ser Cloudflare KV, Durable Objects, D1, ou uma chamada a outro serviço externo — **não investigado, sem evidência**).

---

## 7. Arquitetura e infraestrutura

### Diagrama A — Arquitetura observada
[`diagrams/04-architecture-observed.mmd`](./diagrams/04-architecture-observed.mmd) — contém **somente** componentes sustentados por evidência das quatro fases.

### Diagrama B — Arquitetura proposta (educacional, independente)
[`diagrams/04-architecture-proposed.mmd`](./diagrams/04-architecture-proposed.mmd) — **não é, em nenhuma hipótese, a arquitetura original do Saimo TV.** É uma proposta própria, detalhada na Seção 8 abaixo.

### Possíveis limites de infraestrutura (observáveis/inferidos)
- 🟡 Cloudflare Pages Functions têm limites de tempo de execução e CPU por invocação (documentação pública da Cloudflare) — relevante para `/api/proxy`, que faz uma requisição de rede de saída antes de responder.
- 🟡 `raw.githubusercontent.com` tem limites de taxa (rate limiting) documentados publicamente pela GitHub — usar isso como "banco de dados" de catálogo é viável para baixo volume de leitura, mas teria limites em escala.
- 🔴 Não há evidência sobre limites específicos do Worker `saimo-monitor` (plano gratuito vs. pago da Cloudflare, por exemplo) — pura especulação, não registrada como fato.

---

## 8. Projeto de uma API educacional

> Proposta própria, baseada nos **requisitos funcionais confirmados** (catálogo de canais com múltiplas fontes, categorias, EPG, favoritos separados por TV/VOD, eventos esportivos, legendas). Não é uma implementação — apenas um design de referência.

### 8.1 Responsabilidades dos módulos (NestJS)

- **`CatalogModule`** — CRUD de canais e suas fontes; endpoint de listagem com filtro por categoria/busca.
- **`EpgModule`** — ingestão periódica (job agendado) de fontes de EPG autorizadas, normalização, exposição de "grade" por canal e "agora tocando" (cache em Redis, com TTL curto).
- **`FavoritesModule`** — favoritos por usuário (requer `AuthModule`), separados por tipo de conteúdo (TV/VOD), espelhando o padrão observado no Saimo TV.
- **`EventsModule`** — agregação de eventos esportivos de uma fonte autorizada (análoga à ESPN), com cache curto.
- **`AuthModule`** (opcional) — necessário apenas se quisermos favoritos/preferências por conta, em vez de por dispositivo (como o Saimo TV faz via `localStorage`).

### 8.2 Estrutura conceitual dos dados (Prisma schema, esboço)

```prisma
model Channel {
  id         String   @id @default(cuid())
  name       String
  logoUrl    String?
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id])
  sources    Source[]
  number     Int
}

model Source {
  id        String  @id @default(cuid())
  channelId String
  channel   Channel @relation(fields: [channelId], references: [id])
  url       String
  quality   String?
  priority  Int      @default(0) // ordem de fallback
}

model Category {
  id    String @id @default(cuid())
  name  String @unique
  order Int    @default(0)
}

model Program {
  id          String   @id @default(cuid())
  channelId   String
  title       String
  startTime   DateTime
  endTime     DateTime
  description String?
}

model Favorite {
  id        String @id @default(cuid())
  userId    String
  channelId String?
  mediaId   String?
  kind      FavoriteKind // TV | VOD
}

enum FavoriteKind {
  TV
  VOD
}
```

### 8.3 Contratos de API propostos (exemplos)

```
GET  /v1/channels?category=esportes&search=espn
GET  /v1/channels/:id
GET  /v1/channels/:id/epg?from=2026-10-19T00:00:00Z&to=2026-10-20T00:00:00Z
GET  /v1/categories
POST /v1/favorites            { kind: "TV" | "VOD", channelId?, mediaId? }
DELETE /v1/favorites/:id
GET  /v1/events?sport=soccer
```

### 8.4 Estratégias de cache
- **EPG e eventos:** Redis com TTL curto (ex.: 2-5 min) — dados mudam com frequência moderada, mas não precisam ser em tempo real estrito.
- **Catálogo/categorias:** cache de aplicação com invalidação manual/por webhook ao atualizar o catálogo (análogo ao `?t=` cache-busting observado no Saimo TV, mas feito de forma mais controlada).
- **HTTP cache-control:** `Cache-Control: public, max-age=60` em listagens, `no-store` em endpoints de favoritos (dado por usuário).

### 8.5 Validação
- DTOs com `class-validator` (`@IsUrl()`, `@IsEnum()` para categoria, etc.) em todos os endpoints de escrita.
- Validação de que `Source.url` aponta para um domínio permitido (allowlist), aprendendo com a observação de E-034 sobre a heterogeneidade/risco de agregar fontes arbitrárias.

### 8.6 Tratamento de erros
- Formato de erro consistente (`{ statusCode, message, error }`, padrão NestJS).
- Fallback entre fontes no nível de **dados** (como o Saimo TV faz no player, Fase 03) pode ser espelhado no backend: se uma fonte de EPG falhar, seguir com as demais, sem derrubar a resposta inteira.

### 8.7 Observabilidade
- Logs estruturados (ex.: `pino`) com correlação por request-id.
- Métricas de taxa de erro/latência por módulo (ex.: Prometheus + Grafana, ou CloudWatch se em AWS).
- Alertas para falhas sistemáticas de uma fonte de EPG/eventos (análogo ao que o `saimo-monitor` parece fazer para fontes de stream, E-006).

### 8.8 Considerações de segurança
- **Nunca** incorporar chaves de API de terceiros diretamente no bundle do frontend (ao contrário do que foi observado em E-029) — usar um endpoint próprio de backend como intermediário (BFF) para chamadas que exigem chave secreta.
- Validar e restringir o endpoint de proxy (se houver um) a uma allowlist de domínios — relevante à luz da Q-003 (não resolvida sobre o Saimo TV, mas uma boa prática a aplicar na proposta própria).
- Rate limiting por IP/usuário em endpoints públicos.

---

## 9. Comparação de alternativas

| Critério | A — Frontend estático (React+TS+dados locais) | B — Frontend+Backend (React+NestJS+PostgreSQL) | C — Serverless (estático + funções + banco gerenciado) |
|---|---|---|---|
| **Complexidade** | Baixa | Alta | Média |
| **Custo operacional relativo** | Muito baixo (hospedagem estática) | Médio-alto (servidor sempre ativo) | Baixo-médio (paga por uso) |
| **Escalabilidade** | Limitada (sem estado dinâmico real) | Boa, mas exige gestão de infraestrutura | Boa, escala automaticamente |
| **Manutenção** | Simples | Mais complexa (deploy de API, migrações de banco) | Moderada (funções pequenas, mas múltiplos serviços gerenciados) |
| **Desempenho** | Ótimo para o shell (CDN); dados dependem de onde vêm | Bom, mas latência de ida-e-volta ao servidor sempre presente | Boa (edge functions), com cold-start ocasional |
| **Segurança** | Superfície pequena (sem backend próprio para atacar) | Superfície maior, mas controle total | Superfície pequena por função, mas múltiplos pontos de configuração |
| **Facilidade de aprendizado** | Alta (poucas peças móveis) | Média (exige entender ORM, módulos, migrations) | Média-alta (exige entender o modelo serverless específico do provedor) |

### Recomendação

Para o **escopo observado no Saimo TV** (agregação de dados majoritariamente públicos, poucas escritas por usuário — apenas favoritos/preferências, sem necessidade de transações complexas) — e é notável que **o próprio Saimo TV já adota, na prática, algo muito próximo da Alternativa C** (Cloudflare Pages + Pages Functions + um Worker separado) — a **Alternativa C (serverless)** é a mais adequada: equilibra baixo custo operacional com capacidade de ter alguma lógica de servidor (proxy, agregação, validação) sem a complexidade operacional de manter um servidor NestJS sempre ativo. A Alternativa B só se justificaria se o projeto educacional quisesse **praticar especificamente** modelagem relacional com Prisma/PostgreSQL e um backend robusto (um objetivo de aprendizado legítimo, mas diferente do que o sistema observado exige).

---

## 10. Ensino e aprendizado

Os conceitos mais relevantes desta fase já foram tratados ao longo do documento com evidência, explicação e exemplo. Dois destaques adicionais:

### App Shell + runtime caching diferenciado (origem: E-027)
**O que descobrimos?** O Service Worker do Saimo TV cacheia o "shell" do app de um jeito, e deliberadamente **não** cacheia dados dinâmicos. **Como descobrimos?** Lendo o arquivo público `sw.js` (não minificado). **Como funciona?** Ver Seção 5 desta página e [`learning.md`](./learning.md). **Qual sua importância?** É um padrão de PWA maduro e amplamente recomendado (ex. pelo Workbox do Google), aplicado aqui à mão, sem biblioteca. **Como implementaríamos?**
```typescript
// Pseudocódigo: estratégia diferenciada por tipo de recurso
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.startsWith('/api/')) return; // nunca interceptar API
  if (temHashNoNome(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
  } else if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstComFallback(event.request));
  }
});
```
**Como validar?** Nas DevTools → Application → Service Workers, force "offline" e recarregue — o shell deve continuar abrindo, mas uma chamada a `/api/*` deve falhar (não deve haver uma versão "velha" mascarando a falha).
**Exercício:** implemente as funções `cacheFirst`/`networkFirstComFallback` do zero.

### Backend "distribuído" entre múltiplas peças pequenas (origem: E-032)
**O que descobrimos?** O que parecia um único "Worker de monitoramento" (E-006) na verdade atende múltiplas responsabilidades (`/v1/hello`, `/v1/fontes`, `/v1/eventos`), e o Pages Function `/api/proxy` ganhou uma irmã, `/api/events`. **Qual sua importância?** Ilustra como sistemas pequenos "serverless" tendem a crescer organicamente adicionando rotas a uma função/worker existente, em vez de criar um novo serviço para cada responsabilidade — uma escolha pragmática, mas que pode dificultar observabilidade/manutenção conforme cresce (ponto de atenção arquitetural, não uma crítica ao Saimo TV especificamente). **Exercício:** desenhe, em texto, em que ponto você separaria `saimo-monitor` em dois Workers distintos (monitoramento de fontes vs. dados de eventos) — e por quê.

---

## 11. Registro de evidências

Ver `findings.md`, entradas **E-027 a E-034**. Nenhuma credencial foi registrada em texto (a chave de API do TMDB encontrada em E-029 foi deliberadamente omitida). Nenhum domínio de origem de stream individual foi listado (E-034, por princípio).

---

## 12. O que permanece desconhecido

- Corpo de resposta de `/v1/fontes`, `/v1/eventos`, `/api/events` (apenas a existência dos endpoints foi confirmada).
- Linguagem/framework/banco de dados por trás do Worker `saimo-monitor` e das Pages Functions (fora do que a própria plataforma Cloudflare implica).
- Conteúdo real e schema completo de `canais.txt`/`catalogo.txt`/arquivos em `/vod/` (ainda não lidos).
- Comportamento visual real da aba "Eventos" (não visitada).
- Se existe alguma forma de autenticação/conta de usuário no Saimo TV (tudo observado até agora sugere que não — favoritos/preferências são por dispositivo via `localStorage`).
