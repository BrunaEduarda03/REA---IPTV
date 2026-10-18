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
