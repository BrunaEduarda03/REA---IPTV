# Arquitetura Observada — SaimoTV

Este documento mapeia a arquitetura da aplicação **https://saimo-tv.pages.dev/tv** conforme evidências coletadas na Fase 01. Toda afirmação aqui referencia uma entrada em [`findings.md`](./findings.md).

## Convenção

- 🟢 **Fato verificado** — evidência direta e reproduzível.
- 🟡 **Inferência** — conclusão razoável a partir de evidência indireta.
- 🔴 **Hipótese** — possibilidade levantada, não comprovada.

## Diagrama

Ver [`diagrams/architecture-overview.mmd`](./diagrams/architecture-overview.mmd).

## Visão geral de componentes

### Frontend (cliente)
- 🟢 **SPA em React**, com roteamento client-side via **React Router**, buildada com **Vite usando Rolldown** como bundler (chunk `rolldown-runtime-*.js` identificado). ([E-002](./findings.md#e-002--stack-de-frontend-react--viterolldown--react-router))
- 🟢 **Code-splitting por feature/rota**: chunks separados `index`, `catalog`, `tv`, `player`, `PainelDeCanais`, `epgWorker`, cada um com seu próprio CSS. ([E-002](./findings.md#e-002--stack-de-frontend-react--viterolldown--react-router))
- 🟢 **epgWorker.js roda em Web Worker dedicado**, isolando o merge/normalização de múltiplas fontes de EPG da thread principal de UI. ([E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado))
- 🟢 **Player de vídeo** embute `hls.js` 1.7.3 (HLS/.m3u8) e `mpegts.js` (MPEG-TS/FLV), além do Google Cast SDK para Chromecast. ([E-007](./findings.md#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos))
- 🟢 **PWA**: manifest.webmanifest + ícones + tentativa de registro de Service Worker. ([E-009](./findings.md#e-009--progressive-web-app-pwa-com-manifest-e-service-worker))
- 🟢 **Persistência local**: apenas `localStorage` (telemetria, volume, cache de catálogo versionado); nenhum cookie observado. ([E-008](./findings.md#e-008--persistência-exclusivamente-em-localstorage-sem-cookies))

### Infraestrutura de borda (edge)
- 🟢 **Cloudflare Pages** hospeda os assets estáticos e o endpoint `/api/proxy`, usado como proxy server-side para contornar CORS ao buscar páginas de `guiadetv.com`. ([E-001](./findings.md#e-001--hospedagem-em-cloudflare-pages), [E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado))
- 🟢 **Cloudflare Worker separado** (`saimo-monitor.gabrielsaimo68.workers.dev`) expõe `/v1/fontes` e `/v1/hello`, usado para checar/filtrar servidores de stream fora do ar. ([E-006](./findings.md#e-006--backend-próprio-de-monitoramento-de-fontes-cloudflare-worker))
- 🟡 O prefixo `gabrielsaimo68` no subdomínio do Worker e o nome do repositório GitHub (`gabrielsaimo/SaimoPlayer`) sugerem um único mantenedor/autor por trás do projeto, mas isso é inferência baseada em nomes, não confirmação direta de autoria.

### Dados externos (terceiros)
- 🟢 **Catálogo de canais**: arquivos de texto (`canais.txt`, `catalogo.txt`) em repositório GitHub público `gabrielsaimo/SaimoPlayer`, buscados diretamente do CDN `raw.githubusercontent.com` no client. ([E-004](./findings.md#e-004--catálogo-de-canais-hospedado-em-repositório-público-do-github))
- 🟢 **EPG multi-fonte**: `guiadetv.com` (via proxy próprio), PlutoTV Brasil (`matthuisman/i.mjh.nz`), `iptv-epg.org`, `open-epg.com`. ([E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado))
- 🟢 **Logos de canal**: agregados de múltiplos hosts de imagem gratuitos/CDNs de terceiros, sem padronização de protocolo (HTTP/HTTPS misto). ([E-010](./findings.md#e-010--logos-de-canais-agregados-de-múltiplas-fontes-públicas-de-imagem-com-conteúdo-misto-http))

## Dependências observadas

| De | Para | Natureza | Evidência |
|---|---|---|---|
| SPA (cliente) | Cloudflare Pages (assets) | Carregamento de bundle | E-001, E-002 |
| SPA (cliente) | `/api/proxy` (Cloudflare Pages Function) | Proxy CORS para `guiadetv.com` | E-005 |
| SPA (cliente) | `raw.githubusercontent.com` | Fetch direto de catálogo e EPG PlutoTV | E-004, E-005 |
| epgWorker | `iptv-epg.org`, `open-epg.com` | Fetch direto de XMLTV | E-005 |
| SPA (cliente) | `saimo-monitor...workers.dev` | Checagem de disponibilidade de fontes | E-006 |
| Player | hls.js / mpegts.js (embutidos) | Reprodução de stream | E-007 |
| Player | Google Cast SDK (gstatic.com) | Cast para Chromecast | E-007 |

## Infraestrutura inferida

- 🟡 Como o catálogo vem de um repositório GitHub público e a lista de "servidores desligados" é dinâmica, é razoável inferir que existe algum processo externo (não observado, possivelmente um script/cron rodando fora da aplicação web) que atualiza periodicamente `canais.txt`/`catalogo.txt` e alimenta o Worker de monitoramento com status dos servidores — mas isso **não foi confirmado**, é hipótese.
- 🔴 Não há evidência direta de um banco de dados tradicional (SQL/NoSQL); tudo observado até agora é compatível com uma arquitetura "serverless + arquivos estáticos versionados em Git" sem banco de dados próprio.

## Elementos desconhecidos

- Conteúdo exato de `canais.txt` / `catalogo.txt` (formato dos dados de stream) — não lido nesta fase.
- Lógica de seleção entre `hls.js` e `mpegts.js` por canal — não investigada.
- Corpo de resposta de `/v1/fontes` e `/v1/hello` do Worker de monitoramento.
- Comportamento das abas Eventos, On Demand, Favoritos, Rádios, Buscar e Início — não exploradas nesta fase.
- Estratégia de cache do Service Worker (bloqueado na captura automatizada).
