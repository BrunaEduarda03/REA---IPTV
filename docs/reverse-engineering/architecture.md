# Arquitetura Observada — SaimoTV

Este documento mapeia a arquitetura da aplicação **https://saimo-tv.pages.dev/tv** conforme evidências coletadas nas Fases 01, 02 e 03. Toda afirmação aqui referencia uma entrada em [`findings.md`](./findings.md). Para o detalhamento da arquitetura JavaScript (módulos, estado, componentes), ver [`02-javascript-analysis.md`](./02-javascript-analysis.md); para a arquitetura de streaming/player, ver [`03-streaming-player.md`](./03-streaming-player.md).

## Convenção

- 🟢 **Fato verificado** — evidência direta e reproduzível.
- 🟡 **Inferência** — conclusão razoável a partir de evidência indireta.
- 🔴 **Hipótese** — possibilidade levantada, não comprovada.

## Diagramas

- Visão geral de infraestrutura: [`diagrams/architecture-overview.mmd`](./diagrams/architecture-overview.mmd)
- Mapa de módulos JavaScript: [`diagrams/02-module-graph.mmd`](./diagrams/02-module-graph.mmd)
- Fluxo de inicialização: [`diagrams/02-init-flow.mmd`](./diagrams/02-init-flow.mmd)
- Arquitetura do player: [`diagrams/03-player-architecture.mmd`](./diagrams/03-player-architecture.mmd)
- Sequência de troca de canal: [`diagrams/03-channel-switch-sequence.mmd`](./diagrams/03-channel-switch-sequence.mmd)

## Visão geral de componentes

### Frontend (cliente)
- 🟢 **SPA em React 19.3.0** (versão exata confirmada na Fase 02), com **ReactDOM 19.3.0** e **React Router** (API de data router, `RouterProvider`), buildada com **Vite usando Rolldown** como bundler (chunk `rolldown-runtime-*.js` identificado). ([E-002](./findings.md#e-002--stack-de-frontend-react--viterolldown--react-router), [E-011](./findings.md#e-011--versões-exatas-de-react-reactdom-e-scheduler-mapa-preciso-de-dependências-entre-chunks))
- 🟢 **Code-splitting por feature/rota**: chunks separados `index`, `catalog`, `tv`, `player`, `PainelDeCanais`, `epgWorker`, e pelo menos três rotas adicionais não exploradas (`StreamTester`, `AppDownload`, `Novidades`), cada um com seu próprio CSS. ([E-002](./findings.md#e-002--stack-de-frontend-react--viterolldown--react-router), [E-013](./findings.md#e-013--rotas-e-funcionalidades-adicionais-não-exploradas-na-fase-01))
- 🟢 **`catalog.js` é o chunk "hub"**: contém o núcleo físico do React, reaproveitado (deduplicado) por todos os demais chunks de feature, além da lógica de catálogo/estado da aplicação. ([E-011](./findings.md#e-011--versões-exatas-de-react-reactdom-e-scheduler-mapa-preciso-de-dependências-entre-chunks))
- 🟢 **Nenhuma biblioteca de state management de terceiros** (Zustand/Redux/Recoil): estado estrutural via Context API + `useReducer`; dados externos ao React (ex.: EPG "agora") via um padrão manual de pub/sub (`Set` de listeners), não via `useSyncExternalStore`. ([E-014](./findings.md#e-014--gerenciamento-de-estado-context--usereducer--stores-manuais-via-pubsub-sem-zustandredux))
- 🟢 **Grade de EPG (`ProgramGuide`) usa virtualização manual** (sem `react-window`/`react-virtual`), com throttling de scroll via `requestAnimationFrame` e `ResizeObserver` para responsividade. (Detalhado em [`02-javascript-analysis.md`](./02-javascript-analysis.md#6-análise-de-funções-importantes))
- 🟢 **epgWorker.js roda em Web Worker dedicado**, instanciado a partir de `player.js`, isolando o merge/normalização de múltiplas fontes de EPG da thread principal de UI; usa cache local com invalidação por assinatura/timestamp (stale-while-revalidate). ([E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado))
- 🟢 **Player com três motores de reprodução**: `hls.js` 1.7.3 (padrão/catch-all), `mpegts.js` (URLs `.ts`), e **Shaka Player** (URLs `.mpd`/DASH, carregado sob demanda via `import()` dinâmico, com suporte a DRM ClearKey) — escolhidos por teste simples da URL da fonte, não por metadado explícito. Google Cast SDK para Chromecast também presente. Player também guarda uma **lista de canais de fallback embutida no bundle** e a lista canônica de categorias (incluindo "Pluto TV", "Internacionais" e "Adulto", esta última com um Context de controle de acesso dedicado). ([E-007](./findings.md#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos), [E-016](./findings.md#e-016--lista-canônica-de-categorias-revela-seções-não-observadas-pluto-tv-internacionais-adulto-e-lista-de-canais-de-fallback-embutida-no-bundle), [E-018](./findings.md#e-018--seleção-de-engine-de-reprodução-três-motores-distintos-escolhidos-por-teste-de-url), [E-021](./findings.md#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda), [E-023](./findings.md#e-023--mecanismo-de-controle-de-acesso-para-conteúdo-adulto))
- 🟢 **Sistema de recuperação de reprodução**: cada canal pode ter múltiplas fontes alternativas; watchdogs de 12s (sem primeiro frame) e 25s (travamento, checado a cada 2s) decidem entre recuperação suave (sem trocar de fonte) ou fallback para a próxima fonte da lista; um guard booleano protege contra condições de corrida na troca rápida de canais. ([E-020](./findings.md#e-020--sistema-de-recuperação-de-falhas-com-múltiplas-fontes-por-canal-watchdogs-de-congelamento-e-proteção-contra-condição-de-corrida))
- 🟢 **Proxy de mídia**: o mesmo endpoint `/api/proxy` usado para EPG (E-005) também roteia streams inseguros (`http://`), disfarçados (`.txt`) ou de um domínio específico, com encaminhamento opcional de `Referer`/`User-Agent`. ([E-019](./findings.md#e-019--proxy-de-mídia-reutiliza-o-mesmo-endpoint-apiproxy-do-epg-com-encaminhamento-opcional-de-refereruser-agent))
- 🟡 **Catálogo de fontes por canal**: formato de texto chave-valor próprio (`fonte`, `referer`, `nome`, `qualidade`, `agente`, `chave`), com suporte alternativo a playlists M3U/M3U8 padrão da indústria IPTV — inferido pelo parser, não pelo conteúdo real do arquivo. ([E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa))
- 🟢 **PWA**: manifest.webmanifest + ícones + tentativa de registro de Service Worker. ([E-009](./findings.md#e-009--progressive-web-app-pwa-com-manifest-e-service-worker))
- 🟢 **Persistência local**: apenas `localStorage`, **pelo menos 19 chaves** cobrindo catálogo, favoritos de TV e VOD (separados), EPG (com versionamento de schema v3–v6), preferências de nitidez, lista de domínios sem necessidade de proxy CORS, modo desenvolvedor, canais personalizados, "continuar assistindo" e histórico de buscas; nenhum cookie observado. ([E-008](./findings.md#e-008--persistência-exclusivamente-em-localstorage-sem-cookies), [E-017](./findings.md#e-017--inventário-de-chaves-de-localstorage-revela-funcionalidades-não-documentadas))
- 🟢 **Sem source maps públicos** — qualquer leitura de código trabalha apenas com JS minificado. ([E-012](./findings.md#e-012--nenhum-source-map-publicamente-disponível))

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
| Player | hls.js / mpegts.js (embutidos), Shaka Player (lazy) | Reprodução de stream | E-007, E-018, E-021 |
| Player | `/api/proxy` | Roteamento de fontes de mídia inseguras/especiais | E-019 |
| Player | Google Cast SDK (gstatic.com) | Cast para Chromecast | E-007 |

## Infraestrutura inferida

- 🟡 Como o catálogo vem de um repositório GitHub público e a lista de "servidores desligados" é dinâmica, é razoável inferir que existe algum processo externo (não observado, possivelmente um script/cron rodando fora da aplicação web) que atualiza periodicamente `canais.txt`/`catalogo.txt` e alimenta o Worker de monitoramento com status dos servidores — mas isso **não foi confirmado**, é hipótese.
- 🔴 Não há evidência direta de um banco de dados tradicional (SQL/NoSQL); tudo observado até agora é compatível com uma arquitetura "serverless + arquivos estáticos versionados em Git" sem banco de dados próprio.

## Elementos desconhecidos

- Conteúdo real de `canais.txt` / `catalogo.txt` (sabemos o formato do parser desde a Fase 03, mas não o conteúdo real) — ver Q-001.
- Corpo de resposta de `/v1/fontes` e `/v1/hello` do Worker de monitoramento.
- Comportamento das abas Eventos, On Demand, Favoritos, Rádios, Buscar e Início, e das rotas `StreamTester`, `AppDownload`, `Novidades` — não exploradas.
- Estratégia de cache do Service Worker (bloqueado na captura automatizada).
- Nomes originais de componentes/funções (sem source maps — toda nomenclatura "amigável" usada nas Fases 02/03 é inferência, não fato).
- Onde mora o componente/Context de nível superior que orquestra `ChannelPanel`, `ProgramGuide` e o player.
- Funcionalidade exata do modo "Tela 1/Tela 2" (multi-tela) descoberto em `PainelDeCanais.js`.
- Requisições de rede reais de manifesto/segmento de mídia (nenhuma reprodução foi iniciada, por decisão deliberada — ver Q-007).
- Se algum canal ativo usa de fato DRM ClearKey (não investigado por decisão deliberada — ver Q-008).
