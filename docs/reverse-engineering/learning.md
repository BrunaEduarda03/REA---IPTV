# Learning — Conceitos Aprendidos

Conceitos técnicos abordados durante a Fase 01, com explicação, exemplo em TypeScript e exercício prático. Cada seção referencia a descoberta (`findings.md`) que motivou o aprendizado.

---

## 1. Code-splitting por rota/feature (origem: E-002)

**Conceito:** em vez de gerar um único arquivo JS gigante, o bundler (Vite/Rolldown) separa o código em "chunks" carregados sob demanda — um por rota ou funcionalidade (`catalog`, `player`, `tv`, `PainelDeCanais`). O nome do arquivo inclui um hash de conteúdo (`catalog-Y4ECXKT4.js`) para permitir cache HTTP agressivo: se o conteúdo não muda, o hash não muda, e o navegador reaproveita o cache.

**Por que importa:** reduz o tempo até a primeira renderização (menos JS para baixar/parsear antes da tela aparecer), e cada chunk pode ser invalidado individualmente em deploys futuros.

**Exemplo educacional (TypeScript, com `import()` dinâmico — a técnica por trás do code-splitting):**

```typescript
// Sem code-splitting: tudo entra no bundle principal.
import { PainelDeCanais } from "./PainelDeCanais";

// Com code-splitting: o chunk só é baixado quando a rota é acessada.
async function carregarPainelDeCanais() {
  const { PainelDeCanais } = await import("./PainelDeCanais");
  return PainelDeCanais;
}
```

**Como verificar:** abra as DevTools (aba Network), filtre por JS, navegue entre as abas da aplicação e observe novos arquivos `.js` sendo baixados somente quando uma seção é acessada pela primeira vez.

**Exercício:** crie um pequeno projeto Vite + React com duas "páginas" (`Home.tsx` e `Sobre.tsx`). Use `React.lazy()` + `import()` dinâmico para carregar `Sobre.tsx` somente ao navegar até ela. Rode `npm run build` e confirme, na pasta `dist/`, que existem dois arquivos JS separados.

---

## 2. Web Workers para processamento fora da thread principal (origem: E-005)

**Conceito:** JavaScript no navegador roda, por padrão, em uma única thread (a mesma que desenha a UI). Um **Web Worker** é um script que roda em uma thread separada, sem acesso direto ao DOM, comunicando-se com a thread principal via `postMessage`. É ideal para trabalho pesado de CPU (parsing de XML, normalização de texto, merge de dados) que, se rodasse na thread principal, travaria a interface.

**Por que importa:** o Saimo TV busca e funde EPG de 4 fontes diferentes (guiadetv.com via proxy, PlutoTV XML, iptv-epg.org, open-epg.com) — processamento de texto/XML potencialmente custoso. Fazer isso em um worker (`epgWorker.js`) mantém a interface responsiva.

**Exemplo educacional:**

```typescript
// epgWorker.ts
self.onmessage = (event: MessageEvent<{ xml: string }>) => {
  const canais = parseXmltv(event.data.xml); // trabalho pesado, fora da thread de UI
  self.postMessage({ canais });
};

// app principal
const worker = new Worker(new URL("./epgWorker.ts", import.meta.url), { type: "module" });
worker.postMessage({ xml: xmlBaixado });
worker.onmessage = (e) => atualizarEstado(e.data.canais);
```

**Como verificar:** nas DevTools, aba "Sources" → seção "Threads" (ou aba "Application" → Service Workers/Workers), o worker ativo aparece listado separadamente da thread principal.

**Exercício:** escreva uma função que soma números de 1 a 100 milhões. Rode-a (a) direto na thread principal, travando a UI por alguns segundos e (b) dentro de um Web Worker, mantendo um botão clicável durante o cálculo.

---

## 3. Proxy server-side para contornar CORS (origem: E-005)

**Conceito:** o navegador bloqueia (por política de **CORS** — Cross-Origin Resource Sharing) que JavaScript de um site (`saimo-tv.pages.dev`) leia diretamente a resposta de outro site (`guiadetv.com`) a menos que esse outro site autorize explicitamente via headers `Access-Control-Allow-Origin`. Quando o site de destino não autoriza, a solução comum é ter um **endpoint próprio no backend** que busca o conteúdo "por trás" (server-to-server, onde CORS não se aplica) e devolve ao navegador como se fosse seu próprio domínio.

**Por que importa:** é exatamente o papel do endpoint `/api/proxy?url=...` observado (E-005) — uma Cloudflare Pages Function que repassa requisições para `guiadetv.com`.

**Exemplo educacional (uma função de borda simplificada, estilo Cloudflare Pages Functions):**

```typescript
// functions/api/proxy.ts
export async function onRequestGet({ request }: { request: Request }) {
  const alvo = new URL(request.url).searchParams.get("url");
  if (!alvo) return new Response("Faltou o parâmetro url", { status: 400 });

  const resposta = await fetch(alvo); // busca server-side, sem restrição de CORS
  return new Response(resposta.body, {
    headers: { "content-type": resposta.headers.get("content-type") ?? "text/html" },
  });
}
```

**Atenção de segurança (ponto de aprendizado, não uma crítica ao Saimo TV):** um proxy "genérico" como esse, se aceitar qualquer `url`, pode ser abusado como *open proxy* (SSRF) se não houver alguma forma de allowlist. Isso é algo interessante para investigar em uma fase futura — **sem tentar explorar isso ativamente**, apenas observar se há validação de domínio no comportamento público.

**Como verificar:** nas DevTools, aba Network, veja que as requisições para `www.guiadetv.com` nunca aparecem diretamente — toda comunicação passa por `saimo-tv.pages.dev/api/proxy`.

**Exercício:** crie uma função serverless (Cloudflare Worker, Vercel Edge Function ou Express) que receba `?url=` e repasse a requisição, adicionando um `allowlist` de domínios permitidos.

---

## 4. Bibliotecas de streaming: hls.js e mpegts.js (origem: E-007)

**Conceito:** o elemento `<video>` HTML nativo só sabe tocar formatos que o navegador suporta nativamente. Para protocolos de streaming ao vivo como **HLS** (`.m3u8`, segmentado) ou **MPEG-TS**, usa-se a API `MediaSource Extensions (MSE)`: uma biblioteca JS baixa os segmentos e os "alimenta" no `<video>` via `MediaSource`, em vez de apontar a `src` diretamente para a URL do stream.

- **hls.js**: implementa o protocolo HLS em JS puro, usado por navegadores que não suportam HLS nativamente (ex.: Chrome, Firefox — só Safari toca HLS nativo).
- **mpegts.js**: implementa reprodução de fluxos MPEG-TS/FLV ao vivo, comum em servidores de IPTV (ex.: baseados em Flussonic, nginx-rtmp).

**Por que importa:** confirma que o catálogo do Saimo TV agrega fontes com protocolos diferentes — por isso o player precisa de duas bibliotecas, escolhendo a certa conforme o tipo de URL do canal.

**Exemplo educacional (simplificado):**

```typescript
import Hls from "hls.js";

function tocarHls(video: HTMLVideoElement, url: string) {
  if (Hls.isSupported()) {
    const hls = new Hls();
    hls.loadSource(url);
    hls.attachMedia(video);
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url; // Safari toca HLS nativamente
  }
}
```

**Como verificar:** nas DevTools, aba Network, filtre por `.m3u8` ou `.ts` enquanto um canal é reproduzido — você verá requisições sucessivas a segmentos de vídeo.

**Exercício:** use `hls.js` para tocar um stream HLS público de teste (ex.: `https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8`) em uma página HTML simples.

---

## 5. PWA: manifest.webmanifest e Service Worker (origem: E-009)

**Conceito:** um **manifest.webmanifest** é um arquivo JSON que descreve metadados de instalação (nome, ícones, cor de tema, modo de exibição) para que o navegador ofereça "Instalar app". Um **Service Worker** é um script que intercepta requisições de rede da página, permitindo cache offline e comportamento de app nativo.

**Por que importa:** explica a aba "Baixar app" vista na interface (E-003) e por que a aplicação tem aparência/comportamento de app mesmo rodando no navegador.

**Como verificar:** nas DevTools, aba "Application" → "Manifest" mostra os metadados parseados; "Service Workers" mostra o worker registrado e seu estado (ativo, instalando, etc.).

**Exercício:** crie um `manifest.webmanifest` mínimo para uma página estática e registre-a com `navigator.serviceWorker.register()`; confirme no Chrome que o ícone "Instalar" aparece na barra de endereço.

---

## 6. Cloudflare Pages vs. Cloudflare Workers (origem: E-001, E-006)

**Conceito:** **Cloudflare Pages** é voltado para sites estáticos com funções serverless acopladas (as "Pages Functions", como o `/api/proxy`) — o deploy acontece junto com o site. **Cloudflare Workers** é um produto separado para rodar scripts de borda independentes, geralmente usados como APIs/backends dedicados (como o `saimo-monitor...workers.dev`).

**Por que importa:** o Saimo TV usa os dois produtos juntos — Pages para o site + um endpoint auxiliar simples, e um Worker separado para uma responsabilidade distinta (monitoramento de fontes) — uma separação natural de responsabilidades, cada peça hospedada onde faz mais sentido.

**Como verificar:** o domínio `*.pages.dev` identifica Cloudflare Pages; o domínio `*.workers.dev` identifica um Worker independente.

**Exercício:** não há exercício de implementação aqui (exigiria conta Cloudflare); como exercício conceitual, liste 2-3 motivos pelos quais seria sensato separar "monitoramento de fontes" do site principal em vez de colocá-lo como mais uma Pages Function.

---

## 7. Virtualização manual de listas (origem: E-016, análise de `tv.js` na Fase 02)

**Conceito:** renderizar centenas/milhares de elementos DOM de uma vez (ex.: uma grade de 334 canais × 25 horas de programação) é lento. **Virtualização** é a técnica de renderizar apenas os itens que estão (ou estão prestes a estar) visíveis na viewport, calculando manualmente quais índices mostrar a partir da posição de scroll — e posicionando-os com `transform: translateY()`/`left` em vez de depender do fluxo normal do documento.

**Por que importa:** a grade de EPG do Saimo TV implementa essa técnica **à mão** (sem bibliotecas como `react-window` ou `@tanstack/react-virtual`), recalculando a janela visível a cada evento de scroll (throttled via `requestAnimationFrame`) e a cada redimensionamento (via `ResizeObserver`).

**Exemplo educacional (simplificado, uma dimensão):**

```typescript
function useJanelaVirtual(scrollRef: React.RefObject<HTMLElement>, alturaItem: number, totalItens: number) {
  const [janela, setJanela] = useState({ inicio: 0, fim: 20 });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let rafId = 0;
    const recalcular = () => {
      const primeiro = Math.floor(el.scrollTop / alturaItem);
      const visiveis = Math.ceil(el.clientHeight / alturaItem);
      setJanela({ inicio: Math.max(0, primeiro - 2), fim: Math.min(totalItens, primeiro + visiveis + 2) });
    };
    const aoRolar = () => { rafId ||= requestAnimationFrame(() => { rafId = 0; recalcular(); }); };
    recalcular();
    el.addEventListener("scroll", aoRolar);
    return () => { el.removeEventListener("scroll", aoRolar); cancelAnimationFrame(rafId); };
  }, [scrollRef, alturaItem, totalItens]);

  return janela; // renderize apenas itens[janela.inicio..janela.fim]
}
```

**Como verificar:** nas DevTools, aba "Elements", inspecione a grade de EPG do Saimo TV enquanto rola a lista — o número de linhas `<div>` no DOM deve permanecer praticamente constante, independentemente de quantos canais existem no total.

**Exercício:** renderize uma lista de 10.000 itens em uma `<div>` com `overflow-y: auto` e altura fixa, primeiro sem virtualização (observe o lag) e depois aplicando a técnica acima.

---

## 8. Padrão de "store externo" via pub/sub, e `useSyncExternalStore` (origem: E-014)

**Conceito:** quando um dado muda **fora** do ciclo de vida do React (ex.: o "programa atual" de um canal, que muda com o relógio, não com uma ação do usuário), um componente precisa de uma forma de "ouvir" essas mudanças. O padrão clássico é: um objeto externo mantém uma lista de funções "ouvintes" (`listeners`); qualquer um pode se inscrever (`subscribe`) e cancelar a inscrição depois; quando o dado muda, todos os ouvintes são chamados (`notify`).

**Por que importa:** o Saimo TV implementa esse padrão manualmente (visto em `player.js`) combinando-o com `useState` + `useEffect` em vez de usar `useSyncExternalStore` — o hook que o próprio React 18+ introduziu exatamente para esse cenário, e que o Saimo TV já tem disponível (o React 19.3.0 embutido no bundle o inclui), mas não usa na prática.

**Por que `useSyncExternalStore` é preferível ao padrão manual:** o padrão manual (`useState` inicial + `useEffect` que assina e atualiza) pode sofrer de **"tearing"** em React concorrente — partes diferentes da árvore podem, por uma fração de tempo, mostrar valores diferentes do mesmo store durante uma atualização interrompível. `useSyncExternalStore` resolve isso nativamente.

**Exemplo educacional:**

```typescript
// A "store" externa (fora do React)
const listeners = new Set<() => void>();
let valor = 0;

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot() {
  return valor;
}

function incrementar() {
  valor += 1;
  listeners.forEach((cb) => cb());
}

// Uso idiomático em um componente
function Contador() {
  const valorAtual = useSyncExternalStore(subscribe, getSnapshot);
  return <button onClick={incrementar}>{valorAtual}</button>;
}
```

**Como verificar:** no React DevTools Profiler, compare o comportamento de um componente usando o padrão manual vs. `useSyncExternalStore` sob atualizações rápidas e concorrentes (`startTransition`) — o padrão manual pode mostrar inconsistências momentâneas; o hook nativo não.

**Exercício:** implemente um pequeno "relógio" global (atualiza a cada segundo) como store externo, primeiro com o padrão manual (`useState`+`useEffect`+`subscribe`), depois migre para `useSyncExternalStore`, e compare o código.

---

## 9. Context API + `useReducer` como "Redux caseiro" (origem: E-014)

**Conceito:** o React não precisa de uma biblioteca externa para ter um estado "global" previsível: `useReducer` dá a mecânica de reducer (ação → novo estado), e `createContext`/`useContext` distribui esse estado (e a função `dispatch`) para qualquer componente da árvore sem precisar passar props manualmente em cada nível ("prop drilling").

**Por que importa:** o Saimo TV não usa Redux/Zustand — usa esse padrão nativo do React, com múltiplos Contexts especializados (um para catálogo, outro para favoritos, etc., a julgar pelo número de `createContext` encontrados).

**Exemplo educacional:**

```typescript
type Estado = { favoritos: Set<string> };
type Acao = { type: "alternar-favorito"; canalId: string };

function reducer(estado: Estado, acao: Acao): Estado {
  if (acao.type === "alternar-favorito") {
    const novo = new Set(estado.favoritos);
    novo.has(acao.canalId) ? novo.delete(acao.canalId) : novo.add(acao.canalId);
    return { favoritos: novo };
  }
  return estado;
}

const FavoritosContext = createContext<{ estado: Estado; dispatch: Dispatch<Acao> } | null>(null);

function FavoritosProvider({ children }: { children: React.ReactNode }) {
  const [estado, dispatch] = useReducer(reducer, { favoritos: new Set() });
  return <FavoritosContext.Provider value={{ estado, dispatch }}>{children}</FavoritosContext.Provider>;
}
```

**Como verificar:** no React DevTools (aba "Components"), componentes que usam `useContext` de um Provider específico aparecem "escutando" esse Provider na árvore.

**Exercício:** converta um `useState` simples de favoritos em um par Context+`useReducer`, e meça (com o Profiler) se componentes não relacionados aos favoritos deixam de re-renderizar quando um favorito muda.

---

## 10. Busca binária sobre dados ordenados por tempo (origem: E-007, `Zm()` em `player.js`)

**Conceito:** quando se tem uma lista ordenada (ex.: programas de um canal, ordenados por horário de início) e precisa-se encontrar rapidamente "qual item cobre o instante X", uma busca linear (`O(n)`) funciona, mas uma **busca binária** (`O(log n)`) é muito mais eficiente — essencial quando esse cálculo roda para cada canal visível, a cada poucos segundos (para manter a barra de "ao vivo" atualizada).

**Por que importa:** o Saimo TV usa esse tipo de busca para encontrar o "programa atual" de um canal dentro de sua lista de programação.

**Exemplo educacional:** ver pseudocódigo da Seção 6.5 de [`02-javascript-analysis.md`](./02-javascript-analysis.md#65-zmcanal--cálculo-do-programa-atual-de-um-canal-playerjs).

**Como verificar:** compare o tempo de execução de uma busca linear vs. binária em um array de 10.000 "programas" ordenados, usando `performance.now()` antes/depois de cada abordagem.

**Exercício:** implemente `buscarIndiceAtual` (Seção 6.5 do documento da Fase 02) do zero, depois escreva testes para os casos de borda: instante antes do primeiro programa, depois do último, e exatamente na borda entre dois programas.

---

## 11. Cache "stale-while-revalidate" feito à mão (origem: E-005, `qm()`/`Bm()` em `player.js`)

**Conceito:** a estratégia *stale-while-revalidate* mostra dados em cache imediatamente (mesmo que "velhos") enquanto, em paralelo ou depois, busca dados novos para atualizar o cache — equilibra responsividade percebida (nunca mostra uma tela vazia enquanto espera a rede) com dados atualizados.

**Por que importa:** o `player.js` do Saimo TV parece implementar uma versão dessa estratégia para o cache de EPG: lê um cache salvo (com timestamp e uma "assinatura" dos canais atuais), e só dispara uma nova busca/merge via Web Worker se o cache estiver "velho demais" ou se a assinatura não bater mais (catálogo mudou).

**Exemplo educacional:**

```typescript
interface CacheEpg { dados: unknown; assinatura: string; capturadoEm: number; }

const IDADE_MAXIMA_MS = 60 * 60 * 1000; // 1 hora

async function obterEpg(assinaturaAtual: string, cache: CacheEpg | null): Promise<unknown> {
  const cacheValido = cache && cache.assinatura === assinaturaAtual && Date.now() - cache.capturadoEm < IDADE_MAXIMA_MS;
  if (cacheValido) return cache.dados; // mostra na hora, mesmo que não seja o mais recente
  const dadosNovos = await buscarEpgDasFontes();
  salvarCache({ dados: dadosNovos, assinatura: assinaturaAtual, capturadoEm: Date.now() });
  return dadosNovos;
}
```

**Como verificar:** nas DevTools (aba Network), recarregue a aplicação duas vezes seguidas dentro de 1 hora — se a estratégia estiver correta, a segunda carga deve mostrar o EPG quase instantaneamente (do cache), possivelmente com uma atualização silenciosa depois.

**Exercício:** implemente `obterEpg` acima com uma função `buscarEpgDasFontes` simulada (com `setTimeout`), e teste os três cenários: cache ausente, cache válido, cache expirado.

---

## 12. `ResizeObserver` para UI responsiva orientada a JavaScript (origem: `C()`/`ResizeObserver` em `tv.js`)

**Conceito:** `window.addEventListener('resize', ...)` só dispara quando a **janela inteira** muda de tamanho. `ResizeObserver` observa um **elemento específico**, disparando sempre que suas dimensões mudam — por qualquer motivo (conteúdo interno, flex/grid se ajustando, não só redimensionamento de janela).

**Por que importa:** a grade de EPG do Saimo TV precisa recalcular sua janela virtualizada sempre que o contêiner de scroll muda de tamanho — não apenas quando a janela do navegador muda — por isso usa `ResizeObserver` no próprio elemento de scroll, além de um listener de `resize` na janela para trocar o layout (desktop/mobile).

**Exemplo educacional:**

```typescript
function useElementoRedimensionado(ref: React.RefObject<HTMLElement>, aoRedimensionar: () => void) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() => aoRedimensionar());
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, aoRedimensionar]);
}
```

**Como verificar:** nas DevTools, abra o painel de dispositivos responsivos e redimensione apenas a largura da viewport (sem recarregar) — a grade de EPG do Saimo TV deve reajustar o layout (densidade de linhas) sem travar nem exigir reload.

**Exercício:** crie um componente com um painel lateral redimensionável (arrastável) e use `ResizeObserver` para logar sua largura a cada ajuste, comparando com uma versão que (incorretamente) tentasse usar apenas o evento `resize` da janela.
