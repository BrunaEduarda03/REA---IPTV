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
- **Limitações:** Não foi possível confirmar se há um mecanismo de fallback para logos quebrados/indisponíveis.
