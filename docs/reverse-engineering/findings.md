# Findings — Descobertas do Laboratório SaimoTV

Registro numerado de descobertas técnicas. Cada entrada segue o modelo abaixo. Correções a descobertas anteriores são registradas como novas entradas que referenciam a entrada original — nunca sobrescrevendo o histórico.

## Modelo de entrada

```
## E-XXX — <título curto>

- **Data:** AAAA-MM-DD
- **Componente investigado:** <parte da aplicação>
- **Fonte da evidência:** <URL, arquivo, requisição específica>
- **Ferramenta e método:** <ferramenta REA/outra + como foi usada>
- **Resultado observado:** <o que foi literalmente visto>
- **Interpretação técnica:** <o que isso significa>
- **Confiança:** alta | média | baixa
- **Limitações:** <o que não foi possível confirmar>
```

---

## E-001 — Hospedagem em Cloudflare Pages

- **Data:** 2026-10-18
- **Componente investigado:** Infraestrutura de hospedagem
- **Fonte da evidência:** Resposta HTTP de `GET https://saimo-tv.pages.dev/tv` (`research/artifacts/capture-01-full.json`)
- **Ferramenta e método:** `mcp__rea__capture_browser_scenario` (Chromium headless via Playwright), captura de eventos de rede com `header_values: true`.
- **Resultado observado:** Domínio `*.pages.dev`; cabeçalho de resposta `cf-ray` presente na lista `header_names` da resposta principal, junto com `server`, `nel`, `report-to`, `alt-svc` (headers característicos de edge Cloudflare).
- **Interpretação técnica:** `cf-ray` é um cabeçalho exclusivo da infraestrutura de borda (edge) da Cloudflare. Combinado com o domínio `pages.dev`, confirma que a aplicação é hospedada no **Cloudflare Pages** (hospedagem estática + funções serverless na borda).
- **Confiança:** alta
- **Limitações:** Não foi lido o valor literal do header `server` (apenas o nome do header foi capturado nesta rodada); suficiente para o nível de confiança atribuído pois `cf-ray` já é determinante.

---

## E-002 — Stack de frontend: React + Vite/Rolldown + React Router

- **Data:** 2026-10-18
- **Componente investigado:** Bundle JavaScript servido ao navegador
- **Fonte da evidência:** `research/artifacts/scripts/vendor-react-DYlNHYxM.js`, `research/artifacts/scripts/rolldown-runtime-hePW80VL.js`, `research/artifacts/scripts/catalog-Y4ECXKT4.js`
- **Ferramenta e método:** Download direto dos arquivos JS públicos (`curl`) + inspeção de strings/fingerprints com `grep`/Python.
- **Resultado observado:** Arquivo dedicado `vendor-react-*.js` (chunk separado só para React); arquivo `rolldown-runtime-*.js` (runtime de módulos gerado pelo bundler **Rolldown**, o bundler em Rust usado pelo Vite em sua variante `rolldown-vite`); string `react-router` encontrada em `catalog-Y4ECXKT4.js`; nomes de arquivo com hash de conteúdo (`index-B8gNV0IZ.js`, `catalog-Y4ECXKT4.js` etc.) e CSS por chunk (`catalog-KvScdLYE.css`, `player-BDmneVGq.css`...).
- **Interpretação técnica:** A aplicação é uma SPA em **React**, com **code-splitting por rota/feature** (chunks separados: `catalog`, `player`, `tv`, `PainelDeCanais`, `epgWorker`), buildada com **Vite usando Rolldown** como bundler (substituto Rust do Rollup), e usa **React Router** para navegação client-side.
- **Confiança:** alta
- **Limitações:** Não foi confirmada a versão exata do React nem a configuração específica do Vite (vite.config.ts não é público).

---

## E-003 — Estrutura de interface e navegação por abas

- **Data:** 2026-10-18
- **Componente investigado:** Interface visual em `/tv`
- **Fonte da evidência:** `research/artifacts/tv-dom-snapshot.html`, `research/artifacts/tv-screenshot.png`
- **Ferramenta e método:** `capture_browser_scenario` com captura de DOM e screenshot ao final da navegação.
- **Resultado observado:** Elemento `<div id="root">` (ponto de montagem React). Barra superior (`<header class="barra-topo">`) com logo, navegação por abas (`<nav class="barra-abas">`) contendo: Buscar (Alt+1), Início (Alt+2), Ao vivo (Alt+3, ativa por padrão em `/tv`), Eventos (Alt+4), On Demand (Alt+5), Favoritos (Alt+6), Rádios (Alt+7), Baixar app (Alt+8), além de botão de Ajustes e relógio. Um "painel de canais" lateral mostra lista de 334 canais com busca, pílulas de categoria (Todos, Favoritos, TV Aberta, Filmes, Esportes, Noticias, Infantil, Documentarios, Entretenimento, 24 Horas) e área central de player com placeholder "Selecione um canal".
- **Interpretação técnica:** Interface pensada para uso com teclado/controle remoto (atalhos Alt+N para cada aba, Cmd/Ctrl+↑/↓ para trocar de canal conforme texto de rodapé do painel). Indicador animado (`barra-capsula`) desliza entre abas via `transform: translateX()`.
- **Confiança:** alta
- **Limitações:** Apenas o estado inicial da rota `/tv` foi capturado; o conteúdo das demais abas (Eventos, On Demand, Favoritos, Rádios) não foi investigado nesta fase.

---

## E-004 — Catálogo de canais hospedado em repositório público do GitHub

- **Data:** 2026-10-18
- **Componente investigado:** Origem dos dados de canais
- **Fonte da evidência:** Requisições de rede para `https://raw.githubusercontent.com/gabrielsaimo/SaimoPlayer/main/canais.txt?t=<timestamp>` e `.../catalogo.txt?t=<timestamp>`; `localStorage` key `saimo-catalogo-v2`.
- **Ferramenta e método:** `capture_browser_scenario`, captura de eventos de rede (`events: ["network"]`).
- **Resultado observado:** Dois arquivos de texto puro buscados diretamente do GitHub (via `raw.githubusercontent.com`), com parâmetro de cache-busting `?t=<epoch em ms>`. O painel de canais exibe contagem "334".
- **Interpretação técnica:** O catálogo de canais e suas URLs de stream não residem em um banco de dados próprio, mas em arquivos de texto versionados no repositório GitHub público `gabrielsaimo/SaimoPlayer`. O app busca esses arquivos diretamente do CDN do GitHub no carregamento, com `?t=` para evitar cache HTTP desatualizado. O resultado é cacheado localmente (`saimo-catalogo-v2` no `localStorage`), sugerindo uma estratégia "fetch-then-cache" com versionamento do schema (`v2`).
- **Confiança:** alta
- **Limitações:** Não foi lido o conteúdo de `canais.txt`/`catalogo.txt` nesta fase (ficaria para uma investigação de formato de dados, fora do escopo de reconhecimento inicial). Não se sabe se há fallback caso o GitHub esteja indisponível.

---

## E-005 — EPG agregado de quatro fontes públicas, processado em Web Worker dedicado

- **Data:** 2026-10-18
- **Componente investigado:** Guia de programação (EPG — Electronic Program Guide)
- **Fonte da evidência:** `research/artifacts/scripts/epgWorker-DvROaIIK.js`; requisições para `saimo-tv.pages.dev/api/proxy?url=https://www.guiadetv.com/canal/<slug>` (60+ chamadas, uma por canal aberto); requisição para `raw.githubusercontent.com/matthuisman/i.mjh.nz/master/PlutoTV/br.xml`; console log `[EPG] Pluto cobriu 3 canais`.
- **Ferramenta e método:** Download e leitura do worker público + análise de eventos de rede e console capturados por `capture_browser_scenario`.
- **Resultado observado:** O arquivo `epgWorker-*.js` roda em um **Web Worker** (thread separada) e contém: (a) lista de sufixos de qualidade a remover de nomes (`hd`,`sd`,`fhd`,`uhd`,`4k`,`br`); (b) função de normalização de nome de canal (remove acentos, prefixos de país, sufixos de qualidade); (c) duas URLs de EPG em formato XMLTV codificadas no arquivo: `https://iptv-epg.org/files/epg-br.xml` e `https://www.open-epg.com/files/brazil3.xml`; (d) mapa de aliases de nomes de canal (ex.: `band` → `band sp`) e mapa de códigos de 3 letras por canal (ex.: `globo` → `GRD`). Separadamente, a aplicação também faz dezenas de requisições a um endpoint próprio `/api/proxy?url=<url externa>`, que repassa (server-side, função do Cloudflare Pages) o conteúdo de páginas individuais de `www.guiadetv.com/canal/<slug>` — contornando CORS, já que o navegador não pode buscar esse HTML de origem cruzada diretamente.
- **Interpretação técnica:** O EPG é agregado de **pelo menos quatro fontes públicas diferentes**: (1) páginas HTML individuais de `guiadetv.com`, obtidas via um proxy server-side próprio (`/api/proxy`); (2) um XML XMLTV da PlutoTV Brasil mantido pela comunidade (`matthuisman/i.mjh.nz`, projeto conhecido no universo IPTV/Kodi); (3) `iptv-epg.org`; (4) `open-epg.com`. Como cada fonte nomeia os canais de forma diferente, o worker implementa normalização de texto e mapas de alias/código para casar (match) os dados de programação com os canais do catálogo interno. Rodar esse processamento em Web Worker evita bloquear a thread principal (UI) durante o merge de múltiplas fontes.
- **Confiança:** alta (fontes e mecanismo de normalização, lidos diretamente do código-fonte público) / média (se as 4 fontes são as únicas, ou se há mais lógica condicional não exercida nesta sessão)
- **Limitações:** Não foi acionada nenhuma aba além de "Ao vivo" nesta sessão; o merge completo do EPG (produção final exibida ao usuário) não foi observado em detalhe. Apenas o código estático do worker foi lido — nenhuma instrumentação de runtime (ex. breakpoints) foi usada.

---

## E-006 — Backend próprio de monitoramento de fontes (Cloudflare Worker)

- **Data:** 2026-10-18
- **Componente investigado:** Verificação de disponibilidade das fontes de stream
- **Fonte da evidência:** Requisições de rede para `https://saimo-monitor.gabrielsaimo68.workers.dev/v1/fontes` e `.../v1/hello`; log de console `[info] servidores desligados: 138.204.86.4, 16-5-0-235.sslip.io, ...` emitido por `catalog-Y4ECXKT4.js`.
- **Ferramenta e método:** `capture_browser_scenario`, captura de eventos de rede e console.
- **Resultado observado:** Subdomínio `*.workers.dev` (Cloudflare Workers) com namespace pessoal `gabrielsaimo68`, expondo ao menos dois endpoints: `/v1/hello` (provável healthcheck) e `/v1/fontes` ("fontes" = fontes/sources, em português). O app registra no console uma lista de hosts classificados como "servidores desligados" (servidores de stream fora do ar).
- **Interpretação técnica:** Existe um **backend próprio, separado do site estático**, hospedado como Cloudflare Worker, dedicado a monitorar a saúde das fontes/servidores de stream usados pelo catálogo (provável scraping/ping periódico por um processo externo, consultado pelo client para filtrar canais com servidor fora do ar antes de exibi-los ou sugeri-los).
- **Confiança:** alta (existência do endpoint e do mecanismo de bloqueio) / baixa (detalhes internos do Worker, já que seu código não é público)
- **Limitações:** O corpo das respostas de `/v1/fontes` e `/v1/hello` não foi registrado nesta captura (apenas a URL e o efeito observado em console). O código-fonte do Worker não é acessível publicamente (não é um bundle servido ao navegador).

---

## E-007 — Player de vídeo com hls.js 1.7.3 e mpegts.js embutidos

- **Data:** 2026-10-18
- **Componente investigado:** Chunk de player (`player-DGAgJsZy.js`, 1,5 MB)
- **Fonte da evidência:** `research/artifacts/scripts/player-DGAgJsZy.js`
- **Ferramenta e método:** Download do bundle público + busca de strings/fingerprints (`grep`, Python) por assinaturas de bibliotecas de streaming conhecidas.
- **Resultado observado:** String literal `Debug logs enabled for "..." in hls.js version 1.7.3` encontrada no bundle; padrão de exportação UMD `e.mpegts=r()` (assinatura característica da biblioteca `mpegts.js`) também presente. Scripts do **Google Cast SDK** (`cast_framework.js`, `cast_sender.js`) carregados na página, e log de console `Google Cast inicializado com sucesso`.
- **Interpretação técnica:** O player embutido suporta **múltiplos protocolos de streaming**: `hls.js` (v1.7.3) para HLS/`.m3u8`, e `mpegts.js` para MPEG-TS/FLV ao vivo (protocolo comum em servidores de IPTV tipo Flussonic/nginx-rtmp) — típico de um player que precisa lidar com fontes heterogêneas agregadas de múltiplos provedores, como sugerido pelo catálogo (E-004). Suporte a **Chromecast** confirmado via Cast SDK do Google, carregado de forma assíncrona.
- **Confiança:** alta (bibliotecas identificadas por string literal de versão e padrão de exportação) 
- **Limitações:** Esta é uma identificação por fingerprint estático — nenhuma reprodução de mídia foi realizada, e a lógica de decisão "qual player usar para qual canal" não foi investigada (fica para fase futura, conforme instrução de não aprofundar o player agora).

---

## E-008 — Persistência exclusivamente em localStorage, sem cookies

- **Data:** 2026-10-18
- **Componente investigado:** Armazenamento local do navegador
- **Fonte da evidência:** Snapshot de storage capturado por `capture_browser_scenario` (`research/artifacts/capture-01-full.json`)
- **Ferramenta e método:** `capture_browser_scenario` com `capture.at_end: ["storage"]` (valores retornados apenas como hash SHA-256, nunca em texto plano).
- **Resultado observado:** `cookies: []`; `session_storage: []`; `local_storage` com 3 chaves: `saimo-telemetria-id`, `tv-volume`, `saimo-catalogo-v2`.
- **Interpretação técnica:** O app não usa cookies (nem de sessão nem persistentes) e mantém todo estado do cliente em `localStorage`: um ID de telemetria/analytics gerado no cliente, a preferência de volume do player, e o cache do catálogo de canais (versionado, ver E-004).
- **Confiança:** alta
- **Limitações:** Valores reais das chaves não foram lidos (apenas hashes, por política de privacidade da ferramenta de captura) — não sabemos o formato exato de `saimo-catalogo-v2` nem se há mais chaves criadas em outras abas/fluxos não exercidos nesta sessão.

---

## E-009 — Progressive Web App (PWA) com manifest e Service Worker

- **Data:** 2026-10-18
- **Componente investigado:** Capacidades de instalação/offline
- **Fonte da evidência:** `<link rel="manifest" href="/manifest.webmanifest">` no DOM; `research/artifacts/manifest.webmanifest`; log de console `[warning] Service Worker registration blocked by Playwright`.
- **Ferramenta e método:** Inspeção do DOM capturado + download do manifest público.
- **Resultado observado:** Manifest PWA válido servido publicamente; ícones (`/icons/icon-192.png`, `/icons/apple-touch-icon.png`); tentativa de registro de Service Worker bloqueada apenas pelo ambiente de automação (Playwright), não pela aplicação.
- **Interpretação técnica:** A aplicação é projetada como **PWA instalável** (consistente com a aba "Baixar app" vista em E-003), com um Service Worker que seria registrado em um navegador real.
- **Confiança:** alta (manifest e tentativa de registro) / média (comportamento exato do Service Worker, não observado por ter sido bloqueado no ambiente de teste)
- **Limitações:** O conteúdo/estratégia de cache do Service Worker não foi investigado (bloqueado nesta captura automatizada).

---

## E-010 — Logos de canais agregados de múltiplas fontes públicas de imagem, com conteúdo misto (HTTP)

- **Data:** 2026-10-18
- **Componente investigado:** Assets visuais (ícones de canal)
- **Fonte da evidência:** Eventos de rede (domínios de imagem) e mensagens de console `Mixed Content: ... was loaded over HTTPS, but requested an insecure element 'http://...'`.
- **Ferramenta e método:** `capture_browser_scenario`, eventos de rede e console.
- **Resultado observado:** Logos vindos de `mondrian.claro.com.br` (CDN da operadora Claro), `i.imgur.com`, `raw.githubusercontent.com`, `upload.wikimedia.org`, `i.postimg.cc`, `img.faz-o-eli.online`, `www.fontedecanais.{me,org,dev,gs}`, `logos.appscms.xyz`, `24horas.cc`, entre outros. Vários desses hosts foram referenciados por URL `http://` (não `https://`), gerando avisos de "Mixed Content" no navegador (automaticamente promovidos para HTTPS pelo Chrome).
- **Interpretação técnica:** O catálogo (arquivos de texto do GitHub, ver E-004) referencia logos hospedados em uma variedade de serviços gratuitos de imagem/CDN de terceiros, sem padronização de protocolo — típico de uma lista de canais agregada manualmente/colaborativamente ao longo do tempo, onde cada entrada aponta para onde quer que o logo estivesse disponível no momento em que foi adicionada.
- **Confiança:** alta
- **Limitações:** Não foi possível confirmar se há um mecanismo de fallback para logos quebrados/indisponíveis nesta fase (ver [E-015](#e-015--fallback-de-logo-quebrado-avatar-de-iniciais--cache-de-urls-com-falha), que confirma o mecanismo na Fase 02).

---

## E-011 — Versões exatas de React, ReactDOM e Scheduler; mapa preciso de dependências entre chunks

- **Data:** 2026-10-19
- **Componente investigado:** Cadeia de dependências entre os bundles JS (Fase 02)
- **Fonte da evidência:** `research/artifacts/scripts/catalog-Y4ECXKT4.js`, `vendor-react-DYlNHYxM.js`, `vendor-C784v2VA.js`, `rolldown-runtime-hePW80VL.js`
- **Ferramenta e método:** Leitura direta dos bundles públicos (já baixados na Fase 01) com Python/grep, busca por strings de versão (`version:` seguido de literal) e por assinaturas de código-fonte conhecidas (ex.: a implementação de min-heap do pacote `scheduler` do React).
- **Resultado observado:** String literal `version:\`19.3.0\`` encontrada tanto em `catalog-Y4ECXKT4.js` quanto em `vendor-react-DYlNHYxM.js`. `vendor-C784v2VA.js` contém a implementação do pacote `scheduler` (funções de heap `unstable_scheduleCallback`/`unstable_now`, idênticas à implementação pública do pacote). `rolldown-runtime-hePW80VL.js` contém apenas helpers de interoperabilidade CJS/ESM (`__commonJS`, `__toESM`-equivalentes, export lazy-getter) gerados pelo bundler Rolldown.
- **Interpretação técnica:** Mapa de dependências confirmado: `rolldown-runtime` (helpers do bundler) ← `vendor-C784v2VA.js` (pacote `scheduler`) ← `catalog-Y4ECXKT4.js` (contém o **núcleo do React 19.3.0** embutido, além da lógica própria de catálogo/estado da aplicação) ← `vendor-react-DYlNHYxM.js` (contém **ReactDOM 19.3.0**, incluindo `createRoot`). Chunks de feature (`index`, `tv`, `player`, `PainelDeCanais`) importam React a partir de `catalog-Y4ECXKT4.js` via uma função getter compartilhada, em vez de cada chunk re-empacotar sua própria cópia — evidência de **deduplicação de dependências pelo bundler** (o React físico mora em um único chunk, reaproveitado pelos demais).
- **Confiança:** alta
- **Limitações:** Não foi possível confirmar por que o Vite/Rolldown escolheu colocar o núcleo do React especificamente dentro do chunk "catalog" em vez de um chunk `vendor-react-core` dedicado — é uma decisão de chunking automática do bundler, não documentada publicamente.

---

## E-012 — Nenhum source map publicamente disponível

- **Data:** 2026-10-19
- **Componente investigado:** Disponibilidade de source maps para os bundles JS
- **Fonte da evidência:** Requisições `GET https://saimo-tv.pages.dev/assets/<arquivo>.js.map` para múltiplos bundles.
- **Ferramenta e método:** `curl` para cada URL `.js.map` correspondente a um bundle já identificado; inspeção do `Content-Type` retornado.
- **Resultado observado:** Todas as URLs testadas retornam HTTP 200, mas com `Content-Type: text/html` e corpo idêntico ao `index.html` da SPA (não um JSON de source map). Nenhum arquivo `.js` público declara comentário `//# sourceMappingURL=`.
- **Interpretação técnica:** O Cloudflare Pages está configurado com um **fallback de SPA** (serve `index.html` para qualquer caminho não correspondente a um arquivo estático real, com status 200). Isso significa que não existem source maps publicados — qualquer leitura de código precisa trabalhar diretamente com o JavaScript minificado/buildado, sem nomes de variáveis ou caminhos de arquivo originais.
- **Confiança:** alta
- **Limitações:** Não foi testado se existe um caminho alternativo (ex.: `/_sourcemaps/`) hospedando os maps; dado o comportamento consistente de fallback, não há indício de que isso exista.

---

## E-013 — Rotas e funcionalidades adicionais não exploradas na Fase 01

- **Data:** 2026-10-19
- **Componente investigado:** Lista de chunks lazy-loaded declarada em `index-B8gNV0IZ.js` (`__vite__mapDeps`)
- **Fonte da evidência:** `research/artifacts/scripts/index-B8gNV0IZ.js`, início do arquivo (array `__vite__mapDeps`).
- **Ferramenta e método:** Leitura direta do bundle de entrada.
- **Resultado observado:** O array de dependências de chunks lista, além dos já conhecidos (`player`, `catalog`, `PainelDeCanais`, `tv`), três pares JS/CSS não observados na Fase 01: `StreamTester-BSeigufZ.js`/`.css`, `AppDownload-Fd5e3eID.js`/`.css`, `Novidades-BsXIPyU-.js`/`.css`.
- **Interpretação técnica:** Existem ao menos três telas/funcionalidades adicionais além da aba "Ao vivo": um **testador de fontes/stream** ("StreamTester" — provavelmente ligado à verificação de servidores vista em E-006), uma tela de **download do app** (ligada à aba "Baixar app"), e uma tela de **novidades/changelog** ("Novidades"). Nenhuma dessas rotas foi visitada ou capturada nesta sessão.
- **Confiança:** alta (existência dos chunks) / baixa (conteúdo e comportamento de cada tela, não observados)
- **Limitações:** Apenas os nomes dos arquivos foram observados; o conteúdo de `StreamTester`, `AppDownload` e `Novidades` não foi lido nesta fase.

---

## E-014 — Gerenciamento de estado: Context + useReducer + "stores" manuais via pub/sub, sem Zustand/Redux

- **Data:** 2026-10-19
- **Componente investigado:** Padrões de estado em `catalog-Y4ECXKT4.js`, `player-DGAgJsZy.js`, `tv-C6ATJaLp.js`, `PainelDeCanais-BclGcD97.js`
- **Fonte da evidência:** Ocorrências de `createContext` (13x) e `useContext` (34x) em `catalog-Y4ECXKT4.js`; `useReducer` (2x); função `Um(e){return Dm.add(e),()=>Dm.delete(e)}` em `player-DGAgJsZy.js` (registro de listener em um `Set`, retornando uma função de cancelamento); uso correspondente em `PainelDeCanais-BclGcD97.js`: `useState(()=>a(e.id))` seguido de `useEffect` que chama a função de subscribe e limpa no retorno.
- **Ferramenta e método:** Leitura direta dos bundles + contagem de ocorrências de padrões de hooks do React com `grep`.
- **Resultado observado:** `useSyncExternalStore` aparece apenas 2 vezes no bundle, e ambas são a própria definição do hook dentro do código-fonte do React (não uma chamada da aplicação) — ou seja, **a aplicação não usa `useSyncExternalStore` diretamente**. Em vez disso, para dados que mudam fora do ciclo de render do React (ex.: "programa atual" por canal), o padrão observado é: uma função `subscribe(callback)` que adiciona o callback a um `Set` de listeners e devolve uma função de `unsubscribe`; componentes chamam essa função dentro de um `useEffect`, atualizando seu próprio `useState` manualmente quando notificados. Nenhuma string `zustand`, `redux` ou `recoil` foi encontrada em nenhum bundle.
- **Interpretação técnica:** A aplicação usa **três camadas de estado distintas**: (1) estado local de componente via `useState`/`useReducer` puro; (2) estado compartilhado "estrutural" (ex.: lista de canais, favoritos) via **Context API + `useReducer`** do próprio React; (3) dados que mudam de forma assíncrona/externa ao React (ex.: EPG "ao vivo agora", monitoramento de fontes) via um **padrão manual de pub/sub** (um `Set` de callbacks + funções `subscribe`/`notify`), consumido pelos componentes via `useEffect` + `useState`, sem usar a API oficial `useSyncExternalStore` do React 18/19 feita exatamente para esse caso.
- **Confiança:** alta
- **Limitações:** Não foi lida a definição completa do reducer (ações/tipos) nem o Provider de Context raiz da aplicação; a afirmação "sem Zustand/Redux" baseia-se em ausência de fingerprint textual, não em leitura completa de 100% do código (os bundles de 1,5 MB como `player.js` não foram lidos integralmente).

---

## E-015 — Fallback de logo quebrado (avatar de iniciais) e cache de URLs com falha

- **Data:** 2026-10-19
- **Componente investigado:** Renderização de logos de canal em `tv-C6ATJaLp.js` (componente `F`) e `PainelDeCanais-BclGcD97.js` (componente `c`)
- **Fonte da evidência:** Função `P(e)` em `tv-C6ATJaLp.js` (gera iniciais a partir do nome do canal); `var N=new Set` + `onError:()=>{e.logo&&N.add(e.logo),n(!0)}` no mesmo arquivo; lógica equivalente (iniciais inline, sem cache de Set) em `PainelDeCanais-BclGcD97.js`.
- **Ferramenta e método:** Leitura direta dos bundles.
- **Resultado observado:** Dois componentes distintos (um na grade de EPG, outro no painel de canais) implementam, **de forma independente e ligeiramente diferente**, a mesma ideia: se `channel.logo` for vazio ou a imagem falhar ao carregar (`onError`), renderiza um "avatar" com as iniciais do nome do canal (até 2 letras, maiúsculas) em vez da imagem quebrada. No componente da grade de EPG, URLs que já falharam são guardadas em um `Set` em memória (`N`) para evitar nova tentativa de carregamento em renderizações futuras daquele mesmo logo.
- **Interpretação técnica:** Confirma e resolve a limitação registrada em [E-010](#e-010--logos-de-canais-agregados-de-múltiplas-fontes-públicas-de-imagem-com-conteúdo-misto-http): existe sim um mecanismo de fallback para logos quebrados. A duplicação da mesma lógica em dois componentes (em vez de um componente `ChannelIcon` compartilhado entre os dois chunks) é um ponto observável de possível reuso perdido — comentado na seção de qualidade (ver `02-javascript-analysis.md`).
- **Confiança:** alta
- **Limitações:** Não foi confirmado se os dois componentes (`F` e `c`) são de fato duplicados por decisão consciente (ex.: para evitar acoplar o chunk `tv` ao chunk `PainelDeCanais`) ou um descuido de desenvolvimento — isso é apenas observável como fato de código, a motivação é desconhecida.

---

## E-016 — Lista canônica de categorias revela seções não observadas (Pluto TV, Internacionais, Adulto) e lista de canais de fallback embutida no bundle

- **Data:** 2026-10-19
- **Componente investigado:** Array de ordenação de categorias e dados de canais embutidos em `player-DGAgJsZy.js`
- **Fonte da evidência:** Variável local (minificada) com valor `["TV Aberta","Filmes","Series","Esportes","Noticias","Infantil","Documentarios","Entretenimento","Pluto TV","24 Horas","Internacionais","Adulto",...]` em `player-DGAgJsZy.js`, seguida de um array de objetos de canal literais (`category:`, `logo:` etc.) e de uma operação `.filter(e=>e.category!=="Adulto")` aplicada sobre a lista completa para gerar uma variante filtrada.
- **Ferramenta e método:** Leitura direta do bundle (busca textual pela definição da variável usada como ordenação de categorias, já identificada por importação cruzada a partir de `PainelDeCanais-BclGcD97.js`).
- **Resultado observado:** Três categorias não visíveis no screenshot da Fase 01 (que mostrava só o início da lista de pílulas, cortado pela largura da tela): **"Pluto TV"** (categoria dedicada aos canais da Pluto TV, cujo EPG é tratado separadamente — ver E-005), **"Internacionais"**, e **"Adulto"**. Também foi encontrado um array de objetos de canal (nome, categoria, logo) **embutido literalmente no bundle**, não buscado via rede — funcionando como lista semente/fallback.
- **Interpretação técnica:** O catálogo tem mais categorias de conteúdo do que o observado inicialmente, incluindo uma categoria de conteúdo adulto — com ao menos um ponto do código que filtra essa categoria para gerar uma lista "segura" (`Jp`) separada da lista completa (`qp`). Além disso, a aplicação **não depende exclusivamente** do fetch ao GitHub (E-004) para ter uma lista de canais: há uma lista embutida no próprio bundle, provavelmente usada como semente inicial ou fallback caso o fetch externo falhe.
- **Confiança:** alta (existência da categoria "Adulto" e do filtro) / média (se a lista embutida é de fato usada como fallback em caso de falha de rede, ou serve a outro propósito, como um conjunto "padrão" pré-catálogo-dinâmico)
- **Limitações:** Não foi investigado em qual contexto exato a lista completa (`qp`) vs. a filtrada (`Jp`) vs. outra variante (`Yp`) são usadas (ex.: se a filtragem de "Adulto" é controlada por um ajuste de usuário/parental control, ou é incondicional em algum fluxo específico). Isso não foi testado ativamente — apenas observado no código estático.

---

## E-017 — Inventário de chaves de `localStorage` revela funcionalidades não documentadas

- **Data:** 2026-10-19
- **Componente investigado:** Todas as strings compatíveis com nomes de chave de `localStorage` nos bundles JS públicos
- **Fonte da evidência:** `grep` por padrão `saimo-[a-zA-Z0-9_-]+` em todos os arquivos de `research/artifacts/scripts/`.
- **Ferramenta e método:** Busca textual direta nos bundles já baixados.
- **Resultado observado:** Além das 3 chaves já registradas em [E-008](#e-008--persistência-exclusivamente-em-localstorage-sem-cookies), foram encontradas: `saimo-ao-iniciar`, `saimo-buscas-recentes`, `saimo-canais-personalizados` / `-mudou`, `saimo-continuar`, `saimo-dev`, `saimo-entrada`, `saimo-epg-v3` a `saimo-epg-v6`, `saimo-monitor`, `saimo-radios-lista`, `saimo-radios-recentes`, `saimo-sem-cors`, `saimo-tv-canais`, `saimo-tv-favoritos`, `saimo-tv-todos-canais`, `saimo-upscale-4k`, `saimo-upscale-hd`, `saimo-upscaling` / `-mudou`, `saimo-vod-favoritos` / `-mudou`.
- **Interpretação técnica:** Revela funcionalidades inteiras não exploradas na Fase 01: canais personalizados adicionados pelo usuário, histórico de "continuar assistindo", modo de desenvolvedor (`saimo-dev`), lista de domínios que **não** precisam do proxy CORS (`saimo-sem-cors` — complementa o mecanismo de E-005), favoritos **separados** para TV ao vivo (`saimo-tv-favoritos`) e VOD (`saimo-vod-favoritos`), preferências de nitidez/upscaling (ligadas aos filtros SVG vistos na Fase 01), e **evolução de schema do cache de EPG** (chaves de `v3` a `v6` sugerem pelo menos 4 migrações de formato ao longo do tempo). O padrão recorrente de uma chave de dado + uma chave `-mudou` irmã (ex.: `saimo-vod-favoritos-mudou`) sugere um mecanismo caseiro de notificação de mudança entre partes da aplicação (possivelmente lido via evento `storage` do navegador para sincronizar entre abas, ou apenas como um "dirty flag" interno).
- **Confiança:** alta (existência das chaves como strings no código) / baixa (o propósito exato de cada uma é inferido pelo nome, não confirmado por leitura do código que as usa em todos os casos)
- **Limitações:** Nem toda chave teve seu código de leitura/escrita efetivamente localizado e lido; a interpretação de várias delas é baseada no nome da chave (alta legibilidade em português ajuda, mas não é confirmação de comportamento).
