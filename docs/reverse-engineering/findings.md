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

---

## E-018 — Seleção de engine de reprodução: três motores distintos, escolhidos por teste de URL

- **Data:** 2026-10-19
- **Componente investigado:** Lógica de decisão de qual biblioteca de streaming usar, em `player-DGAgJsZy.js`
- **Fonte da evidência:** Funções `tp(e)`, `np(e)`, `rp(e)`, `ip(e)` em `player-DGAgJsZy.js` (detectores de formato/roteamento), e o bloco de orquestração que as consome (`if(tp(i.url))...else if(rp(i.url)&&mpegts.isSupported())...else if(hls.isSupported())...`).
- **Ferramenta e método:** Leitura direta do bundle público já baixado (`research/artifacts/scripts/player-DGAgJsZy.js`), busca por métodos característicos de API (`isSupported`, `loadSource`, `attachMedia`, `createPlayer`) para localizar os pontos de orquestração da aplicação (distintos do código interno das próprias bibliotecas).
- **Resultado observado:**
  - `tp(e)` → `e.toLowerCase().includes(".mpd")` (detecta **DASH**).
  - `np(e)` → URL (sem query string) contém `.m3u8`, OU termina em `.txt`, OU contém o domínio `dadinhodetapioca.fun` (detecta **HLS**, usado nos players de rádio/VOD).
  - `rp(e)` → regex `/\.ts(\?|$)/i` (detecta **MPEG-TS/FLV cru**, usado pelo `mpegts.js`).
  - No fluxo de TV ao vivo, a ordem de decisão observada é: **DASH** (se `.mpd`) → **mpegts.js** (se `.ts` e suportado) → **hls.js** (caso contrário, usado como padrão/catch-all).
- **Interpretação técnica:** A aplicação **não depende de um único player**: escolhe dinamicamente entre três motores de reprodução conforme um teste simples sobre a extensão/domínio da URL do stream (não por metadado explícito de "tipo" no catálogo, nem por tentativa-e-erro sequencial entre engines). Isso **resolve a Questão Q-002** registrada na Fase 01.
- **Confiança:** alta
- **Limitações:** Não foi possível observar, em runtime, qual URL de stream um canal real específico possui — a lógica de decisão foi confirmada por leitura de código, não por reprodução real de um canal (decisão deliberada, ver seção de metodologia da Fase 03).

---

## E-019 — Proxy de mídia reutiliza o mesmo endpoint `/api/proxy` do EPG, com encaminhamento opcional de Referer/User-Agent

- **Data:** 2026-10-19
- **Componente investigado:** Roteamento de URLs de stream através do proxy server-side
- **Fonte da evidência:** Funções `ip(e)`, `ap()`, `op(e)` em `player-DGAgJsZy.js`.
- **Ferramenta e método:** Leitura direta do bundle.
- **Resultado observado:** `ip(e)` retorna verdadeiro se a URL da fonte começa com `http://` (não `https://`), OU termina em `.txt`, OU contém o domínio `dadinhodetapioca.fun`. Quando verdadeiro, `op(e)` reescreve a URL para `${origem}/api/proxy?url=<url codificada>`, acrescentando `&referer=` e `&ua=` (user-agent) quando a fonte os especifica.
- **Interpretação técnica:** O mesmo endpoint de proxy identificado na Fase 01 para contornar CORS ao buscar o EPG de `guiadetv.com` ([E-005](#e-005--epg-agregado-de-quatro-fontes-públicas-processado-em-web-worker-dedicado)) é **reutilizado para entregar o próprio stream de vídeo** quando a fonte é insegura (HTTP puro) ou usa convenções não padrão (extensão `.txt` disfarçada, domínio específico). O encaminhamento de `Referer`/`User-Agent` sugere que algumas fontes de stream exigem esses cabeçalhos para liberar o acesso (uma prática comum de "hotlink protection" em servidores de origem).
- **Confiança:** alta
- **Limitações:** Não foi investigado o comportamento do endpoint `/api/proxy` do lado do servidor para mídia (ex.: se ele faz streaming/proxy byte a byte ou buffering completo) — isso exigiria testar com uma reprodução real, o que não foi feito nesta fase.

---

## E-020 — Sistema de recuperação de falhas com múltiplas fontes por canal, watchdogs de congelamento e proteção contra condição de corrida

- **Data:** 2026-10-19
- **Componente investigado:** Hook/função de inicialização do player de TV ao vivo em `player-DGAgJsZy.js`
- **Fonte da evidência:** Bloco de código em torno das variáveis locais (minificadas) `ke` (lista de fontes do canal, via `useMemo`), `Ae`/`je` (índice da fonte atual e seu setter), `Oe` (contador de erros de rede, via `useRef`), `u` (flag de cancelamento), `d`/`f`/`p` (flags e timestamps de progresso de reprodução), funções `T` (troca de fonte), `O` (decide recuperar ou trocar), `w` (destrói todos os engines).
- **Ferramenta e método:** Leitura direta e contextualizada do bundle, acompanhando o fluxo de variáveis entre as diferentes seções do código.
- **Resultado observado:**
  - Um canal pode ter **múltiplas fontes alternativas** (`channel.sources: [...]`), montadas em uma lista `ke` via `useMemo`.
  - Um `setTimeout` de **12 segundos** dispara um aviso ("sem imagem em 12 s") se nenhum frame novo tiver sido exibido ainda.
  - Um `setInterval` a cada **2 segundos** verifica se `video.currentTime` avançou nos últimos **25 segundos** (ignorando o caso em que o usuário pausou manualmente); se não avançou, trata como "imagem parada".
  - Ao detectar um problema, a função `O` decide: se o vídeo **já tocou alguma vez** e o travamento é recente, tenta **recuperar sem trocar de fonte** (chama uma função de "retomar" específica do engine ativo, ex. recarregar o `mpegts.js`); caso contrário, chama `T`, que **avança para a próxima fonte da lista** (`ke[Ae+1]`) e tenta novamente; se todas as fontes se esgotarem, exibe "Erro ao carregar o canal. Tente novamente." e registra telemetria de esgotamento.
  - Uma flag booleana `u` (fechada sobre o escopo do efeito) é checada em todos os callbacks assíncronos (`T`, `O`, `j`/autoplay) antes de agir — um **guard de condição de corrida**: ao trocar de canal novamente antes de uma tentativa anterior terminar (ex.: o `.then()` de uma inicialização DASH assíncrona), essa flag evita que a tentativa antiga interfira no novo canal já selecionado.
  - Antes de criar qualquer novo player, a função `w()` destrói defensivamente **as três instâncias possíveis** (DASH/mpegts/hls.js), evitando dois players tocando simultaneamente.
  - Reprodução automática tenta tocar com som; se o navegador bloquear (política de autoplay), ativa modo mudo e tenta novamente.
- **Interpretação técnica:** Este é um sistema de recuperação de reprodução bastante maduro — combina múltiplas fontes de fallback por canal, dois watchdogs de tempo (inicial e de congelamento contínuo) e um guard explícito contra condições de corrida na troca rápida de canais, respondendo diretamente às perguntas da Seção 3/5 da Fase 03.
- **Confiança:** alta
- **Limitações:** Os nomes de função/variável são inferidos por comportamento (minificados); a leitura não cobriu a função `T`/`O` sendo de fato executada em runtime (não houve reprodução real).

---

## E-021 — Shaka Player (terceiro motor) usado para DASH, com suporte a DRM ClearKey — carregado sob demanda

- **Data:** 2026-10-19
- **Componente investigado:** Suporte a MPEG-DASH em `player-DGAgJsZy.js`
- **Fonte da evidência:** Função `Xg(e,t,n,r)` em `player-DGAgJsZy.js`, que faz `import('./vendor-shaka-Csozrona.js')` dinamicamente.
- **Ferramenta e método:** Leitura direta do bundle; localização do array `__vite__mapDeps` local de `player-DGAgJsZy.js`, que lista `vendor-shaka-*.js` como dependência lazy.
- **Resultado observado:** Ao detectar uma URL `.mpd` (DASH), a aplicação importa dinamicamente um chunk separado contendo o **Shaka Player** (biblioteca de streaming do Google), instala seus polyfills (`polyfill.installAll()`), verifica suporte do navegador (`Player.isBrowserSupported()`), anexa ao elemento de vídeo, e — se a fonte tiver os campos `keyId`/`key` — configura DRM: `a.configure({drm:{clearKeys:{[keyId]:key}}})` (**ClearKey DRM**, um esquema simples de DRM baseado em chave simétrica exposta ao cliente, suportado nativamente pela Encrypted Media Extensions do navegador).
- **Interpretação técnica:** Corrige e detalha o registro da Fase 01 ([E-007](#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos)), que já havia notado a string `shaka` no bundle sem elaborar: trata-se de um **terceiro motor de reprodução**, carregado **sob demanda** (não embutido no bundle principal do player, só baixado quando um canal DASH é de fato selecionado) — o que explica por que o fingerprint de Fase 01 só encontrou a palavra "shaka" como referência textual (o import dinâmico), não o código da biblioteca em si. O suporte a ClearKey confirma que **a aplicação foi projetada para lidar com fontes DRM-protegidas**, quando o catálogo fornecer as chaves correspondentes.
- **Confiança:** alta
- **Limitações:** Por decisão deliberada (regras do laboratório — não contornar DRM, não investigar mecanismos de proteção), **não foi investigado se algum canal atualmente ativo no catálogo realmente usa DRM**, nem foi buscada a origem/formato de eventuais chaves reais. Esta entrada documenta apenas a **capacidade do código**, não seu uso real observado.

---

## E-022 — Formato do catálogo de fontes por canal (parcialmente resolve Q-001) + suporte a playlists M3U/M3U8 padrão como entrada alternativa

- **Data:** 2026-10-19
- **Componente investigado:** Parser de texto do catálogo em `player-DGAgJsZy.js`
- **Fonte da evidência:** Função de parsing com `switch` sobre palavras-chave em português (`fonte`, `referer`, `nome`, `qualidade`, `agente`, `chave`), e uma segunda função `am(e)` que reconhece `#EXTM3U`/`#EXTINF:` com atributos `tvg-id`, `tvg-logo`, `group-title`.
- **Ferramenta e método:** Leitura direta do bundle.
- **Resultado observado:** O parser de catálogo próprio da aplicação interpreta, por canal, linhas chave-valor com os rótulos (em português): `fonte` (adiciona uma nova URL à lista de fontes do canal), `referer`, `nome`, `qualidade`, `agente` (user-agent), e `chave` (no formato `keyId:key`, associada à última fonte adicionada — usada para DRM ClearKey, ver [E-021](#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda); entradas malformadas são descartadas). Separadamente, existe uma função `am(e)` que reconhece o **formato de playlist M3U/M3U8 padrão da indústria de IPTV** (diretivas `#EXTM3U`/`#EXTINF:`, atributos `tvg-id`/`tvg-logo`/`group-title`), sugerindo suporte a importar listas de canais nesse formato amplamente usado (fora do formato próprio da aplicação).
- **Interpretação técnica:** Resolve parcialmente [Q-001](./questions.md): o catálogo próprio do Saimo TV usa um **formato de texto chave-valor próprio**, por linha, com rótulos em português — não é CSV nem JSON. Adicionalmente, a aplicação sabe interpretar **playlists M3U/M3U8 convencionais** (o formato-padrão usado por praticamente todo software/lista de IPTV), o que provavelmente serve tanto para importar fontes de terceiros quanto para a funcionalidade de "canais personalizados" identificada na Fase 02 ([E-017](#e-017--inventário-de-chaves-de-localstorage-revela-funcionalidades-não-documentadas), chave `saimo-canais-personalizados`).
- **Confiança:** alta (estrutura do parser) / média (não foi lido o conteúdo real de `canais.txt`/`catalogo.txt` para confirmar que eles de fato usam este formato — apenas o código que os parseia)
- **Limitações:** Não foi feita a leitura do conteúdo real dos arquivos do GitHub nesta fase (ver Q-001 em `questions.md`, ainda parcialmente aberta).

---

## E-023 — Mecanismo de controle de acesso para conteúdo "Adulto"

- **Data:** 2026-10-19
- **Componente investigado:** Context React relacionado à categoria "Adulto" (ver [E-016](#e-016--lista-canônica-de-categorias-revela-seções-não-observadas-pluto-tv-internacionais-adulto-e-lista-de-canais-de-fallback-embutida-no-bundle) da Fase 02)
- **Fonte da evidência:** `player-DGAgJsZy.js`: `createContext({isAdultUnlocked:false, unlockAdult:()=>{}, lockAdult:()=>{}})` e um hook de acesso `useContext` correspondente.
- **Ferramenta e método:** Leitura direta do bundle.
- **Resultado observado:** Existe um Context React dedicado com um booleano `isAdultUnlocked` e duas funções `unlockAdult`/`lockAdult`, expostos via um hook customizado.
- **Interpretação técnica:** Confirma e detalha a hipótese levantada na Fase 02 sobre a categoria "Adulto": existe, de fato, um **mecanismo de controle de acesso** (gate) para esse conteúdo, controlado por estado em memória. O mecanismo de "desbloqueio" em si (PIN? confirmação simples? persistido em algum lugar?) não foi localizado nesta leitura.
- **Confiança:** alta (existência do Context) / baixa (mecanismo real de desbloqueio)
- **Limitações:** Por ser um mecanismo de controle de acesso, nenhuma tentativa foi feita de acionar, contornar ou testar esse gate, conforme as regras do laboratório.

---

## E-024 — Eventos de mídia HTML5 efetivamente escutados pela aplicação

- **Data:** 2026-10-19
- **Componente investigado:** `addEventListener` sobre o elemento `<video>` em `player-DGAgJsZy.js`
- **Fonte da evidência:** Ocorrências literais de `addEventListener(` com nomes de evento nativos do elemento de mídia HTML5.
- **Ferramenta e método:** Busca textual direta no bundle por `addEventListener(\`<evento>\`` para cada evento candidato da especificação HTML5 Media.
- **Resultado observado:** Confirmados como escutados pela aplicação: `loadedmetadata`, `canplay`, `playing`, `pause`, `waiting`, `stalled`, `error`, `ended`, `timeupdate`, `progress`, `seeking`, `durationchange`. **Não encontrados** como listener explícito: `loadstart`, `volumechange` (podem ocorrer no navegador, mas a aplicação não parece reagir a eles diretamente via `addEventListener`).
- **Interpretação técnica:** A aplicação constrói parte de sua própria lógica de recuperação de falhas (E-020) por cima do evento `timeupdate` (detecta progresso real de reprodução) em vez de confiar inteiramente nos eventos nativos `waiting`/`stalled` do navegador — uma escolha de engenharia defensiva, já que esses eventos nativos nem sempre dispara de forma consistente entre navegadores/engines para streams ao vivo.
- **Confiança:** alta
- **Limitações:** Ausência de `loadstart`/`volumechange` como string literal não prova definitivamente que não são usados em nenhum lugar (poderiam estar atrás de outra forma de registro, ex. propriedade `onvolumechange` em vez de `addEventListener`) — registrado como "não confirmado", não como "confirmado ausente".

---

## E-025 — Nenhuma evidência de WebRTC

- **Data:** 2026-10-19
- **Componente investigado:** `player-DGAgJsZy.js` (bundle completo)
- **Fonte da evidência:** Busca textual por `RTCPeerConnection`, `getUserMedia`, `webrtc`.
- **Ferramenta e método:** `grep` sobre o bundle completo.
- **Resultado observado:** Nenhuma ocorrência.
- **Interpretação técnica:** Não há evidência de que a aplicação utilize WebRTC para reprodução (o que seria incomum para IPTV/broadcast ao vivo tradicional — WebRTC é mais comum em chamadas/conferências ou streaming de ultrabaixa latência ponto-a-ponto). Reforça que os três motores de reprodução identificados (DASH/Shaka, mpegts.js, hls.js) são de fato a totalidade dos mecanismos de mídia da aplicação.
- **Confiança:** alta (para o arquivo investigado) / média (não se pode descartar 100% o uso em algum chunk não lido, como `StreamTester` ou `AppDownload`)
- **Limitações:** Apenas `player-DGAgJsZy.js` foi verificado; os chunks `StreamTester`/`AppDownload`/`Novidades` (E-013) não foram lidos.

---

## E-026 — Política de autoplay com fallback para mudo, e volume persistido

- **Data:** 2026-10-19
- **Componente investigado:** Função de início de reprodução (`j` no trecho analisado) em `player-DGAgJsZy.js`
- **Fonte da evidência:** `video.play().catch(()=>{video.muted=true; ...; video.play().catch(()=>{})})`, e leitura de um valor de volume de uma ref (`M.current`) aplicada antes do `play()`.
- **Ferramenta e método:** Leitura direta do bundle.
- **Resultado observado:** A aplicação tenta reproduzir com som; se o navegador bloquear (política de autoplay, comum em `Chrome`/`Safari` para mídia não iniciada por gesto do usuário), ativa `muted=true` e tenta novamente; se ainda assim falhar, desiste silenciosamente (sem erro visível ao usuário). O volume aplicado antes de tocar vem de uma referência em memória, consistente com a chave `tv-volume` de `localStorage` já identificada na Fase 01 ([E-008](#e-008--persistência-exclusivamente-em-localstorage-sem-cookies)).
- **Interpretação técnica:** Tratamento padrão e correto da política de autoplay dos navegadores modernos (que só permitem autoplay com som após interação do usuário com o domínio, ou se o conteúdo já estiver mudo).
- **Confiança:** alta
- **Limitações:** Não foi confirmado, por leitura direta, que `M.current` é de fato populado a partir do `localStorage["tv-volume"]` (inferência por nome/consistência com E-008, não leitura do trecho exato que inicializa essa ref).

---

## E-027 — Service Worker público lido por completo: estratégia de cache "app shell" (resolve Q-006)

- **Data:** 2026-10-19
- **Componente investigado:** `sw.js`, servido publicamente em `https://saimo-tv.pages.dev/sw.js`
- **Fonte da evidência:** `research/artifacts/scripts/sw.js` (1,7 KB, **não minificado**, com comentários originais do desenvolvedor em português)
- **Ferramenta e método:** `curl` para descobrir e baixar o arquivo (testado em caminho convencional `/sw.js`; confirmado como arquivo real via `Content-Type: application/javascript` e `Cache-Control: public, max-age=0, must-revalidate`, diferente do fallback de SPA visto em E-012, que retorna `text/html`).
- **Resultado observado:** O Service Worker usa uma cache nomeada `saimo-casca-v1` ("casca" = "shell"). No evento `install`, pré-cacheia apenas `/`, `/index.html`, `/manifest.webmanifest`, `/favicon.png`, `/icons/icon-192.png`. No evento `activate`, apaga caches de versões antigas (por nome) e assume clientes imediatamente (`skipWaiting`/`clients.claim`). No evento `fetch`: (1) ignora requisições não-GET e de origem cruzada; (2) ignora explicitamente qualquer caminho iniciado por `/api/`; (3) para navegação (`mode: "navigate"`), usa **network-first com fallback para cache** (busca da rede, atualiza o cache, mas serve do cache se offline); (4) para assets com hash no nome (`/assets/`, `/icons/`, extensões `.js`/`.css`/`.png`/`.svg`/`.woff2`), usa **cache-first** (serve do cache se existir, senão busca da rede e cacheia).
- **Interpretação técnica:** **Resolve integralmente a Questão Q-006.** O próprio comentário do desenvolvedor no topo do arquivo explica a motivação: *"Nada de vídeo, playlist, catálogo ou API: esses sempre vêm da rede — uma lista de canais velha em cache seria pior que nenhuma."* — uma escolha de arquitetura deliberada e bem fundamentada: o Service Worker cobre apenas o "shell" do app (HTML/JS/CSS/ícones, cacheável com segurança graças aos hashes de conteúdo nos nomes dos arquivos), e explicitamente **nunca** cacheia API, catálogo ou mídia, que mudam com frequência e cujo cache desatualizado seria pior do que não ter cache.
- **Confiança:** alta (código público, completo e não minificado)
- **Limitações:** Nenhuma relevante — esta é uma das evidências mais completas e diretas de todo o laboratório até agora.

---

## E-028 — Nenhuma evidência de uso de IndexedDB

- **Data:** 2026-10-19
- **Componente investigado:** Todos os bundles JS já baixados (`index`, `catalog`, `player`, `tv`, `PainelDeCanais`, `epgWorker`, `vendor*`)
- **Fonte da evidência:** Busca textual por `indexedDB`, `openDatabase`, `IDBKeyRange`, `idb-keyval`.
- **Ferramenta e método:** `grep` sobre todos os arquivos `.js` já baixados.
- **Resultado observado:** Nenhuma ocorrência em nenhum arquivo.
- **Interpretação técnica:** Toda a persistência client-side observada até agora usa exclusivamente `localStorage` (E-008, E-017) e, para arquivos estáticos, a `Cache Storage API` via Service Worker (E-027) — não há uso de IndexedDB.
- **Confiança:** alta (para os arquivos lidos) / média (chunks não lidos como `StreamTester`/`AppDownload`/`Novidades` continuam não verificados)
- **Limitações:** Mesma limitação de E-013/E-025 — três chunks nunca foram lidos.

---

## E-029 — Integração com a API pública do TMDB (The Movie Database) para metadados de VOD, incluindo chave de API hardcoded no bundle

- **Data:** 2026-10-19
- **Componente investigado:** Seção de VOD (filmes/séries) em `catalog-Y4ECXKT4.js`
- **Fonte da evidência:** Constantes `jn=\`https://api.themoviedb.org/3\`` e uma string de 32 caracteres hexadecimais atribuída à variável imediatamente anterior (identificada como uma chave de API v3 do TMDB pelo padrão), função `Mn(caminho, tamanho="w342")` que monta URLs `https://image.tmdb.org/t/p/<tamanho><caminho>`, e função `Nn` que extrai classificação indicativa brasileira (`content_ratings`/`release_dates`, filtrando `iso_3166_1 === "BR"`).
- **Ferramenta e método:** Leitura direta do bundle já baixado.
- **Resultado observado:** A aplicação consulta a API pública do TMDB para obter metadados de filmes/séries (pôsteres via `image.tmdb.org`, classificação indicativa brasileira), usando uma chave de API **incorporada diretamente no bundle JavaScript público** (valor omitido deste relatório por ser, tecnicamente, uma credencial — ainda que de uma API com uso client-side historicamente comum).
- **Interpretação técnica:** Confirma que os metadados de VOD (pôsteres, classificação etária) não vêm do catálogo próprio em texto (que, por E-022, parece focado em fontes de stream), mas de uma integração com uma API de terceiros de catálogo de filmes amplamente usada na indústria. O uso de uma chave client-side é uma prática comum para a API v3 do TMDB (historicamente pensada para uso em aplicações públicas, com rate-limit por chave), mas ainda assim representa uma **credencial exposta no código-fonte público** — uma consideração arquitetural relevante (ver Seção 8 da Fase 04 sobre segurança em uma API própria).
- **Confiança:** alta
- **Limitações:** Não foi testada a chamada real à API (nenhuma requisição foi feita) — apenas o código que a construiria foi lido. O valor da chave foi deliberadamente omitido deste registro.

---

## E-030 — Integração com a API pública da ESPN para a aba "Eventos" (esportes)

- **Data:** 2026-10-19
- **Componente investigado:** Função de agregação de eventos esportivos em `index-B8gNV0IZ.js`
- **Fonte da evidência:** Função `Be()` que faz `Promise.all` combinando chamadas a `Pe(ke)`, `Pe(Ae)` e, para cada item de um array `je` de ~15+ códigos de liga, uma chamada a `https://site.api.espn.com/apis/site/v2/sports/<liga>/scoreboard`. `je` contém códigos como `soccer/bra.1` (Brasileirão Série A), `soccer/bra.2`, `soccer/bra.copa_do_brazil`, `soccer/conmebol.libertadores`, `soccer/conmebol.sudamericana`, `soccer/uefa.champions`, `soccer/uefa.europa`, e ligas nacionais (Inglaterra, Espanha, Itália, Alemanha, França, entre outras).
- **Ferramenta e método:** Leitura direta do bundle já baixado.
- **Resultado observado:** A aba "Eventos" (não explorada visualmente desde a Fase 01, ver Q-004) é alimentada, ao menos em parte, pela **API pública e gratuita de scoreboard da ESPN**, consultando múltiplas competições de futebol simultaneamente.
- **Interpretação técnica:** Resolve parcialmente a Q-004: a aba "Eventos" mostra partidas/eventos esportivos (futebol, majoritariamente), agregados de uma API de terceiros bem conhecida e publicamente documentada (não oficialmente, mas amplamente usada pela comunidade de desenvolvedores).
- **Confiança:** alta (chamada à API, lista de ligas) / média (como os dados são exibidos na UI, não observado visualmente)
- **Limitações:** Nenhuma requisição real foi feita; apenas o código foi lido. O conteúdo exibido na aba "Eventos" não foi visualmente confirmado.

---

## E-031 — Legendas de VOD via addon comunitário do Stremio (OpenSubtitles)

- **Data:** 2026-10-19
- **Componente investigado:** Seção de VOD em `player-DGAgJsZy.js`
- **Fonte da evidência:** Constante `ig=\`https://opensubtitles-v3.strem.io/subtitles\`` e um array de configuração de idiomas (`pob` = Português do Brasil, `por` = Português de Portugal, cada um com um "limite" de resultados).
- **Ferramenta e método:** Leitura direta do bundle já baixado.
- **Resultado observado:** A aplicação busca legendas para conteúdo VOD através do **addon comunitário de OpenSubtitles do ecossistema Stremio** (um serviço público de terceiros, não a API oficial paga do OpenSubtitles), priorizando português brasileiro.
- **Interpretação técnica:** Mais uma integração com um serviço público gratuito do ecossistema de mídia/streaming open-source, consistente com o padrão já observado (EPG, catálogo) de agregar serviços de terceiros gratuitos em vez de construir infraestrutura própria para cada necessidade.
- **Confiança:** alta
- **Limitações:** Nenhuma requisição real foi feita.

---

## E-032 — Dois endpoints de backend adicionais descobertos: `/api/events` (próprio) e `/v1/eventos` (Worker de monitoramento)

- **Data:** 2026-10-19
- **Componente investigado:** Mesma função `Be()` de E-030
- **Fonte da evidência:** Constantes `ke=\`/api/events\`` e `Ae=\`https://saimo-monitor.gabrielsaimo68.workers.dev/v1/eventos\`` em `index-B8gNV0IZ.js`, consultadas via `Pe()` (função de fetch, não detalhada) em paralelo com as chamadas à ESPN (E-030).
- **Ferramenta e método:** Leitura direta do bundle já baixado.
- **Resultado observado:** Além de `/api/proxy` (E-005, E-019) já conhecido, existe um **segundo endpoint próprio** `/api/events` (outra função do Cloudflare Pages, mesmo domínio `saimo-tv.pages.dev`). Além disso, o Worker de monitoramento `saimo-monitor.gabrielsaimo68.workers.dev` (E-006) expõe **mais um caminho**, `/v1/eventos`, além de `/v1/fontes` e `/v1/hello` já conhecidos.
- **Interpretação técnica:** O backend próprio da aplicação é mais extenso do que o mapeado até a Fase 01: tem ao menos duas Pages Functions (`/api/proxy`, `/api/events`) e o Worker de monitoramento tem ao menos três rotas (`/v1/hello`, `/v1/fontes`, `/v1/eventos`) — sugerindo que esse Worker não é só um "monitor de fontes de stream", mas um **backend de suporte mais genérico** para a aplicação, cobrindo também dados de eventos esportivos.
- **Confiança:** alta (existência dos caminhos) / baixa (o que cada endpoint retorna exatamente — não observado)
- **Limitações:** Nenhuma requisição real foi feita a nenhum dos dois novos endpoints.

---

## E-033 — Correção/detalhamento de E-006: `/v1/hello` é chamado via **POST** com corpo, não GET

- **Data:** 2026-10-19
- **Componente investigado:** Requisição real capturada na Fase 01 (`research/artifacts/capture-01-full.json`), reexaminada nesta fase
- **Fonte da evidência:** Evento de rede `{"method":"POST","url":".../v1/hello", header_names: [...,"content-type",...]}` dentro da captura já salva da Fase 01.
- **Ferramenta e método:** Reanálise (via `jq`) de uma captura de rede já realizada — **nenhuma nova requisição foi feita**.
- **Resultado observado:** Ao contrário do que E-006 descrevia (que não especificava o método), a única requisição a `/v1/hello` observada na captura da Fase 01 é um **POST**, com cabeçalho `content-type` presente (indicando corpo de requisição).
- **Interpretação técnica:** **Correção a E-006**: `/v1/hello` não é um simples healthcheck GET — é mais provavelmente um "check-in"/heartbeat de telemetria que envia algum payload (possivelmente incluindo o `saimo-telemetria-id` de E-008, mas isso não foi confirmado). O registro original (E-006) permanece no histórico; esta entrada o complementa.
- **Confiança:** alta (método HTTP observado diretamente) / baixa (conteúdo do corpo da requisição, não capturado)
- **Limitações:** O corpo da requisição POST não foi capturado (a Fase 01 não ativou `request_body: true` na captura de rede).

---

## E-034 — Dezenas de domínios de origem de stream embutidos na lista de fallback (categorias de infraestrutura observadas, sem enumeração)

- **Data:** 2026-10-19
- **Componente investigado:** Lista de canais de fallback embutida em `player-DGAgJsZy.js` (já identificada em [E-016](#e-016--lista-canônica-de-categorias-revela-seções-não-observadas-pluto-tv-internacionais-adulto-e-lista-de-canais-de-fallback-embutida-no-bundle))
- **Fonte da evidência:** Varredura de todos os bundles por padrões de URL (`https?://<host>`).
- **Ferramenta e método:** `grep`/regex em Python sobre os bundles já baixados.
- **Resultado observado:** Dezenas de domínios distintos de origem de stream aparecem na lista embutida, correspondendo a **padrões de infraestrutura de streaming reconhecíveis**: CDNs comerciais consolidadas (ex.: domínios `*.akamaized.net` — Akamai; `*.cloudfront.net` — AWS CloudFront), plataformas de distribuição de canais ao vivo (ex.: domínios `*.amagi.tv` — Amagi Cloud, usada por emissoras reais para distribuição OTT), e servidores de streaming self-hosted comuns em infraestrutura de IPTV comunitária (ex.: domínios contendo `streamlock.net`, característico do Wowza Streaming Engine).
- **Interpretação técnica:** Confirma, em nível de infraestrutura, o padrão já visto em outras camadas (catálogo, EPG, logos): a aplicação **agrega fontes heterogêneas de terceiros** — de CDNs comerciais legítimas a servidores de streaming operados por terceiros desconhecidos — sem padronização.
- **Confiança:** alta (padrões de domínio observados) / não aplicável (identidade/legitimidade de cada fonte individual, fora do escopo)
- **Limitações:** **Deliberadamente, esta entrada não lista os domínios individuais** nem URLs completas de stream, por estarem fora do escopo ético do laboratório (regras do projeto sobre não enumerar/divulgar endpoints de streaming e não reproduzir conteúdo de terceiros). Apenas padrões/categorias de infraestrutura são registrados.

---

# Verificação cruzada com o código-fonte público (gabrielsaimo/Saimo-TV)

A partir daqui, as descobertas foram obtidas ou confirmadas lendo diretamente o **repositório de código-fonte oficial do Saimo TV**, identificado publicamente pelo usuário. Isso eleva a confiança de boa parte do trabalho de engenharia reversa das Fases 01-04 (que trabalhou só com JavaScript minificado, sem nomes originais) para "fato verificado por leitura do código-fonte original" — e, em alguns pontos, **corrige** inferências anteriores. Conforme o histórico do laboratório, nenhum registro anterior foi apagado; as correções aparecem como novas entradas.

**Nota de direitos autorais:** o repositório não tem licença declarada (`license: None` na API do GitHub), portanto é **"todos os direitos reservados"** por padrão — pode ser lido e citado para fins de pesquisa/documentação, mas não copiado para uma nova implementação (consistente com `AGENTS.md`, item 14). As entradas abaixo descrevem comportamento e estrutura em texto próprio, citando apenas fragmentos curtos de identificação (nomes de arquivo, de função, de constante), nunca trechos extensos de código.

## E-035 — Repositório fonte oficial identificado e verificado: `github.com/gabrielsaimo/Saimo-TV`

- **Data:** 2026-10-19
- **Componente investigado:** Metadados e estrutura geral do repositório
- **Fonte da evidência:** API pública do GitHub (`api.github.com/repos/gabrielsaimo/Saimo-TV`) e árvore de arquivos (`git/trees/main?recursive=1`)
- **Ferramenta e método:** `curl` contra a API pública do GitHub (sem autenticação)
- **Resultado observado:** Repositório público, 49 estrelas, 8 forks, sem licença declarada, `homepage` = `https://saimo-tv.pages.dev` (confirma ser o repositório do alvo). README lista aplicativos irmãos: `SaimoTV-Android`, `Saimo-Cell-V2` (celular), `SaimoWin` (Windows nativo), `SaimoPlayer` (Mac + catálogo compartilhado). `package.json` declara `"version": "2.3.0"`, enquanto o `README.md` menciona "Versão atual: 2.1.1" — **divergência de versão entre documentação e código**, sugerindo desenvolvimento ativo entre uma atualização e outra.
- **Interpretação técnica:** O Saimo TV faz parte de uma família de aplicativos multiplataforma (Android, iOS/celular, Windows, Mac, Web) compartilhando o mesmo catálogo (`SaimoPlayer`). O site web é apenas uma das frentes.
- **Confiança:** alta
- **Limitações:** Nenhuma.

## E-036 — Dependências e versões exatas confirmadas via `package.json`

- **Data:** 2026-10-19
- **Componente investigado:** `package.json` do repositório fonte
- **Fonte da evidência:** `package.json` (raiz do repositório)
- **Resultado observado:** `react@^19.3.0`, `react-dom@^19.3.0` (confirma [E-011](#e-011--versões-exatas-de-react-reactdom-e-scheduler-mapa-preciso-de-dependências-entre-chunks) com exatidão), `react-router-dom@^7.18.4` (React Router v7), `hls.js@^1.7.3` (confirma [E-007](#e-007--player-de-vídeo-com-hlsjs-173-e-mpegtsjs-embutidos) com exatidão), `mpegts.js@^1.8.2` (versão exata, não conhecida antes), `shaka-player@^5.2.12` (confirma [E-021](#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda) com exatidão), `@tauri-apps/api`/`cli`/`plugin-*` (o app de desktop usa **Tauri**, não Electron — informação nova), `vite@^8.3.1`, `typescript@~6.0.3`. Também presentes: `@vercel/node` (devDependency) e, na árvore de arquivos, uma pasta `api/` na raiz (além de `functions/api/`) e um `vercel.json` — sugerindo suporte a deploy alternativo na Vercel, embora o `README.md` confirme que a produção roda em Cloudflare Pages.
- **Interpretação técnica:** Confirma com precisão total o que havíamos inferido por fingerprint em código minificado (React, ReactDOM, hls.js, Shaka), corrige a suposição implícita de "Electron" para o app desktop (é **Tauri**, um framework mais leve baseado em Rust + WebView do sistema), e revela suporte a mais de uma plataforma de deploy serverless no código (Cloudflare Pages Functions **e** Vercel Functions), ainda que apenas uma esteja em uso em produção.
- **Confiança:** alta
- **Limitações:** Não foi confirmado se a Vercel está de fato em uso em algum ambiente (ex.: preview deploys), ou é só suporte deixado no código.

## E-037 — Modelo de dados exato confirmado via `src/types/*.ts`

- **Data:** 2026-10-19
- **Componente investigado:** `src/types/channel.ts`, `src/types/epg.ts`
- **Resultado observado:** Interfaces `ChannelSource` (`url`, `quality?`, `name?`, `referer?`, `userAgent?`, `keyId?`, `key?`), `Channel` (`id`, `name`, `url`, `logo?`, `category?`, `channelNumber?`, `sources?: ChannelSource[]`), `Program` (`id`, `title`, `description?`, `startTime`, `endTime`, `category?`, `rating?`, `thumbnail?`, `isLive?`, `episodeInfo?: {season?, episode?, episodeTitle?}`), `ChannelEPG` (`channelId`, `programs`), `CurrentProgram` (`current`, `next`, `progress`), e `PlayerState` (`isPlaying`, `isMuted`, `volume`, `isFullscreen`, `isMirrored`, `isTheaterMode`, `isPiP`, `isLoading`, `error`).
- **Interpretação técnica:** **Eleva o modelo ER proposto na Fase 04 de "proposta educacional" para "fato confirmado"** — nossos campos inferidos (`Channel`, `Source`, `Program`, `CurrentProgram`) bateram quase exatamente com os nomes e formatos reais, incluindo o retorno `{current, next, progress}` da função que havíamos chamado de `Zm()` no código minificado (Fase 03). Revela três campos de `PlayerState` não conhecidos antes: `isMirrored` (espelhamento de tela), `isTheaterMode` (modo cinema), `isPiP` (picture-in-picture) — recursos de player não documentados nas fases anteriores.
- **Confiança:** alta
- **Limitações:** Não foi lido o restante de `src/types/movie.ts` nesta passagem (VOD não detalhado).

## E-038 — Lógica exata de seleção de formato e de proxy: mais sofisticada do que o inferido do bundle minificado

- **Data:** 2026-10-19
- **Componente investigado:** `src/utils/streamUrl.ts`, `src/utils/sourceOrder.ts`, `src/utils/proxyUrl.ts`
- **Resultado observado:** As funções `isDash`/`isHls`/`isMpegTs` confirmam **exatamente** a lógica já reconstruída em [E-018](#e-018--seleção-de-engine-de-reprodução-três-motores-distintos-escolhidos-por-teste-de-url) (mesmos critérios, incluindo o caso especial `dadinhodetapioca.fun`). A função `needsProxy` confirma [E-019](#e-019--proxy-de-mídia-reutiliza-o-mesmo-endpoint-apiproxy-do-epg-com-encaminhamento-opcional-de-refereruser-agent) exatamente. **Além disso**, o código revela uma camada que o bundle minificado não deixou clara: a função `buildAttempts` monta, para cada fonte (já ordenada HTTPS-primeiro via `httpsFirst`), **até duas tentativas** — direta e via proxy — e **não apenas uma decisão binária fixa**; um mecanismo de aprendizado local (`localStorage["saimo-sem-cors"]`, semente `['jmp2.uk']`) registra hosts que já falharam por CORS, para começar direto pelo proxy nas próximas visitas. A função `proxyBase()` muda conforme a plataforma: no site, `/api/proxy` (mesma origem); no app desktop (Tauri), um servidor local injetado via `globalThis.__SAIMO_PROXY__` antes do primeiro script rodar; opcionalmente, uma variável de ambiente `VITE_PROXY_BASE` aponta para um proxy hospedado fora da Cloudflare — porque, segundo o comentário do próprio autor, **"os IPs de datacenter da Cloudflare são recusados por parte dos CDNs desta lista, que respondem 403 a quem não vem de uma conexão residencial"**. Também existe `fixNestedPath()`, uma correção específica para playlists (ex.: canais "Telecine") cujo manifesto aponta para segmentos em uma pasta diferente da esperada, e `hexToBase64Url()`, que converte o par `keyId`/`key` (hexadecimal, conforme o catálogo) para o formato base64url exigido pela API EME do navegador para DRM ClearKey — fechando o ciclo de [E-021](#e-021--shaka-player-terceiro-motor-usado-para-dash-com-suporte-a-drm-clearkey--carregado-sob-demanda).
- **Interpretação técnica:** **Refina (não invalida) E-018/E-019/E-020/E-021.** A arquitetura de fallback de fontes é mais rica do que "uma fonte ruim, tenta a próxima": cada fonte individual já rende até duas tentativas (direta/proxy), e o sistema aprende, por host, quando pular direto para o proxy — uma otimização de latência que só a leitura do código-fonte real revelou.
- **Confiança:** alta
- **Limitações:** Nenhuma relevante — código-fonte completo e lido integralmente para este arquivo.

## E-039 — Mecanismo de "servidores desligados" é curadoria **manual**, não monitoramento automático (corrige E-006)

- **Data:** 2026-10-19
- **Componente investigado:** `src/services/fontesDesativadas.ts`
- **Resultado observado:** O comentário de cabeçalho do arquivo afirma textualmente: **"Servidores desligados à mão, no painel do monitor."** A lista vem de `GET https://saimo-monitor.gabrielsaimo68.workers.dev/v1/fontes`, resposta no formato `{ desativados: string[] }` (hostnames, não URLs completas), cacheada no cliente por 120 segundos. Em caso de falha de rede, a lista fica **vazia** (fail-open) — o comentário do autor explica a filosofia: **"um canal a mais na tela é melhor que a lista inteira sumindo porque o monitor não respondeu."** A mensagem de log `servidores desligados: <lista>` (vista na Fase 01) é gerada literalmente por este módulo.
- **Interpretação técnica:** **Corrige [E-006](#e-006--backend-próprio-de-monitoramento-de-fontes-cloudflare-worker)**, que especulava "provável scraping/ping periódico por um processo externo" — na realidade, é uma lista **editada manualmente pelo mantenedor** em algum painel administrativo (não observado, não faz parte do site público), e o Worker apenas serve essa lista estática/semi-estática. Também resolve parcialmente a Q-005 (formato da resposta de `/v1/fontes` agora conhecido).
- **Confiança:** alta
- **Limitações:** O "painel do monitor" em si (onde o mantenedor edita a lista) não é público e não foi (nem deveria ser) investigado.

## E-040 — Telemetria exata: `sendBeacon`, `text/plain`, sem IP, limiar de 20s (resolve Q-010)

- **Data:** 2026-10-19
- **Componente investigado:** `src/services/telemetria.ts`
- **Resultado observado:** Confirma a leitura/criação do `localStorage["saimo-telemetria-id"]` exatamente como registrado em [E-008](#e-008--persistência-exclusivamente-em-localstorage-sem-cookies) (via `crypto.randomUUID()`, com fallback manual). O envio usa `navigator.sendBeacon` com corpo `text/plain` (explica o cabeçalho `content-type` visto na captura de rede da Fase 01, [E-033](#e-033--correçãodetalhamento-de-e-006-v1hello-é-chamado-via-post-com-corpo-não-get)) — escolha deliberada para evitar preflight de CORS e não atrasar o vídeo. O comentário do autor afirma explicitamente: **"o IP não é gravado: a cidade sai da borda da Cloudflare"**. Métricas enviadas incluem: plataforma (`"site"`), versão, o que está tocando (título, host), tempo acumulado assistido (só conta tempo com vídeo de fato rodando, não pausado/carregando), qualidade, travamentos, pulos. Um canal só "conta" como assistido após **20 segundos** contínuos (filtro anti-zapping). Heartbeat padrão a cada 5 minutos.
- **Interpretação técnica:** **Resolve a Q-010.** Confirma que a telemetria é relativamente minimalista em termos de dados pessoais (sem IP bruto, ID gerado localmente sem vínculo a conta), e que o uso de `sendBeacon`/`text/plain` é uma escolha técnica deliberada (evitar preflight CORS), não um indício de formato de dado "menos estruturado" como se poderia supor.
- **Confiança:** alta
- **Limitações:** Nenhuma relevante.

## E-041 — `/api/events` exato: fonte "embedtv.cc" identificada, estratégia de fallback precisa (refina E-030/E-032)

- **Data:** 2026-10-19
- **Componente investigado:** `functions/api/events.ts`
- **Resultado observado:** A função busca, em paralelo, `https://embedtv.cc/api/events` (prazo de 5s) e `https://saimo-monitor.gabrielsaimo68.workers.dev/v1/eventos` (prazo de 8s) — e retorna o corpo da **embedtv se disponível, senão o do monitor** (não uma combinação dos dois nesta função — a combinação com os placares da ESPN acontece no cliente, como já observado na Fase 04). Resposta cacheada por 60s (`Cache-Control: public, max-age=60`); erro retorna HTTP 502 com `Cache-Control: no-store`. A função usa um User-Agent de navegador comum ao chamar `embedtv.cc` (do lado do servidor da própria aplicação, não algo que fizemos).
- **Interpretação técnica:** Identifica pelo nome a terceira fonte de dados de eventos (**embedtv.cc**, não conhecida antes — citada apenas como domínio bruto em nossa varredura da Fase 04). Confirma a filosofia de "nunca ficar sem dado por causa de uma única fonte falhando", o mesmo padrão já visto em `fontesDesativadas.ts` (E-039) e no merge de EPG de 4 fontes (E-005, Fase 01).
- **Confiança:** alta
- **Limitações:** Nenhuma relevante.

## E-042 — Algoritmo de "fonte preferida" entre episódios de série confirmado (`fontePreferida.ts`)

- **Data:** 2026-10-19
- **Componente investigado:** `src/utils/fontePreferida.ts`
- **Resultado observado:** Confirma, com precisão de código, a afirmação do `README.md`: ao trocar de episódio de uma série (automático, botão "Próximo", ou escolha manual), o app tenta manter a fonte que estava tocando — nessa ordem de prioridade: (1) mesma versão de áudio (dublado/legendado, nunca muda), dentro dela (2) o mesmo host da fonte anterior, (3) a mesma posição numérica dentro da lista daquela versão, (4) a ordem padrão. O estado "lembrado" vive só em memória (não em `localStorage`), por série, durante a sessão.
- **Interpretação técnica:** Um exemplo refinado de UX pensada para continuidade de experiência (evitar trocar de servidor ou de dublado-para-legendado sem querer ao avançar episódios), implementado como uma função pura e bem isolada — bom material didático de "lógica de preferência com fallback em cascata" (ver `learning.md`).
- **Confiança:** alta
- **Limitações:** Nenhuma relevante (esta funcionalidade não havia sido mapeada em nenhuma fase anterior).

## E-043 — Chave de API do TMDB é constante hardcoded em código-fonte versionado (refina E-029)

- **Data:** 2026-10-19
- **Componente investigado:** `src/services/tmdbService.ts`
- **Resultado observado:** O mesmo valor de 32 caracteres hexadecimais identificado no bundle minificado em [E-029](#e-029--integração-com-a-api-pública-do-tmdb-the-movie-database-para-metadados-de-vod-incluindo-chave-de-api-hardcoded-no-bundle) aparece como uma constante de módulo literal no código-fonte (não uma variável de ambiente `import.meta.env.*`, ao contrário de outras configurações do projeto como `VITE_PROXY_BASE`, ver E-038).
- **Interpretação técnica:** Confirma que a exposição dessa chave no bundle público não é um vazamento acidental de build — é uma decisão deliberada do autor de versionar a chave diretamente no código-fonte (prática comum e historicamente aceita para chaves v3 do TMDB, pensadas para uso client-side, mas ainda assim uma credencial em texto claro em um repositório público).
- **Confiança:** alta
- **Limitações:** O valor da chave continua deliberadamente omitido deste e de todos os outros registros.

## E-044 — Janela de tempo real do EPG é 3h atrás + 30h adiante (33h) — diverge do valor calculado na Fase 02 por deriva de versão

- **Data:** 2026-10-19
- **Componente investigado:** `src/workers/epgWorker.ts` (constantes `PAST_WINDOW_MS`/`FUTURE_WINDOW_MS`), `src/services/epgService.ts`
- **Resultado observado:** `PAST_WINDOW_MS = 3 * 60 * 60 * 1000` (3h), `FUTURE_WINDOW_MS = 30 * 60 * 60 * 1000` (30h) — total de 33 horas de janela, confirmando o texto do `README.md` ("de três horas atrás a trinta horas adiante"). Isso **diverge** do valor de 25 horas (`v = 25 * g`, onde `g` = 1 hora) que havíamos calculado a partir do bundle minificado `tv-C6ATJaLp.js` na Fase 02.
- **Interpretação técnica:** Não é um erro de leitura da Fase 02 — é **deriva de versão**: o bundle minificado que baixamos e analisamos nas Fases 01-02 foi capturado em um momento específico (provavelmente próximo da v2.1.1 citada no `README.md`), enquanto o código-fonte atual do branch `main` está na v2.3.0 (ver [E-035](#e-035--repositório-fonte-oficial-identificado-e-verificado-githubcomgabrielsaimosaimo-tv)) — a aplicação mudou a janela da grade de EPG em algum ponto entre essas versões. Registrado como correção/atualização, preservando o valor original da Fase 02 no histórico.
- **Confiança:** alta
- **Limitações:** Não foi confirmado em qual versão exata a janela mudou de 25h para 33h (não investigamos o histórico de commits).

## E-045 — Confirmações consolidadas: nomes de componentes, sistema de navegação por D-pad, rota oculta, app desktop

- **Data:** 2026-10-19
- **Componente investigado:** Estrutura geral do repositório (`src/components/*`, `src/contexts/dpadContexto.ts`, `src/hooks/useDpadNavigation.ts`, `README.md`)
- **Resultado observado:** Nomes de componente confirmam exatamente os nomes já inferidos nas Fases 02-03: `Abertura.tsx` (animação de abertura, Fase 02), `ProgramGuide.tsx`, `PainelDeCanais.tsx`, `VideoPlayer.tsx`/`MoviePlayer.tsx`/`radioPlayer.ts`/`dashPlayer.ts` (Fase 03), `StreamTester.tsx`/`AppDownload.tsx`/`Novidades.tsx` ([E-013](#e-013--rotas-e-funcionalidades-adicionais-não-exploradas-na-fase-01)). Um sistema dedicado de **navegação por D-pad** (controle remoto/teclado direcional) existe em `dpadContexto.ts`/`DpadContext.tsx`/`useDpadNavigation.ts` — confirma a hipótese levantada na Fase 02 sobre os atributos `data-focusable`/`data-focus-key` vistos no HTML. O `README.md` confirma que a rota `/novidades` é **deliberadamente sem link em lugar nenhum da interface** (só acessível por URL direta) — não é uma rota "esquecida", é uma decisão de design. Confirma também: app desktop é **Tauri** (não Electron, corrige suposição implícita), com instaladores MSI/NSIS gerados por GitHub Actions; suporte a Media Session API (controles do sistema/tela de bloqueio); e que o roteamento usa caminhos normais no navegador mas roteamento por `#` no app desktop (mesmo `index.html`, raiz de arquivo local).
- **Interpretação técnica:** Alto grau de acerto da engenharia reversa feita nas Fases 02-03 unicamente a partir de bundles minificados — praticamente todos os nomes/comportamentos inferidos (mesmo sem source maps) corresponderam à estrutura real.
- **Confiança:** alta
- **Limitações:** Nenhuma relevante.
