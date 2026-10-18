# Arquitetura Observada — SaimoTV

Este documento mapeia a arquitetura da aplicação **https://saimo-tv.pages.dev/tv** conforme evidências coletadas nas Fases 01 a 04. Toda afirmação aqui referencia uma entrada em [`findings.md`](./findings.md). Para o detalhamento da arquitetura JavaScript (módulos, estado, componentes), ver [`02-javascript-analysis.md`](./02-javascript-analysis.md); para streaming/player, ver [`03-streaming-player.md`](./03-streaming-player.md); para dados/APIs/backend/infraestrutura, ver [`04-data-api-infrastructure.md`](./04-data-api-infrastructure.md).

## Convenção

- 🟢 **Fato verificado** — evidência direta e reproduzível.
- 🟡 **Inferência** — conclusão razoável a partir de evidência indireta.
- 🔴 **Hipótese** — possibilidade levantada, não comprovada.
- ✅ **Verificado pelo código-fonte original** — confirmado por leitura direta do repositório público `github.com/gabrielsaimo/Saimo-TV` (ver nota abaixo), o grau de confiança mais alto possível neste laboratório.

## Verificação cruzada com o código-fonte público (2026-10-19)

O repositório oficial do Saimo TV é público: **https://github.com/gabrielsaimo/Saimo-TV** (identificado pelo usuário; confirmado via API do GitHub — `homepage` bate com o alvo, 49 estrelas, sem licença declarada = todos os direitos reservados). Uma passagem de verificação leu os arquivos-fonte reais (TypeScript não minificado) e **confirmou com altíssima precisão** praticamente toda a engenharia reversa feita nas Fases 01-04 a partir de bundles minificados — e revelou detalhes que o código minificado não deixava claros (ex.: app desktop é Tauri, não Electron; curadoria de "servidores desligados" é manual, não automática; mecanismo de fallback de fonte é mais rico que uma escolha binária). Ver `findings.md`, seção "Verificação cruzada com o código-fonte público" (E-035 a E-045), para o detalhamento completo. **Nota de direitos autorais:** o código-fonte foi lido para fins de verificação/documentação, nunca copiado para uma nova implementação (`AGENTS.md`, item 14).

Uma **auditoria técnica final** (2026-10-19) ampliou essa verificação para cobrir o inventário funcional completo (todas as telas/serviços da árvore de arquivos), uma **matriz de rastreabilidade** classificando cada uma das 34 descobertas das Fases 01-04 (confirmada / parcialmente confirmada / corrigida / não reverificada), e uma classificação de quais funcionalidades são replicáveis de forma independente vs. dependentes de conteúdo/serviços de terceiros. Ver [`auditoria-tecnica-final.md`](./auditoria-tecnica-final.md) para o documento completo.

## Diagramas

- Visão geral de infraestrutura: [`diagrams/architecture-overview.mmd`](./diagrams/architecture-overview.mmd)
- Mapa de módulos JavaScript: [`diagrams/02-module-graph.mmd`](./diagrams/02-module-graph.mmd)
- Fluxo de inicialização: [`diagrams/02-init-flow.mmd`](./diagrams/02-init-flow.mmd)
- Arquitetura do player: [`diagrams/03-player-architecture.mmd`](./diagrams/03-player-architecture.mmd)
- Sequência de troca de canal: [`diagrams/03-channel-switch-sequence.mmd`](./diagrams/03-channel-switch-sequence.mmd)
- Modelo ER conceitual: [`diagrams/04-entities-er.mmd`](./diagrams/04-entities-er.mmd)
- Arquitetura observada (dados/backend): [`diagrams/04-architecture-observed.mmd`](./diagrams/04-architecture-observed.mmd)
- Arquitetura proposta (educacional, independente): [`diagrams/04-architecture-proposed.mmd`](./diagrams/04-architecture-proposed.mmd)

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
- 🟢 **Sem source maps públicos** servidos pelo site — mas o **código-fonte original está disponível por outro caminho**: o repositório GitHub público do projeto ([E-035](./findings.md#e-035--repositório-fonte-oficial-identificado-e-verificado-githubcomgabrielsaimosaimo-tv)), usado nesta sessão para uma verificação cruzada de alta confiança. ([E-012](./findings.md#e-012--nenhum-source-map-publicamente-disponível))

### Infraestrutura de borda (edge)
- 🟢 **Cloudflare Pages** hospeda os assets estáticos e **duas** Pages Functions: `/api/proxy` (proxy server-side para contornar CORS ao buscar EPG de `guiadetv.com` e rotear fontes de mídia especiais) e `/api/events` (dados de eventos esportivos). ([E-001](./findings.md#e-001--hospedagem-em-cloudflare-pages), [E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado), [E-019](./findings.md#e-019--proxy-de-mídia-reutiliza-o-mesmo-endpoint-apiproxy-do-epg-com-encaminhamento-opcional-de-refereruser-agent), [E-032](./findings.md#e-032--dois-endpoints-de-backend-adicionais-descobertos-apievents-próprio-e-v1eventos-worker-de-monitoramento))
- 🟢 **Cloudflare Worker separado** (`saimo-monitor.gabrielsaimo68.workers.dev`) expõe **três rotas**: `/v1/hello` (POST, provável telemetria/heartbeat), `/v1/fontes` (status de servidores de stream), e `/v1/eventos` (dado de eventos esportivos) — responsabilidades mais amplas do que um simples "monitor de fontes". ([E-006](./findings.md#e-006--backend-próprio-de-monitoramento-de-fontes-cloudflare-worker), [E-032](./findings.md#e-032--dois-endpoints-de-backend-adicionais-descobertos-apievents-próprio-e-v1eventos-worker-de-monitoramento), [E-033](./findings.md#e-033--correçãodetalhamento-de-e-006-v1hello-é-chamado-via-post-com-corpo-não-get))
- 🟢 **Service Worker** próprio implementa cache "app shell" (network-first para navegação, cache-first para assets com hash), **excluindo deliberadamente `/api/*` de qualquer cache** — resolve a antiga Q-006. ([E-027](./findings.md#e-027--service-worker-público-lido-por-completo-estratégia-de-cache-app-shell-resolve-q-006))
- 🟡 O prefixo `gabrielsaimo68` no subdomínio do Worker e o nome do repositório GitHub (`gabrielsaimo/SaimoPlayer`) sugerem um único mantenedor/autor por trás do projeto, mas isso é inferência baseada em nomes, não confirmação direta de autoria.
- 🟢 **Nenhuma evidência de banco de dados tradicional, linguagem ou framework de backend** — apenas a existência e o papel aparente dos endpoints foi confirmado, não sua implementação interna. ([`04-data-api-infrastructure.md`](./04-data-api-infrastructure.md#6-investigação-de-backend-e-serviços))

### Dados externos (terceiros)
- 🟢 **Catálogo de canais e VOD**: arquivos de texto (`canais.txt`, `catalogo.txt`, e um caminho `/vod/`) em repositório GitHub público `gabrielsaimo/SaimoPlayer`, buscados diretamente do CDN `raw.githubusercontent.com` no client; formato chave-valor por linha (`fonte`/`referer`/`nome`/`qualidade`/`agente`/`chave`). ([E-004](./findings.md#e-004--catálogo-de-canais-hospedado-em-repositório-público-do-github), [E-022](./findings.md#e-022--formato-do-catálogo-de-fontes-por-canal-parcialmente-resolve-q-001--suporte-a-playlists-m3um3u8-padrão-como-entrada-alternativa))
- 🟢 **EPG multi-fonte**: `guiadetv.com` (via proxy próprio), PlutoTV Brasil (`matthuisman/i.mjh.nz`), `iptv-epg.org`, `open-epg.com`. ([E-005](./findings.md#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado))
- 🟢 **Metadados de VOD via TMDB** (`api.themoviedb.org`, `image.tmdb.org`), com chave de API client-side hardcoded no bundle (valor não divulgado). ([E-029](./findings.md#e-029--integração-com-a-api-pública-do-tmdb-the-movie-database-para-metadados-de-vod-incluindo-chave-de-api-hardcoded-no-bundle))
- 🟢 **Eventos esportivos via ESPN** (`site.api.espn.com`, ~15+ ligas de futebol), combinados com `/api/events` e `/v1/eventos`. ([E-030](./findings.md#e-030--integração-com-a-api-pública-da-espn-para-a-aba-eventos-esportes))
- 🟢 **Legendas de VOD via addon comunitário do Stremio** (OpenSubtitles). ([E-031](./findings.md#e-031--legendas-de-vod-via-addon-comunitário-do-stremio-opensubtitles))
- 🟢 **Logos de canal**: agregados de múltiplos hosts de imagem gratuitos/CDNs de terceiros, sem padronização de protocolo (HTTP/HTTPS misto). ([E-010](./findings.md#e-010--logos-de-canais-agregados-de-múltiplas-fontes-públicas-de-imagem-com-conteúdo-misto-http))
- 🟢 **Dezenas de origens de stream de terceiros** (CDNs comerciais e servidores self-hosted) embutidas na lista de fallback — categorias de infraestrutura documentadas, domínios individuais deliberadamente não listados. ([E-034](./findings.md#e-034--dezenas-de-domínios-de-origem-de-stream-embutidos-na-lista-de-fallback-categorias-de-infraestrutura-observadas-sem-enumeração))

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

- ~~Como o catálogo vem de um repositório GitHub público...~~ ✅ **Confirmado**: `src/services/fontesDesativadas.ts` revela que a lista de "servidores desligados" é **curadoria manual do mantenedor** em um painel administrativo não público (não um processo automatizado de ping/scraping como se supunha) — ver [E-039](./findings.md#e-039--mecanismo-de-servidores-desligados-é-curadoria-manual-não-monitoramento-automático-corrige-e-006).
- 🔴 Não há evidência direta de um banco de dados tradicional (SQL/NoSQL) **por trás do site em produção**; porém, um comentário de código (E-043) menciona um componente externo de geração de catálogo ("`api-saimo-tv`") que usa **Supabase** — mas esse componente é de build-time/manutenção do catálogo, não parte do runtime do site investigado (ver Q-014).

## Elementos desconhecidos

- ~~Conteúdo real de `canais.txt`/`catalogo.txt`~~ ✅ **Formato resolvido** por verificação de código-fonte (Q-001); conteúdo real dos arquivos ainda não lido linha a linha.
- Corpo de resposta exato (schema JSON) de `/v1/eventos` e `embedtv.cc/api/events` — ver Q-013. (`/v1/fontes` e `/v1/hello` já resolvidos — E-039, E-040.)
- Comportamento visual das abas Eventos, On Demand, Favoritos, Rádios, Buscar e Início, e das rotas `StreamTester`, `AppDownload`, `Novidades` — código-fonte lido parcialmente, mas não exploradas visualmente no navegador.
- ~~Nomes originais de componentes/funções~~ ✅ **Em grande parte resolvidos** pela verificação de código-fonte (E-035 a E-045) — a nomenclatura usada nas Fases 02/03 (inferida de bundles minificados) correspondeu de forma notavelmente precisa aos nomes reais.
- Onde mora o componente de nível superior que orquestra `ChannelPanel`/`PainelDeCanais`, `ProgramGuide` e o player (provavelmente `src/App.tsx` ou uma tela em `src/telas/`, não lido em detalhe).
- Funcionalidade exata do modo "Tela 1/Tela 2" (multi-tela) — ainda não localizada no código-fonte (possivelmente relacionada a `isMirrored`/`isPiP` do `PlayerState`, E-037, mas não confirmado).
- Requisições de rede reais de manifesto/segmento de mídia (nenhuma reprodução foi iniciada, por decisão deliberada — ver Q-007).
- Se algum canal ativo usa de fato DRM ClearKey (não investigado por decisão deliberada — ver Q-008); mecanismo de conversão de chave (`hexToBase64Url`) confirmado existir (E-038), uso real não verificado.
- ~~Se existe autenticação/conta de usuário~~ ✅ **Confirmado que não existe** (Q-012, verificação de código-fonte: nenhum componente de login em toda a árvore de arquivos).
