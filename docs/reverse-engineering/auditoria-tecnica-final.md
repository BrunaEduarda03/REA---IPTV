# Auditoria Técnica Final — Saimo TV

**Data:** 2026-10-19
**Escopo:** Encerramento da auditoria das Fases 01-04 com validação cruzada contra o código-fonte público oficial (`github.com/gabrielsaimo/Saimo-TV`).
**Não é a Fase 05.** Este documento consolida e valida o trabalho já feito; a Seção 6 propõe (sem executar) um plano para a Fase 05.

> **Nota de direitos autorais:** o repositório fonte não tem licença declarada (todos os direitos reservados). Todo o conteúdo abaixo descreve comportamento e estrutura em texto próprio, citando apenas fragmentos curtos de identificação (nomes de arquivo/função/constante) como evidência — nenhum trecho de código foi copiado para reuso. Os ~64 arquivos-fonte baixados para esta verificação ficam em `research/artifacts/source-repo/` (fora do versionamento, coberto pelo `.gitignore` existente).

---

## 1. Questões Q-013 e Q-014

### Q-013 — Schema JSON de `embedtv.cc/api/events` e `/v1/eventos` — ✅ Resolvida

**O que representava:** sabíamos (Fase 04, E-030/E-032) que a aba "Eventos" combina três fontes (embedtv, monitor, ESPN), mas não o formato exato dos dados de cada uma.

**Resolução:** a leitura de `src/services/eventos.ts` (código-fonte original) revelou as interfaces TypeScript exatas:
- `EventoAgenda` — formato comum de embedtv/monitor: `players`, `time_start`, `time_end`, `teams.{home,away}.{name,image}`, `league.{name,image}`, e (só na agenda do monitor) `estado`/`placar`/`tempo`.
- `PlacarEspn` — formato do placar da ESPN: `leagues[].logos[].href`, `events[].{date, status.type.{state,shortDetail}, competitions[].competitors[].{homeAway,score,team.{name,logo}}}`.
- `Jogo` — o tipo final, já normalizado, que a tela consome: `casa`/`fora` (times), `casaLogo`/`foraLogo`, `liga`/`ligaLogo`, `inicio`/`fim` (timestamps), `canal` (o `Channel` da lista ao vivo que transmite), `estado` ("pre"/"in"/"post"), `placar`, `tempo`.

**Achado adicional:** a lista de ligas ESPN consultadas é **maior** do que a vista no bundle minificado da Fase 04 (que mostrava ~15 ligas de futebol) — o código-fonte atual inclui também `basketball/nba`, `football/nfl`, `baseball/mlb`, `hockey/nhl`, `mma/ufc`. E a lista de canais de streaming cobertos pelo monitor (não vista antes) é: CazéTV, Disney+, Prime, Paramount+, GOAT, ge tv, N Sports, SportyNet.

**Confiança:** alta (interfaces lidas diretamente do código-fonte).

### Q-014 — "api-saimo-tv" / pipeline com Supabase — 🔴 Não resolvida (fora do escopo autorizado)

**O que representa:** um comentário em `tmdbService.ts` menciona um componente externo, "`api-saimo-tv` — o gerador que enriquece o catálogo do Supabase", responsável por enriquecer o catálogo com metadados do TMDB antes de publicá-lo no repositório `SaimoPlayer`.

**Tentativa de resolução:** busquei, na API pública do GitHub, por um repositório público chamado `api-saimo-tv` sob a conta `gabrielsaimo`. **Não encontrei nenhum repositório público com esse nome** — não aparece na lista de "apps irmãos" do `README.md` do Saimo-TV, nem foi localizado por busca direta.

**Conclusão:** este componente parece ser **privado ou não publicado**, ou faz parte de uma infraestrutura de *build-time*/manutenção de catálogo que não está no escopo do que é publicamente observável. Como o laboratório se concentra no que é legitimamente público e no comportamento do **site em produção** (não na cadeia de geração do catálogo), e como tentar localizar um repositório privado ou investigar credenciais do Supabase estaria fora do escopo ético, **esta questão permanece deliberadamente não resolvida**. Fica registrada como uma curiosidade documentada, não como um próximo passo recomendado.

**Confiança:** não aplicável (ausência de evidência pública, não uma conclusão negativa definitiva).

---

## 2. Inventário funcional completo

A tabela abaixo cobre **todas as telas e serviços** identificados na árvore de arquivos do repositório fonte, incluindo os que as Fases 01-04 não haviam explorado visualmente. A maioria dos arquivos tem um comentário de cabeçalho que descreve seu propósito de forma direta — citado/parafraseado como evidência.

### Telas (`src/telas/`)

| Tela | Rota (inferida) | O que faz | Status antes desta auditoria |
|---|---|---|---|
| `Inicio.tsx` | `/` ou `/inicio` | Título em destaque + fileiras: Continue assistindo, Ao vivo agora (com programa no ar), Favoritos, destaques do catálogo | Não explorada (Q-004) → **inventariada** |
| `Busca.tsx` | `/buscar` | Busca unificada (filmes, séries, animes, doramas, canais) com busca recente, insensível a acento | Não explorada → **inventariada** |
| `Eventos.tsx` | `/eventos` | Jogo em destaque + fileiras por horário (ao vivo, em breve, hoje, amanhã, próximos dias) | Dados confirmados (E-030); UI agora também | ✅ |
| `Favoritos.tsx` | `/favoritos` | Grade combinada de canais e filmes/séries favoritados | Não explorada → **inventariada** |
| `Radios.tsx` | `/radios` | Lista de rádios em fileiras (recentes, por estilo, A-Z); player de áudio único, equalizador na que toca | Mencionada via `localStorage` (E-017) → **inventariada** |
| `Ajustes.tsx` | `/ajustes` | Tela inicial padrão, modo adulto, importar/exportar canais, atalhos, limpeza de cache, links | Não explorada → **inventariada** |

### Componentes principais (`src/components/`)

| Componente | Papel | Evidência prévia |
|---|---|---|
| `Abertura.tsx` | Animação de abertura (splash) em SVG | Confirmado com precisão na Fase 02 (função `Y()`) |
| `BarraTopo.tsx` | Barra superior com abas, logo, relógio, ajustes | Confirmado na Fase 01 (DOM) |
| `PainelDeCanais.tsx` | Painel lateral de canais | Confirmado em detalhe na Fase 02 |
| `ProgramGuide.tsx` | Grade de EPG | Confirmado em detalhe na Fase 02 |
| `VideoPlayer.tsx` (61 KB) | Player de TV ao vivo | Lógica central já reconstruída na Fase 03; arquivo não lido por completo nesta auditoria |
| `MoviePlayer.tsx` (92 KB) | Player de VOD | Mencionado na Fase 03 (player de filme separado); não lido por completo |
| `VodCatalog.tsx` (79 KB) | Catálogo/acervo de filmes e séries | Não explorado antes → **existência confirmada, conteúdo não detalhado** |
| `StreamTester.tsx` | Testador de fontes/stream (rota oculta) | Existência confirmada na Fase 02 (E-013); conteúdo ainda não lido |
| `AppDownload.tsx` | Tela "Baixar app" | Existência confirmada na Fase 02 (E-013); conteúdo ainda não lido |
| `Novidades.tsx` | Changelog do catálogo, rota **deliberadamente sem link** (`/novidades`) | Existência confirmada na Fase 02; propósito exato confirmado nesta auditoria |
| `Telas.tsx` | Padrão visual compartilhado (destaque + fileiras) usado por Início/Eventos/Rádios/Favoritos/Busca | Novo |
| `EventsModal.tsx` | Modal de detalhes de um evento esportivo | Novo |
| `HomeSelector.tsx`, `Sidebar.tsx`, `AppHeader.tsx`, `NavegacaoMobile.tsx`, `CartaoNoAr.tsx`, `ChannelCard.tsx`, `ProgramInfo.tsx`, `AtalhosAjuda.tsx`, `Toast.tsx` | Subcomponentes de UI diversos | Existência confirmada; não detalhados individualmente nesta auditoria |

### Serviços (`src/services/`) — inventário completo

| Serviço | Função | Relação com achados REA |
|---|---|---|
| `catalogService.ts` | Busca/parseia o catálogo (`catalogo.txt`/`canais.txt`) | Resolve Q-001 (E-022, confirmado) |
| `epgService.ts` + `workers/epgWorker.ts` | EPG multi-fonte | Confirma e amplia E-005 (fonte `meuguia.tv` adicional) |
| `tmdbService.ts` | Metadados de VOD via TMDB | Confirma E-029 com exatidão |
| `eventos.ts` | Agregação de eventos esportivos | Resolve Q-013 |
| `telemetria.ts` | Telemetria anônima por dispositivo | Resolve Q-010 (E-040) |
| `fontesDesativadas.ts` | Lista de servidores desligados (curadoria manual) | Corrige E-006 (E-039) |
| `legendas.ts` | Legendas via OpenSubtitles/Stremio | Confirma E-031 |
| `pulos.ts` | Pular abertura/créditos via TheIntroDB | **Novo** — não documentado em nenhuma fase anterior |
| `continuar.ts` | "Continuar assistindo" | Mencionado via `localStorage` (E-017); lógica agora confirmada |
| `canaisPersonalizados.ts` | Canais personalizados (importar M3U/TXT, **exportar** lista/favoritos como `.m3u`) | Mencionado via `localStorage` (E-017); recurso de **exportação** é novo |
| `vodFavoritos.ts` | Favoritos de VOD | Confirma E-022 (função `vr()` do bundle minificado) |
| `vodService.ts` | Serviço geral de VOD (catálogo, fichas) | Existência confirmada; não detalhado |
| `radios.ts` | Lista de rádios (`vod/radios.txt`, formato `nome\|endereço\|logo`) | **Novo** — formato de dado não conhecido antes |
| `radioPlayer.ts` | Player de rádio único (toca entre telas) | **Novo** — não documentado |
| `dashPlayer.ts` | Player DASH/Shaka com ClearKey | Amplia E-021: **18 canais nomeados** usam DASH+DRM (Globo, GNT, Multishow, SporTV 2/3, toda a Premiere) |
| `castService.ts` (25 KB) | Cast universal | **Amplia significativamente E-007**: suporta **4 protocolos** — Google Cast, AirPlay, Remote Playback API, Presentation API (não apenas Chromecast) |

### Contexts e hooks

| Arquivo | Papel | Relação com achados REA |
|---|---|---|
| `adultoContexto.ts` | Controle de acesso a conteúdo adulto | Confirma E-023 **exatamente** |
| `dpadContexto.ts` + `useDpadNavigation.ts` (16 KB) | Sistema de navegação por D-pad (controle remoto/teclado direcional) | Confirma a hipótese da Fase 02 sobre `data-focusable`/`data-focus-key` |
| `useKeyboardShortcuts.ts` | Atalhos de teclado (tecla `?` para ajuda, `G` para guia, etc.) | Confirma menções do `README.md` |
| `useMediaSession.ts` | Integração com Media Session API (controles do sistema/tela de bloqueio) | **Novo** — não documentado em nenhuma fase anterior |
| `useCanais.ts` | Hook de acesso à lista de canais | Existência confirmada |

### Funções de borda (`functions/api/`)

| Função | Papel | Relação com achados REA |
|---|---|---|
| `proxy.ts` (19 KB) | Proxy de streaming (Referer/UA, correção de playlists Telecine) | Confirma E-019/E-038; **nenhuma allowlist de domínio foi encontrada no código lido** — relevante para a antiga Q-003 (ver Seção 4) |
| `events.ts` | Agregador de eventos (embedtv + monitor) | Confirma E-032/E-041 |
| `resolve-vod.ts` | Resolve origens de VOD conhecidas — comentário do próprio autor: **"nunca funciona como proxy arbitrário"** | **Novo** endpoint, não detalhado antes |

---

## 3. Matriz de rastreabilidade: descoberta REA → evidência → código-fonte → conclusão

| REA | Descoberta (resumo) | Evidência no bundle minificado | Arquivo no código-fonte original | Status |
|---|---|---|---|---|
| E-001 | Hospedagem Cloudflare Pages | Header `cf-ray` | `README.md` ("Publicar") | ✅ **Confirmada** |
| E-002 | React + Vite/Rolldown + React Router | `rolldown-runtime-*.js`, `vendor-react-*.js` | `package.json` (react, react-router-dom, vite); Rolldown não aparece como pacote separado — é interno ao `vite@8` | ✅ **Confirmada** (Rolldown confirmado como motor interno do Vite 8, não um pacote à parte) |
| E-003 | Estrutura de navegação por abas | DOM capturado (Fase 01) | `src/components/BarraTopo.tsx` (comentário bate quase palavra-por-palavra) | ✅ **Confirmada** |
| E-004 | Catálogo via GitHub (texto) | Requisições de rede | `src/services/catalogService.ts` | ✅ **Confirmada** |
| E-005 | EPG de 4 fontes via Worker | `epgWorker-*.js` | `src/workers/epgWorker.ts`, `src/services/epgService.ts` | ✅ **Confirmada e ampliada** (fonte `meuguia.tv` adicional) |
| E-006 | Monitor de fontes "provável automático" | Console log "servidores desligados" | `src/services/fontesDesativadas.ts` | ❌ **Corrigida** (curadoria manual, não automática — E-039) |
| E-007 | hls.js + mpegts.js | Strings de versão no bundle | `package.json`, `src/components/VideoPlayer.tsx` (não lido por completo) | 🟡 **Confirmada, mas incompleta** (faltava Shaka — já coberto por E-021; e os 4 protocolos de cast — E-045 nesta auditoria) |
| E-008 | localStorage, 3 chaves | Snapshot de storage | Múltiplos serviços (`telemetria.ts`, `catalogService.ts`) | ✅ **Confirmada** (parcial por natureza — só 3 de 19+ chaves) |
| E-009 | PWA (manifest + SW) | `<link rel=manifest>`, console | `public/manifest.webmanifest`, `public/sw.js` | ✅ **Confirmada** |
| E-010 | Logos de terceiros heterogêneos | Eventos de rede, console | — (dado do catálogo, não código) | ✅ **Confirmada** (natureza do dado, não do código) |
| E-011 | React/ReactDOM/Scheduler 19.3.0 | String `version` no bundle | `package.json` | ✅ **Confirmada com exatidão** |
| E-012 | Sem source maps públicos | `.js.map` → fallback HTML | — | ✅ **Confirmada** (mas código-fonte disponível por outro caminho, E-035) |
| E-013 | Rotas ocultas (StreamTester/AppDownload/Novidades) | `__vite__mapDeps` | `src/components/{StreamTester,AppDownload,Novidades}.tsx` | ✅ **Confirmada** |
| E-014 | Context + useReducer + pub/sub manual | Contagem de hooks no bundle | `adultoContexto.ts`, `dpadContexto.ts` (padrão Context confirmado); reducer específico não lido | ✅ **Confirmada** (padrão geral; não todo Context individual foi localizado) |
| E-015 | Fallback de logo (avatar de iniciais) | Componentes `F`/`c` no bundle | `src/components/ChannelIcon.tsx` (não lido nesta auditoria) | ⚪ **Não reverificada** nesta rodada |
| E-016 | Categorias + lista de fallback embutida | Array `Kp` no bundle | `src/data/channels.ts` (`categoryOrder`, `adultChannels`, `channels`) | ✅ **Confirmada com exatidão** |
| E-017 | 19+ chaves de localStorage | `grep` nos bundles | Confirmadas individualmente apenas algumas (`saimo-catalogo-v2`, `saimo-telemetria-id`, `saimo-sem-cors`) | 🟡 **Parcialmente confirmada** |
| E-018 | Seleção de engine por teste de URL | Funções `tp`/`np`/`rp` | `src/utils/streamUrl.ts` (`isDash`/`isHls`/`isMpegTs`) | ✅ **Confirmada com exatidão** (nomes de função quase idênticos em espírito) |
| E-019 | Proxy de mídia reutiliza `/api/proxy` | Funções `ip`/`ap`/`op` | `src/utils/streamUrl.ts` (`needsProxy`/`proxyBase`/`proxyUrl`) | ✅ **Confirmada e ampliada** (E-038) |
| E-020 | Sistema de recuperação (múltiplas fontes, watchdogs, guard de corrida) | Bloco de orquestração no player | `src/utils/streamUrl.ts` (`buildAttempts`) confirma a parte de fontes múltiplas; watchdogs de 12s/25s não re-verificados contra `VideoPlayer.tsx` nesta rodada | 🟡 **Confirmada parcialmente, e ampliada** (lista de fallback por host autoaprendida, não vista antes) |
| E-021 | Shaka Player + DRM ClearKey | `import('./vendor-shaka-*.js')` | `src/services/dashPlayer.ts`, `package.json` (`shaka-player@5.2.12`) | ✅ **Confirmada e ampliada** (18 canais nomeados) |
| E-022 | Formato do catálogo (chave-valor) | Parser no bundle | `src/services/catalogService.ts` | ✅ **Confirmada com exatidão** (resolve Q-001) |
| E-023 | Context de controle de acesso adulto | `createContext({isAdultUnlocked...})` | `src/contexts/adultoContexto.ts` | ✅ **Confirmada, correspondência quase byte-a-byte** |
| E-024 | Eventos de mídia confirmados/não confirmados | `addEventListener` no bundle | `src/components/VideoPlayer.tsx` (não lido por completo) | ⚪ **Não reverificada** nesta rodada |
| E-025 | Nenhuma evidência de WebRTC | `grep` no bundle | Não buscado no código-fonte nesta rodada (mas `castService.ts` confirma só 4 protocolos de cast, nenhum WebRTC) | 🟡 **Consistente, não re-testada diretamente** |
| E-026 | Autoplay com fallback mudo + volume persistido | Padrão `play().catch()` | `src/components/VideoPlayer.tsx` (não lido por completo) | ⚪ **Não reverificada** nesta rodada |
| E-027 | Service Worker: app shell, cache diferenciado | `sw.js` baixado diretamente do site (Fase 04) | `public/sw.js` no repositório (mesmo arquivo) | ✅ **Confirmada** (mesma fonte, já era o código real) |
| E-028 | Nenhum uso de IndexedDB | `grep` nos bundles | Não re-testado no código-fonte completo nesta rodada | ⚪ **Não reverificada** |
| E-029 | TMDB + chave hardcoded | String de 32 hex no bundle | `src/services/tmdbService.ts` | ✅ **Confirmada com exatidão** (mesma chave) |
| E-030 | ESPN para "Eventos" (~15 ligas) | Array `je` no bundle | `src/services/eventos.ts` | ✅ **Confirmada e ampliada** (lista de ligas maior na versão atual — ver Q-013) |
| E-031 | OpenSubtitles via Stremio | Constante `ig` no bundle | `src/services/legendas.ts` | ✅ **Confirmada com exatidão** |
| E-032 | `/api/events` + `/v1/eventos` | Constantes `ke`/`Ae` no bundle | `functions/api/events.ts`, `src/services/eventos.ts` | ✅ **Confirmada com exatidão** |
| E-033 | `/v1/hello` é POST, não GET | Captura de rede (Fase 01) | `src/services/telemetria.ts` (`sendBeacon`) | ✅ **Confirmada e detalhada** (E-040) |
| E-034 | Domínios de stream heterogêneos (categorias, sem enumerar) | `grep` de hosts no bundle | `src/data/channels.ts`/`restrictedChannels.ts` (existência confirmada, conteúdo deliberadamente não lido) | ✅ **Confirmada** (mantém-se não enumerada, por princípio) |

**Resumo da matriz:** de 34 descobertas da Fase 01-04, **25 confirmadas** (total ou parcialmente, várias ampliadas com detalhe novo), **1 corrigida** (E-006), **8 não reverificadas nesta rodada** (não por divergência — simplesmente não priorizadas na leitura desta sessão, principalmente por estarem nos arquivos grandes `VideoPlayer.tsx`/`ChannelIcon.tsx` não lidos por completo). **Nenhuma descoberta da Fase 01-04 foi refutada/invalidada** — o pior caso observado foi uma correção de mecanismo (manual vs. automático) e uma divergência de versão (janela de EPG, já registrada como E-044).

---

## 4. Arquitetura final consolidada

### React
✅ React 19.3.0 + ReactDOM 19.3.0 (exato), React Router v7.18.4 (API de data router). Estado: Context API + `useReducer` para dados estruturais (catálogo, favoritos, modo adulto — confirmado), padrão manual de pub/sub para dados externos ao ciclo de render (EPG "agora"). Nenhuma lib de state management de terceiros.

### Tauri (app desktop)
✅ **Confirmado nesta auditoria**: o app de desktop usa **Tauri** (Rust + WebView do sistema), não Electron. Mesmo código-fonte web, empacotado; roteamento muda de caminhos normais (`/filmes`) para `#`-based no desktop, porque o app abre o `index.html` localmente, sem uma "origem" de servidor. O proxy de mídia também muda de implementação: no site é uma Cloudflare Pages Function; no desktop, um servidor local injetado via `globalThis.__SAIMO_PROXY__`.

### Player
✅ **Três motores confirmados com precisão**: `hls.js` 1.7.3 (padrão), `mpegts.js` 1.8.2 (`.ts` cru), **Shaka Player** 5.2.12 (DASH + ClearKey, usado por **18 canais nomeados** — majoritariamente grandes emissoras: Globo, GNT, Multishow, SporTV, Premiere). Seleção por teste de URL (`isDash`/`isHls`/`isMpegTs`, confirmado linha a linha). Sistema de fallback por fonte **mais rico que o reconstruído na Fase 03**: cada fonte rende até 2 tentativas (direta + proxy), com uma lista de hosts "sem CORS" que **aprende** com falhas reais (`localStorage["saimo-sem-cors"]`). Cast universal via **4 protocolos** (Google Cast, AirPlay, Remote Playback API, Presentation API) — bem mais amplo que o "Chromecast" isolado documentado na Fase 01.

### Gerenciamento de estado
✅ Confirmado: Context API (`adultoContexto.ts`, `dpadContexto.ts` lidos por completo) + hooks customizados (`useCanais`, `useDpadNavigation`, `useMediaSession`, `useKeyboardShortcuts`). Um sistema de navegação por D-pad dedicado (`useDpadNavigation.ts`, 16 KB) confirma a hipótese da Fase 02 sobre atributos `data-focusable`/`data-focus-key` — a aplicação é pensada para navegação por controle remoto/teclado direcional desde a base, não como um acréscimo.

### Catálogo
✅ Confirmado: `catalogo.txt` (primário, com ClearKey/Referer/UA) + `canais.txt` (reserva, casado por nome) do repositório `SaimoPlayer`, com uma lista semente local (`src/data/channels.ts`) e uma lista de conteúdo restrito separada (`src/data/restrictedChannels.ts`, 638 KB, não lida em detalhe por princípio). Cache local de 6 horas. Rádios vêm de `vod/radios.txt` (formato `nome|endereço|logo`), também do mesmo repositório.

### Serviços
✅ Confirmado um ecossistema de serviços bem maior do que mapeado nas Fases 01-04: telemetria (anônima, sem IP), monitoramento de fontes (curadoria manual), eventos esportivos (3 fontes), metadados de filmes/séries (TMDB), legendas (OpenSubtitles/Stremio), skip de abertura/créditos (TheIntroDB), canais personalizados (import/export M3U), "continuar assistindo", e "fonte preferida" entre episódios de série — a maioria desses últimos **nunca havia sido mapeada em nenhuma fase anterior**, só veio à luz pela leitura do código-fonte.

---

## 5. O que podemos construir de forma independente vs. o que depende de terceiros

| Funcionalidade | Pode ser implementada de forma independente? | Dependências de terceiros envolvidas |
|---|---|---|
| Interface (abas, painel de canais, grade de EPG, animação de abertura, navegação por D-pad) | ✅ **Sim, totalmente** | Nenhuma — é lógica de UI própria, replicável com dados/mídia nossos |
| Player de vídeo (seleção de engine, watchdogs, fallback entre fontes) | ✅ **Sim, totalmente** | hls.js/mpegts.js/Shaka Player são bibliotecas open-source livremente utilizáveis; a lógica de orquestração é nossa a escrever |
| PWA (manifest, Service Worker com app shell) | ✅ **Sim, totalmente** | Nenhuma |
| Modelo de dados (Channel/Source/Program/Favorite) | ✅ **Sim, totalmente** | Nenhuma — são apenas interfaces/estruturas |
| Sistema de favoritos/preferências em `localStorage` | ✅ **Sim, totalmente** | Nenhuma |
| Telemetria anônima própria | ✅ **Sim, totalmente** (seria nosso próprio backend) | Nenhuma |
| Catálogo de canais ao vivo (conteúdo) | ❌ **Não** — depende do conteúdo em si | Precisaríamos de fontes de stream próprias, licenciadas ou autorizadas — não podemos reusar o catálogo do Saimo TV |
| EPG (guia de programação) | 🟡 **Parcial** — a lógica de merge/normalização é replicável; os dados em si exigem uma fonte de EPG legítima (licenciada ou um provedor com termos de uso compatíveis) | Fontes de EPG de terceiros (aceitando os termos de cada uma) |
| Metadados de VOD (pôsteres, sinopses, classificação etária) | 🟡 **Parcial** — a técnica (API TMDB com algoritmo de correspondência por nome/ano) é replicável; exigiria nossa própria chave de API do TMDB, respeitando os termos de uso do TMDB | Conta/chave própria no TMDB |
| Legendas | 🟡 **Parcial** — o addon do Stremio para OpenSubtitles é público e gratuito; poderíamos integrar da mesma forma, respeitando os termos de uso dele | Serviço de terceiros (gratuito, sem chave) |
| Eventos esportivos (placares ao vivo) | 🟡 **Parcial** — a API da ESPN usada não é oficialmente documentada/licenciada para uso de terceiros; precisaríamos de uma fonte de dados esportivos com uso autorizado (ex.: uma API paga legítima) | API esportiva com uso autorizado |
| Skip de abertura/créditos (TheIntroDB) | 🟡 **Parcial** — TheIntroDB é um banco aberto comunitário; uso direto é possível, mas depende da cobertura de dados da comunidade | Serviço comunitário de terceiros |
| Conteúdo VOD (filmes/séries) em si | ❌ **Não** — teríamos que obter direitos de distribuição próprios ou usar apenas conteúdo de domínio público/com autorização | Direitos de conteúdo |
| DRM ClearKey para conteúdo protegido | 🟡 **Tecnicamente replicável** (Shaka Player suporta nativamente) — mas só faz sentido com conteúdo que de fato temos autorização para proteger/distribuir dessa forma | Acordo com o detentor de direitos do conteúdo |

**Síntese:** **toda a arquitetura de software** (interface, player, modelo de dados, PWA, telemetria, persistência) é replicável de forma independente e educacional. O que **não** é replicável de forma independente é o **conteúdo** em si (canais de TV, filmes, séries) e o uso de **algumas APIs de terceiros nos mesmos termos informais** que o Saimo TV usa (ex.: a API da ESPN não documentada publicamente para uso de terceiros) — para um projeto educacional/de portfólio, a recomendação (já esboçada na Fase 04) é substituir essas por: mídia de demonstração própria/pública, uma fonte de EPG com termos de uso claros, e uma API esportiva legitimamente autorizada para uso de terceiros (se esse recurso for desejado).

---

## 6. Plano proposto para a Fase 05 (não executado)

> Apresentado apenas como proposta, conforme solicitado — **não iniciado**.

1. **Leitura dirigida de `VideoPlayer.tsx`/`MoviePlayer.tsx`** (os dois maiores arquivos não lidos por completo) para reverificar E-015, E-020 (watchdogs exatos), E-024, E-025, E-026 com a mesma precisão já obtida para o restante do player.
2. **Leitura de `VodCatalog.tsx`** e `src/types/movie.ts` para completar o modelo de dados de VOD (Fase 04, Seção 4, ainda marcado como "proposto" para `MediaItem`).
3. **Exploração visual** (com `capture_browser_scenario`, não invasiva) das telas agora conhecidas por código mas nunca vistas rodando: Eventos, Início, Busca, Favoritos, Rádios, Ajustes.
4. **Definição de escopo para uma eventual implementação própria educacional** (se autorizado futuramente): decidir fonte de mídia de demonstração, fonte de EPG com termos de uso claros, e se features dependentes de terceiros (eventos esportivos, skip de abertura) entram ou ficam de fora do primeiro escopo.

---

## 7. Relatório final

### O que aprendemos com REA (Fases 01-04, só análise de bundle minificado)
Reconstruímos, **sem acesso a nomes originais nem comentários**, uma arquitetura React 19 com Vite/Rolldown, um player de 3 motores (hls.js/mpegts.js/Shaka) com lógica de fallback multi-fonte, um sistema de EPG agregado de 4+ fontes processado em Web Worker, um backend "fino" (Cloudflare Pages Functions + Worker) com pelo menos 5 endpoints, um Service Worker com estratégia de cache app-shell, e integrações com TMDB/ESPN/OpenSubtitles — tudo isso por engenharia reversa pura de JavaScript minificado.

### O que foi confirmado pelo código-fonte
**25 das 34 descobertas da Fase 01-04 foram confirmadas** (a maioria com precisão notável — nomes de função, constantes, até comentários bateram em espírito com o que havíamos inferido), **1 foi corrigida** (curadoria manual vs. automática dos servidores desligados), e **8 não foram reverificadas** nesta rodada por não terem sido priorizadas (não por contradição). A engenharia reversa a partir de bundle minificado, sem source maps, provou-se **extremamente confiável** neste caso — mas o código-fonte real revelou uma camada adicional de refinamento (fallback autoaprendido por host, 4 protocolos de cast, configuração por plataforma) que só a leitura do código real poderia ter capturado.

### O que será necessário para desenvolver uma aplicação própria
Como detalhado na Seção 5: a **arquitetura de software inteira** é replicável de forma independente e educacional (interface, player, modelo de dados, PWA). O que exige decisões/autorizações adicionais é o **conteúdo** (canais, filmes, séries — precisaríamos de fontes próprias/autorizadas) e **algumas integrações de terceiros usadas de forma informal** pelo Saimo TV (API da ESPN não documentada publicamente). Nenhum código-fonte do Saimo TV deve ser copiado para essa eventual implementação — apenas os conceitos e padrões arquiteturais documentados neste laboratório.
