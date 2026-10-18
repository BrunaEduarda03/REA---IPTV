# Fase 02 — Engenharia Reversa do JavaScript

**Data:** 2026-10-19
**Alvo:** https://saimo-tv.pages.dev/tv
**Pré-requisito lido:** `docs/reverse-engineering/findings.md` (E-001 a E-017), `architecture.md`, `questions.md`, `progress.md`

Este documento é o entregável principal da Fase 02. Ele referencia evidências detalhadas em `findings.md` (entradas E-011 a E-017 foram adicionadas nesta fase) e não repete achados da Fase 01 já encerrados — apenas os retoma quando necessário para contexto.

---

## 0. Recuperação de contexto (recapitulação da Fase 01)

Antes de iniciar, os seguintes fatos já estavam comprovados (ver `findings.md`, E-001 a E-010):

- Hospedagem em **Cloudflare Pages**, com um **Cloudflare Worker** separado (`saimo-monitor...workers.dev`) para monitorar fontes de stream.
- Frontend em **React** com **React Router**, buildado com **Vite + Rolldown**, com code-splitting por rota/feature.
- Catálogo de 334 canais vindo de arquivos de texto em um repositório GitHub público.
- EPG agregado de 4 fontes externas, processado em um **Web Worker** dedicado.
- Player com **hls.js 1.7.3** e **mpegts.js** embutidos, mais Google Cast SDK.
- Persistência exclusiva em `localStorage` (sem cookies) — 3 chaves conhecidas.
- Aplicação é uma **PWA** instalável.

Hipóteses pendentes relevantes para esta fase (de `questions.md`): formato exato do catálogo (Q-001, **não resolvido nesta fase** — fora do escopo de "JavaScript", é dado de conteúdo), lógica de seleção de player (Q-002, parcialmente tocado), conteúdo das demais abas (Q-004, parcialmente resolvido via mapeamento de chunks).

O MCP REA foi validado na Fase 01 e permanece disponível nesta sessão. Nesta fase, a investigação foi conduzida majoritariamente por **leitura estática direta dos bundles JS públicos já baixados** em `research/artifacts/scripts/` (ferramenta: `grep`/Python sobre arquivos locais), por ser mais precisa para análise de código-fonte do que captura dinâmica de rede. Novas evidências de rede (verificação de `.js.map`) foram obtidas com `curl`.

---

## 1. Mapeamento dos arquivos JavaScript

> Os nomes de arquivo abaixo incluem hashes de conteúdo gerados pelo bundler (Vite/Rolldown); eles mudam a cada build. Os nomes aqui refletem o snapshot capturado em 2026-10-18/19. **Importante:** por não haver source maps públicos (E-012), os nomes de função/variável discutidos abaixo (ex.: `M`, `C`, `Zm`) são identificadores **minificados** — não correspondem aos nomes originais usados pelos desenvolvedores. Toda nomenclatura "amigável" usada neste documento é uma **inferência nossa** baseada em comportamento observado, não um fato extraído do código-fonte original.

| Arquivo | Responsabilidade observada | Funções/elementos notáveis | Dependências | Evidência |
|---|---|---|---|---|
| `rolldown-runtime-*.js` (716 B) | Runtime de interoperabilidade de módulos gerado pelo bundler Rolldown (helpers CJS/ESM) | `__commonJS`-like, `__toESM`-like, lazy-export-getter | nenhuma | E-002, E-011 |
| `vendor-C784v2VA.js` (3,5 KB) | Pacote `scheduler` do React (agendamento cooperativo de trabalho) | `unstable_scheduleCallback`, `unstable_now`, min-heap | rolldown-runtime | E-011 |
| `catalog-Y4ECXKT4.js` (100 KB) | **Núcleo do React 19.3.0** embutido + `react-router-dom` + lógica própria: catálogo, favoritos (TV e VOD), monitor de fontes, normalização de nomes | `createContext`/`useContext` (globais), `useReducer`, funções de favoritos (`vr`, etc.) | rolldown-runtime, scheduler | E-002, E-011, E-014 |
| `vendor-react-DYlNHYxM.js` (203 KB) | **ReactDOM 19.3.0** + `react/jsx-runtime` | `createRoot` | rolldown-runtime, catalog (React), vendor-C784v2VA | E-011 |
| `index-B8gNV0IZ.js` (61 KB) | Entry point: polyfill de modulepreload, **animação de abertura (splash)** com SVG, bootstrap da árvore React | `__vite__mapDeps`, componente de animação `Y()`, funções de easing (`G`,`K`,`q`,`ve`) | catalog, vendor-react, player | Seção 2, 6 |
| `tv-C6ATJaLp.js` (12 KB) | Componente **ProgramGuide** (grade de EPG em modal), com virtualização manual | `M()` (janela virtualizada), `C()` (layout responsivo), `O()` (data relativa), `P()` (iniciais) | catalog, player | Seção 3, 5, 6 |
| `PainelDeCanais-BclGcD97.js` (8,8 KB) | Painel lateral de canais: busca, categorias (pílulas), favoritos, menu de contexto, seletor de "Tela 1/Tela 2" | componentes `c` (ícone), `l` (linha), `u` (painel) | catalog, player | Seção 4, 5 |
| `player-DGAgJsZy.js` (1,5 MB) | Player de vídeo: `hls.js` 1.7.3, `mpegts.js`, Google Cast SDK, store de "programa atual" (pub/sub), lista canônica de categorias, canais de fallback embutidos, instanciação do `epgWorker` | `Um()` (subscribe), `Zm()` (now-playing getter), `qm()` (init assíncrono do worker de EPG) | catalog | E-007, E-014, E-016 |
| `epgWorker-DvROaIIK.js` (15 KB) | Web Worker: normalização de nomes de canal e merge de 4 fontes de EPG | função de normalização, mapas de alias/código | nenhuma (roda isolado) | E-005 |
| `StreamTester-*.js` / `.css` | Tela de teste de fontes/streams (não lida nesta fase) | — | — | E-013 |
| `AppDownload-*.js` / `.css` | Tela "Baixar app" (não lida nesta fase) | — | — | E-013 |
| `Novidades-*.js` / `.css` | Tela de novidades/changelog (não lida nesta fase) | — | — | E-013 |

### Imports e exports

Todos os chunks de feature usam **exports nomeados com identificadores de 1 a 2 caracteres** (`A`, `C`, `_`, `y`, etc.) — típico de minificação agressiva orientada a tamanho de bundle. Cada chunk importa de outros via caminho relativo explícito (`import{...}from"./catalog-Y4ECXKT4.js"`), sem dynamic `import()` visível dentro dos próprios chunks de feature — o lazy-loading acontece no nível do roteador (ver Seção 2), não dentro dos componentes.

### Código próprio vs. dependências de terceiros

| Terceiro (não modificado, apenas empacotado) | Código próprio da aplicação |
|---|---|
| React 19.3.0, ReactDOM 19.3.0 (`catalog.js`, `vendor-react.js`) | Lógica de catálogo, favoritos, monitor de fontes (`catalog.js`) |
| `scheduler` (`vendor-C784v2VA.js`) | Componentes de UI: `ProgramGuide`, `PainelDeCanais`, animação de abertura |
| `react-router-dom` (dentro de `catalog.js`) | Virtualização manual da grade de EPG (`M`, `j` em `tv.js`) |
| `hls.js` 1.7.3, `mpegts.js` (dentro de `player.js`) | Store pub/sub de "programa atual" (`Um`/`Zm` em `player.js`) |
| Google Cast SDK (carregado externamente, não embutido) | `epgWorker.js` (normalização e merge de fontes de EPG) |

### Lazy loading e code-splitting

Confirmado por dois mecanismos observados:
1. O array `__vite__mapDeps` em `index.js` lista **todos** os chunks que podem ser carregados sob demanda, incluindo pares JS+CSS — típico da função de pré-carregamento de dependências transitivas do Vite para `import()` dinâmico.
2. `<link rel="modulepreload">` no HTML (visto na Fase 01) para os chunks carregados logo no início (`catalog`, `vendor`, `vendor-react`, `player`), e chunks adicionais (`PainelDeCanais`, `tv`) injetados dinamicamente depois — consistente com a rota `/tv` sendo resolvida após o carregamento inicial do "shell" do app.

### Source maps

**Não disponíveis publicamente** (E-012): todas as URLs `*.js.map` testadas retornam o HTML de fallback da SPA (HTTP 200, `Content-Type: text/html`), não um JSON de source map real.

---

## 2. Fluxo de inicialização

Diagrama: [`diagrams/02-init-flow.mmd`](./diagrams/02-init-flow.mmd)

1. **Carregamento do HTML** — 🟢 observado diretamente (Fase 01): `GET /tv` retorna o documento com `<script type="module" src="/assets/index-*.js">` e múltiplos `<link rel="modulepreload">`.
2. **Carregamento dos scripts** — 🟢 observado: `index.js` é o primeiro módulo executado; ele importa `catalog.js` (React), `vendor-react.js` (ReactDOM) e `player.js` antecipadamente (via `modulepreload`, não lazy).
3. **Inicialização do framework** — 🟢 observado: chamada a `createRoot` encontrada em `index.js` (API do React 18+/19 para montar a árvore).
4. **Montagem dos componentes** — 🟡 inferido: a sequência exata entre `createRoot(...).render(...)` e a resolução de rota pelo React Router não foi instrumentada em runtime (exigiria breakpoints/depuração ao vivo, fora do escopo desta fase de leitura estática).
5. **Inicialização do estado** — 🟢 observado: `catalog.js` contém a lógica de leitura do cache local (`saimo-catalogo-v2`) e funções de parse do catálogo.
6. **Primeiras requisições observáveis** — 🟢 observado na Fase 01 (captura de rede): fetch de `canais.txt`/`catalogo.txt` do GitHub, chamadas a `/v1/fontes`/`/v1/hello` do Worker de monitoramento, e instanciação do `epgWorker` que por sua vez busca as 4 fontes de EPG.
7. **Renderização da interface** — 🟢 observado (screenshot da Fase 01): layout final com barra superior, painel de canais e placeholder "Selecione um canal".

### Elemento adicional descoberto nesta fase: animação de abertura

`index.js` contém uma função `Y()` que desenha, via Canvas 2D + SVG, uma **animação de abertura customizada** (sprites em `/abertura/*.webp`, path-drawing via `stroke-dasharray`/`getTotalLength()`, múltiplas funções de easing — cúbica, elástica, "back"). Isso não havia sido observado no screenshot estático da Fase 01 (capturado após o assentamento de 3s, já com a animação concluída). 🟢 Observado diretamente no código; 🟡 o momento exato em que ela roda no fluxo de inicialização (antes ou depois do primeiro render da rota) é inferido pela posição do código no entry point.

---

## 3. Gerenciamento de estado

Evidência consolidada em [E-014](./findings.md#e-014--gerenciamento-de-estado-context--usereducer--stores-manuais-via-pubsub-sem-zustandredux).

A aplicação usa **três camadas distintas de estado**, todas construídas com primitivas do próprio React — **nenhuma biblioteca de state management de terceiros** (Zustand, Redux, Recoil, Jotai) foi encontrada:

### 3.1. Estado local de componente
`useState`/`useRef` puros, usados extensivamente (ex.: texto de busca, categoria ativa, canal selecionado no menu de contexto). Exemplo observado em `PainelDeCanais.js`: `const [v, y] = useState("")` para o texto de busca.

### 3.2. Estado "estrutural" compartilhado — Context + useReducer
`catalog.js` contém 13 ocorrências de `createContext` e 34 de `useContext`, além de 2 usos de `useReducer`. Isso indica múltiplos Contexts especializados (provavelmente um para o catálogo de canais, outro para favoritos, outro para preferências de usuário) em vez de um único Context monolítico — um padrão comum em apps React maduras para evitar re-renders desnecessários (componentes só re-renderizam quando o Context específico que consomem muda).

### 3.3. Dados externos ao ciclo de render — "stores" manuais via pub/sub
Para dados que mudam de forma assíncrona e fora do controle direto do React (o "programa atual" de cada canal, que muda com o tempo real, não com uma ação do usuário), a aplicação **não usa `useSyncExternalStore`** (apesar de o hook existir no React 19 embutido — só aparece na própria definição interna do React, nunca é chamado pela aplicação). Em vez disso, há um padrão manual equivalente, em `player.js`:

```javascript
// Padrão observado (nomes reais minificados: Um = subscribe, Dm = Set de listeners)
function subscribe(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}
```

Consumido em `PainelDeCanais.js` assim:
```javascript
// Padrão observado
const [estado, setEstado] = useState(() => getNowPlaying(canalId));
useEffect(() => {
  const atualizar = () => setEstado(getNowPlaying(canalId));
  atualizar();
  const unsubscribe = subscribe(atualizar);
  return unsubscribe;
}, [canalId]);
```

### 3.4. Persistência em localStorage

Confirmado (E-008, E-017): **apenas `localStorage`**, nunca `sessionStorage` ou cookies. Pelo menos 19 chaves identificadas, cobrindo catálogo, favoritos (TV e VOD separadamente), EPG (com versionamento de schema v3 a v6), preferências de nitidez, lista de domínios sem necessidade de proxy CORS, modo desenvolvedor, canais personalizados, histórico de buscas e "continuar assistindo". Várias chaves têm uma chave-irmã com sufixo `-mudou` (ex.: `saimo-vod-favoritos-mudou`), sugerindo um mecanismo caseiro de sinalização de mudança — possivelmente para sincronizar múltiplas abas via o evento `window.addEventListener('storage', ...)`, mas **isso não foi confirmado por leitura direta do listener correspondente** (🟡 inferência, não fato).

### 3.5. Como reproduzir em React + TypeScript

```typescript
// Context + useReducer para estado estrutural (ex.: favoritos)
type FavoritosAction =
  | { type: "alternar"; canalId: string };

function favoritosReducer(state: Set<string>, action: FavoritosAction): Set<string> {
  switch (action.type) {
    case "alternar": {
      const novo = new Set(state);
      novo.has(action.canalId) ? novo.delete(action.canalId) : novo.add(action.canalId);
      localStorage.setItem("favoritos", JSON.stringify([...novo]));
      return novo;
    }
  }
}

const FavoritosContext = createContext<{
  favoritos: Set<string>;
  dispatch: React.Dispatch<FavoritosAction>;
} | null>(null);

// Store manual pub/sub para dados externos ao React (ex.: "agora tocando")
type Listener = () => void;
const listeners = new Set<Listener>();
let epgAtual = new Map<string, { titulo: string; progresso: number }>();

function subscribeEpg(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function atualizarEpg(canalId: string, dados: { titulo: string; progresso: number }) {
  epgAtual.set(canalId, dados);
  listeners.forEach((cb) => cb());
}

// Uso idiomático recomendado (React 18+): useSyncExternalStore em vez do
// padrão manual useState+useEffect observado no Saimo TV — evita um
// problema sutil de "tearing" em atualizações concorrentes do React.
function useEpgAtual(canalId: string) {
  return useSyncExternalStore(subscribeEpg, () => epgAtual.get(canalId));
}
```

---

## 4. Eventos e interações

Três interações da Fase 01 foram escolhidas por serem centrais ao uso diário da aplicação e por terem código bem localizado nos bundles.

### 4.1. Busca de canal (painel lateral)

Diagrama: [`diagrams/02-interacao-busca.mmd`](./diagrams/02-interacao-busca.mmd)

1. **Evento:** `onChange` no `<input>` de busca (`painel-busca-input`).
2. **Código:** componente `u` (painel) em `PainelDeCanais-BclGcD97.js`.
3. **Funções envolvidas:** `useState` do texto de busca → `useMemo` de filtragem (`A`) → `useMemo` de agrupamento por categoria (`j`).
4. **Mudança de estado:** o texto digitado atualiza um `useState` local; os dois `useMemo` dependentes recalculam automaticamente (React recalcula apenas quando as dependências mudam — aqui, a cada tecla digitada).
5. **Efeito colateral observável:** nenhum efeito colateral externo (sem requisição de rede) — a busca filtra em memória a lista de canais já carregada. Botão "limpar busca" aparece/desaparece conforme o campo está vazio ou não.
6. **Relação com a interface:** a lista de canais exibida (agrupada por categoria, ou seção única se uma pílula específica estiver ativa) é recalculada e a seção re-renderiza.

### 4.2. Favoritar/desfavoritar um canal

Diagrama: [`diagrams/02-interacao-favoritar.mmd`](./diagrams/02-interacao-favoritar.mmd)

1. **Evento:** `onClick` no botão de estrela (`painel-btn-estrela`), com propagação interrompida para não disparar a seleção do canal (o botão fica dentro da linha clicável).
2. **Código:** botão renderizado no componente `l` (linha de canal) de `PainelDeCanais.js`; lógica de persistência confirmada diretamente para VOD em `catalog.js` (função que lê/escreve `saimo-vod-favoritos` com `JSON.parse`/`try-catch`); o equivalente para TV ao vivo (`saimo-tv-favoritos`) segue o mesmo padrão por analogia de nome de chave, mas seu código específico não foi lido linha a linha nesta fase (🟡 inferência por padrão, confiança média).
3. **Funções envolvidas:** handler de toggle → leitura seguro do localStorage → escrita → atualização de estado em memória.
4. **Mudança de estado:** o conjunto de favoritos muda (adiciona ou remove o id do canal); o estado em memória (provavelmente um Context, dado o padrão descrito na Seção 3.2) é atualizado para refletir a nova lista sem precisar reler do `localStorage`.
5. **Efeito colateral observável:** escrita em `localStorage` (persistente entre sessões); possível atualização de uma chave `-mudou` companheira.
6. **Relação com a interface:** o ícone de estrela muda de contorno vazio para preenchido (cor `#facc15`, amarelo-dourado); a pílula "Favoritos" passa a incluir/excluir esse canal da lista filtrada.

### 4.3. Selecionar/trocar de canal

Diagrama: [`diagrams/02-interacao-selecionar-canal.mmd`](./diagrams/02-interacao-selecionar-canal.mmd)

1. **Evento:** `onClick` em uma linha de canal, tanto no painel lateral quanto na grade de EPG (`ProgramGuide`).
2. **Código:** handler `J` em `tv-C6ATJaLp.js` (grade de EPG) — chama `onSelectChannel` e depois `onClose` (fecha o modal da grade); handler equivalente em `PainelDeCanais.js` para seleção direto do painel.
3. **Funções envolvidas:** atualização do "canal ativo" no estado de nível superior (não localizado exatamente onde mora esse estado — provavelmente em um Context de `catalog.js`, por analogia com a Seção 3.2); reação do `player.js` à mudança.
4. **Mudança de estado:** `activeChannelId` muda; isso dispara, em cascata, uma nova assinatura ao store pub/sub de "programa atual" (`Um`/`Zm` em `player.js`) para o canal recém-selecionado.
5. **Efeito colateral observável:** o player carrega um novo stream (não investigado em detalhe — fica para a Fase 03, conforme escopo definido pelo usuário); provável atualização de `tv-last-channel` no `localStorage` (🟡 inferência, não confirmada por leitura do trecho exato).
6. **Relação com a interface:** a linha do canal ativo ganha destaque visual ("no ar"); a área central muda do placeholder "Selecione um canal" para o player de vídeo.

---

## 5. Investigação dos componentes

### Comprovados por leitura direta do código

| Componente (nome inferido) | Arquivo | Responsabilidade | Observações |
|---|---|---|---|
| `ProgramGuide` (modal de grade de EPG) | `tv.js` | Orquestra toda a grade: estado de busca, janela virtualizada, scroll, seleção | Maior componente lido nesta fase; usa `useLayoutEffect` duplo (montagem + mudança de busca) |
| `ChannelRow` (linha de canal na grade) | `tv.js` | Renderiza nome, número, logo (com fallback), indicador "ativo" | `memo`-izado |
| `ProgramRow` (linha de programas de um canal) | `tv.js` | Posiciona blocos de programa por tempo (`left`/`width` em px), barra de progresso "ao vivo" | `memo`-izado; lógica de classes CSS por largura (`estreito`/`mini`/`curto`) |
| `ProgramDetail` (modal de detalhes do programa) | `tv.js` | Sinopse, horário, categoria, botão "Assistir" | Foca automaticamente o botão "Assistir" ao abrir (acessibilidade) |
| `ChannelIconTile` (ícone de canal) | `tv.js` (`F`) e `PainelDeCanais.js` (`c`) | Logo com fallback de iniciais | **Implementado de forma independente em dois arquivos** — ver Seção 7 |
| `ChannelPanel` (painel lateral) | `PainelDeCanais.js` | Busca, pílulas de categoria, lista agrupada, menu de contexto, seletor "Tela 1/Tela 2" | Suporta um modo "multi-tela" não documentado na Fase 01 |
| `PanelChannelRow` (linha no painel) | `PainelDeCanais.js` | Nome, número, "agora tocando" com barra de progresso, botão de favorito | Assina o store pub/sub de EPG por canal individualmente |

### Composição e comunicação

- `ProgramGuide` e `ChannelPanel` **não se importam um ao outro** — ambos importam de `catalog.js` (dados/React) e `player.js` (categorias, store de EPG "agora"). A comunicação entre eles acontece através do componente pai que os renderiza (não identificado/lido nesta fase) via props (`onSelectChannel`, `currentChannel`, etc.).
- Propriedades (props) identificadas no `ChannelPanel`: `channels`, `activeChannelId`, `favorites`, `isOpen`, `onClose`, `onSelectChannel`, `onToggleFavorite`, `onSelectVariant`, `onOpenOtherScreen`, `isMultiScreen`, `isMobileInline`, `activeSide`, `onSelectSide`, `hasSecondChannel` — o volume de props relacionadas a "multi-tela" sugere uma funcionalidade de **duas telas/PIP (picture-in-picture) simultâneas** não observada na interface da Fase 01.

### Renderização condicional e listas dinâmicas

- `ChannelPanel` retorna `null` se não estiver aberto nem em modo "inline mobile" — renderização condicional simples no nível do componente.
- Listas dinâmicas usam `key` baseada no id do canal/programa (visto em `.map(e => ...{}, e.id)` / `a.id`) — prática correta do React para listas que mudam.
- A grade de EPG usa **virtualização manual** (não `.map()` sobre toda a lista) — só renderiza o subconjunto de linhas/colunas visível na viewport, recalculado via `IntersectionObserver`-like (na verdade `ResizeObserver` + handler de `scroll`), descrito em detalhe na Seção 6.

### Hipóteses arquiteturais (não comprovadas)

- 🔴 É provável que exista um componente de nível superior (ex.: `TvPage` ou similar) que orquestra `ChannelPanel`, `ProgramGuide` e o player, mas esse componente específico não foi localizado/lido nesta fase (estaria em `tv.js`, mas a leitura desta fase não cobriu 100% do arquivo).
- 🔴 É provável que exista um Context dedicado por domínio (ex.: `CatalogContext`, `FavoritesContext`, `MonitorContext`) dado o número de `createContext` em `catalog.js`, mas os nomes e fronteiras exatas desses Contexts não foram confirmados.

---

## 6. Análise de funções importantes

### 6.1. `M(scrollState, layout, totalLinhas)` — cálculo de janela virtualizada (tv.js)

- **O que faz:** calcula quais linhas (canais) e quais colunas (blocos de 60 min) estão visíveis na viewport de um contêiner com scroll, adicionando um "buffer" de linhas extras acima/abaixo para suavizar o scroll.
- **Parâmetros:** um objeto com `scrollTop`, `scrollLeft`, `clientHeight`, `clientWidth` (do elemento de scroll); o objeto de layout (`linha`, `canal`, `ppm` — pixels por minuto); o total de linhas disponíveis.
- **Retorna:** `{ r0, r1, m0, m1 }` — índice de linha inicial/final e minuto inicial/final visíveis (arredondados para múltiplos de um "passo" para reduzir recomputações).
- **Outras funções usadas:** nenhuma externa — é uma função pura de matemática.
- **Como foi identificada:** leitura direta de `tv-C6ATJaLp.js`, nome original desconhecido (identificador minificado `M`), comportamento inferido pela matemática (divisão por altura de linha/largura de coluna, arredondamento por múltiplos).
- **Papel na aplicação:** é o coração da performance da grade de EPG — sem ela, renderizar 334 canais × 25 horas de programação de uma vez seria proibitivamente lento.

**Pseudocódigo original (educacional, não copiado):**
```typescript
interface JanelaVisivel { r0: number; r1: number; m0: number; m1: number; }

function calcularJanelaVisivel(
  scroll: { top: number; left: number; alturaVisivel: number; larguraVisivel: number },
  layout: { alturaLinha: number; larguraColunaCanal: number; pixelsPorMinuto: number },
  totalLinhas: number,
  bufferLinhas = 4,
  passoMinutos = 60,
): JanelaVisivel {
  const primeiraLinha = Math.floor(scroll.top / layout.alturaLinha);
  const ultimaLinha = Math.ceil((scroll.top + scroll.alturaVisivel) / layout.alturaLinha);
  const r0 = Math.max(0, Math.floor(primeiraLinha / bufferLinhas) * bufferLinhas - bufferLinhas);
  const r1 = Math.min(totalLinhas, Math.ceil(ultimaLinha / bufferLinhas) * bufferLinhas + bufferLinhas);

  const minutoInicial = scroll.left / layout.pixelsPorMinuto;
  const minutoFinal = (scroll.left + scroll.larguraVisivel - layout.larguraColunaCanal) / layout.pixelsPorMinuto;
  const m0 = Math.max(0, Math.floor(minutoInicial / passoMinutos) * passoMinutos - passoMinutos);
  const m1 = Math.ceil(minutoFinal / passoMinutos) * passoMinutos + passoMinutos;

  return { r0, r1, m0, m1 };
}
```

### 6.2. `C()` — seleção de layout responsivo (tv.js)

- **O que faz:** retorna um objeto de medidas (largura da coluna de canal, altura de linha, altura da régua de tempo, pixels por minuto) diferente conforme a largura da janela.
- **Parâmetros:** nenhum (lê `window.innerWidth` diretamente).
- **Retorna:** um de dois objetos de layout pré-definidos (desktop ou um menor para `innerWidth <= 640`).
- **Outras funções usadas:** nenhuma.
- **Como foi identificada:** leitura direta; chamada tanto na inicialização do estado de layout quanto em um listener de `resize`.
- **Papel na aplicação:** adapta a densidade da grade de EPG para telas pequenas sem precisar de media queries CSS (a lógica de pixels é usada em cálculos JS de posicionamento, não apenas CSS).

### 6.3. `O(dataAlvo, agora)` — formatação de data relativa (tv.js)

- **O que faz:** retorna "Hoje", "Amanhã", "Ontem" ou o nome abreviado do dia da semana + data, conforme a diferença de dias entre a data alvo e "agora".
- **Parâmetros:** dois timestamps (ou `Date`s).
- **Retorna:** `string`.
- **Outras funções usadas:** uma função auxiliar que zera horas/minutos/segundos (`D`, não detalhada aqui) para comparar apenas o dia civil, e instâncias de `Intl.DateTimeFormat('pt-BR', ...)` para o fallback.
- **Como foi identificada:** leitura direta; usada no modal de detalhes do programa.
- **Papel na aplicação:** melhora a legibilidade de datas na interface, com localização em português brasileiro nativa do navegador (`Intl`), sem biblioteca de datas externa (ex.: não há `date-fns`/`dayjs`/`moment` nos bundles lidos).

### 6.4. Padrão "avatar de iniciais com cache de falha" (tv.js `F`/`P`, PainelDeCanais.js `c`)

- **O que faz:** gera as iniciais do nome do canal (até 2 letras, maiúsculas) como alternativa visual quando o logo não existe ou falha ao carregar; em um dos dois locais, mantém um cache em memória (`Set`) de URLs que já falharam, para nunca mais tentar recarregá-las.
- **Parâmetros:** o objeto do canal (nome, logo).
- **Retorna:** um elemento `<img>` (sucesso) ou `<span>` com iniciais (fallback).
- **Outras funções usadas:** `onError` do próprio `<img>` dispara a mudança de estado para o modo fallback.
- **Como foi identificada:** leitura direta, comparando as duas implementações (quase idênticas, porém não compartilhadas).
- **Papel na aplicação:** evita "ícones quebrados" na interface, dado que os logos vêm de dezenas de hosts de terceiros heterogêneos (E-010) — um problema real e antecipado pelos desenvolvedores.

### 6.5. `Zm(canal)` — cálculo do "programa atual" de um canal (player.js)

- **O que faz:** dado um canal, busca sua lista de programas (já carregada/normalizada pelo EPG), localiza o programa que está no ar "agora" (busca binária sobre a lista ordenada por horário), e calcula a porcentagem de progresso decorrida dentro desse programa.
- **Parâmetros:** identificador/objeto do canal.
- **Retorna:** `{ current, next, progress } | null`.
- **Outras funções usadas:** uma função de normalização de nome de canal (compartilhada conceitualmente com a normalização vista no `epgWorker.js` da Fase 01) e uma função de busca binária sobre a lista de programas por horário.
- **Como foi identificada:** leitura direta de `player-DGAgJsZy.js`, localizada a partir do nome de export minificado referenciado por `PainelDeCanais.js` (`h as a`).
- **Papel na aplicação:** alimenta tanto a barra de progresso "agora tocando" no painel de canais quanto, presumivelmente, informações exibidas no próprio player.

**Pseudocódigo original (educacional) para o padrão busca binária + progresso:**
```typescript
interface Programa { tituloInicio: number; tituloFim: number; titulo: string; }

function buscarIndiceAtual(programas: Programa[], agora: number): number {
  let inicio = 0, fim = programas.length;
  while (inicio < fim) {
    const meio = (inicio + fim) >> 1;
    if (programas[meio].tituloFim <= agora) inicio = meio + 1;
    else fim = meio;
  }
  return inicio;
}

function programaAtual(programas: Programa[], agora = Date.now()) {
  const i = buscarIndiceAtual(programas, agora);
  const atual = programas[i];
  if (!atual || atual.tituloInicio > agora) return null;
  const duracao = atual.tituloFim - atual.tituloInicio;
  const decorrido = agora - atual.tituloInicio;
  return { atual, proximo: programas[i + 1] ?? null, progresso: Math.min(100, (decorrido / duracao) * 100) };
}
```

---

## 7. Qualidade e arquitetura (apenas o observável)

- **Separação de responsabilidades:** boa, no nível de chunk — cada arquivo tem um escopo claro (catálogo/estado, player/streaming, grade de EPG, painel de canais, worker de EPG). 🟢 Observado pela própria divisão de arquivos.
- **Acoplamento entre módulos:** `catalog.js` concentra o núcleo do React e boa parte do estado — é, na prática, um **hub central** do qual quase todos os outros chunks dependem (ver [`02-module-graph.mmd`](./diagrams/02-module-graph.mmd)). Isso é eficiente para evitar duplicar React em cada chunk, mas cria um acoplamento forte: qualquer mudança em `catalog.js` potencialmente invalida o cache de todos os outros chunks que o importam.
- **Reutilização de lógica:** parcialmente observada. A lógica de "avatar de iniciais com fallback" (Seção 6.4) foi implementada de forma independente em dois arquivos (`tv.js` e `PainelDeCanais.js`) em vez de um componente compartilhado — um ponto concreto de duplicação observável. Por outro lado, a lista canônica de categorias (`Kp` em `player.js`) é corretamente centralizada e reaproveitada tanto para a ordenação das pílulas quanto para a ordenação da lista de canais.
- **Tratamento de erros:** o padrão de leitura de `localStorage` observado em `catalog.js` usa `try/catch` ao redor do `JSON.parse` — proteção defensiva razoável contra dados corrompidos. O fallback de logo quebrado (`onError`) é outro exemplo de tratamento de erro no nível de UI.
- **Performance:** a virtualização manual da grade de EPG, o `memo()` extensivo nos componentes de linha, o cache de URLs de logo quebradas, e o throttling de recálculo de scroll via `requestAnimationFrame` são todas técnicas de performance deliberadas e bem aplicadas. 🟢 Observado diretamente no código.
- **Carregamento assíncrono:** code-splitting por rota (Vite) + Web Worker dedicado para o processamento pesado de EPG (fora da thread principal) + cache local com invalidação por assinatura/timestamp (stale-while-revalidate, visto em `qm()`/`Bm()` de `player.js`) — arquitetura de carregamento madura.
- **Gerenciamento de recursos:** `useEffect`s observados consistentemente retornam funções de limpeza (unsubscribe de listeners, `removeEventListener`, `cancelAnimationFrame`, `clearInterval`) — bom hábito de não vazar memória/listeners.

> Nenhuma recomendação de mudança arquitetural é apresentada aqui como se fosse um fato sobre o código original — as observações acima descrevem apenas o que foi lido, não o que "deveria" ser diferente.

---

## 8. Registro de evidências desta fase

Ver `findings.md`, entradas **E-011 a E-017**, cada uma com ID, arquivo/recurso, ferramenta, procedimento, trecho/referência técnica, conclusão, grau de confiança e limitações. Nenhuma credencial, token de autenticação ou dado pessoal foi registrado. Todos os artefatos públicos usados (bundles JS já baixados) permanecem em `research/artifacts/scripts/` (fora do versionamento Git, conforme `.gitignore`).

---

## 9. Aprendizado obrigatório

Ver `docs/reverse-engineering/learning.md`, seções 7 a 12 (adicionadas nesta fase): virtualização manual de listas, padrão de store externo via pub/sub (e sua relação com `useSyncExternalStore`), Context + useReducer para estado estrutural, busca binária aplicada a dados ordenados por tempo, cache "stale-while-revalidate" feito à mão, e `ResizeObserver`/`requestAnimationFrame` para UI responsiva de alta performance.

---

## 10. O que permanece desconhecido

- Conteúdo e comportamento de `StreamTester`, `AppDownload` e `Novidades` (E-013).
- Nomes originais de variáveis/funções/componentes (sem source maps — E-012).
- Onde exatamente mora o Context/Provider raiz que conecta `ChannelPanel`, `ProgramGuide` e o player.
- Mecanismo exato de escolha entre `hls.js` e `mpegts.js` por canal (fica para a Fase 03).
- Se as chaves `-mudou` do localStorage realmente implementam sincronização entre abas via evento `storage`, ou servem a outro propósito.
- Funcionalidade exata do modo "Tela 1/Tela 2" (multi-tela) descoberto em `PainelDeCanais.js`.
