# Research Log — Registro Cronológico

Registro cronológico das sessões de investigação: o que foi feito, com qual ferramenta, e qual foi o resultado. Não armazenar credenciais, tokens ou dados sensíveis aqui.

---

## 2026-10-18 — Sessão 1: Preparação do laboratório (Etapa 0)

- Criada a estrutura de diretórios do projeto (`docs/reverse-engineering/`, `diagrams/`).
- Criados `AGENTS.md` e `CLAUDE.md` com as diretrizes do laboratório.
- Criados os arquivos de documentação base: `README.md`, `findings.md`, `architecture.md`, `learning.md`, `progress.md`, `questions.md`.
- Próximo passo: validar ambiente REA (Etapa 1).

## 2026-10-18 — Sessão 1 (continuação): Validação do ambiente REA (Etapa 1)

- Confirmado via `ToolSearch` que o MCP `rea` está conectado nesta sessão, com ferramentas carregadas sob demanda (deferred tools).
- Ferramentas REA relevantes para **aplicações web** identificadas: `inspect_web_page`, `analyze_web_bundle`, `capture_web_screenshot`, `observe_web_session`, `inspect_web_network_capture`, `export_web_scripts`, `analyze_javascript_application`, `list_browser_targets`, `capture_browser_scenario`.
- Diferenciação confirmada: ferramentas como `inspect_web_page`/`analyze_web_bundle`/`observe_web_session` exigem conexão a um `cdp_endpoint` (Chrome DevTools Protocol) já em execução — não iniciam navegador por conta própria. `capture_browser_scenario` é a única que pode **lançar** um Chrome/Chromium local (`mode: "launch"` + `executable_path`) além de conectar a um CDP existente, o que a torna o ponto de entrada mais simples para abrir o alvo do zero.
- Ferramentas para **binários nativos/outros alvos** (não usadas nesta fase): `open_binary`, `inspect_macho`, `inspect_go_binary`, `inspect_rust_binary`, `instrument_with_frida`, `start_gdb_session`, ferramentas `adb_*` (Android), `inspect_electron_page`/`capture_electron_scenario` (Electron), entre outras — pertencem a outras camadas (nativo, Android, Electron, firmware) e não se aplicam a uma aplicação web pura como o Saimo TV.
- Dependência verificada: Google Chrome instalado em `/Applications/Google Chrome.app` — usado como `executable_path` pelo `capture_browser_scenario`.
- Teste não invasivo executado: `capture_browser_scenario` em modo `launch` (headless), navegando para `https://example.com` (não o alvo, apenas para validar a cadeia de ferramentas) — sucesso, retornou Evidence com `product: "Chromium"`, `version: "155.0.8059.80"`.
- Conclusão: ambiente REA operacional para investigação web. Nenhuma dependência adicional instalada.

## 2026-10-18 — Sessão 1 (continuação): Fase 01, reconhecimento técnico

- Criado `research/artifacts/` dentro do projeto (a pedido explícito do usuário, para evitar prompts de permissão de leitura fora do diretório de trabalho) e todas as evidências brutas desta sessão foram movidas/salvas ali: `capture-01-full.json` (captura completa de rede/DOM/console/storage/screenshot), `tv-dom-snapshot.html`, `tv-screenshot.png`, `scripts/*.js` (9 bundles JS públicos baixados via `curl`), `styles/*.css` (5 bundles CSS públicos), `manifest.webmanifest`.
- `capture_browser_scenario` (Chromium headless, Playwright) navegou para `https://saimo-tv.pages.dev/tv`, aguardou 3s de assentamento, e capturou: screenshot, DOM, acessibilidade, URL final, storage, eventos de console/erros de página/rede/workers (691 eventos de rede, 69 mensagens de console, 1 worker criado).
- Análise do JSON de captura feita via `jq` (resumo de tipos de recurso, domínios, status HTTP, mensagens de console) para evitar estourar o limite de contexto com o payload bruto (~1 MB).
- Bundles JS/CSS baixados diretamente via `curl` (recursos estáticos públicos, sem autenticação) e inspecionados com `grep`/Python para localizar fingerprints de bibliotecas (React, React Router, Rolldown, hls.js, mpegts.js, zustand/redux — não encontrados).
- 10 descobertas documentadas em `findings.md` (E-001 a E-010). Arquitetura consolidada em `architecture.md` com diagrama Mermaid em `diagrams/architecture-overview.mmd`. 6 conceitos técnicos ensinados em `learning.md`. 6 questões em aberto em `questions.md`.
- Nenhuma autenticação foi contornada; nenhum endpoint privado foi enumerado; nenhuma operação destrutiva foi executada. Apenas recursos públicos (HTML, JS, CSS, manifest, respostas de API já acionadas pelo uso normal da aplicação) foram observados.
- Próximo passo: aguardar autorização do usuário para a próxima fase (ver `questions.md` e relatório final).

## 2026-10-19 — Sessão 2: Fase 02, engenharia reversa do JavaScript

- Recuperação de contexto: releitura de `CLAUDE.md`, `AGENTS.md`, `findings.md`, `architecture.md`, `questions.md`, `progress.md` no início da sessão, conforme exigido pela Fase 02.
- Nenhuma nova captura de navegador foi necessária: a investigação desta fase trabalhou sobre os bundles JS já baixados em `research/artifacts/scripts/` (Fase 01), lidos diretamente com Python/`grep`.
- Testado (via `curl`) se os bundles possuem source maps públicos (`*.js.map`): confirmado que **não** — todas as URLs retornam o fallback HTML da SPA (E-012).
- Leitura detalhada de `rolldown-runtime-*.js` (runtime do bundler), `index-B8gNV0IZ.js` (entry point, animação de abertura), `tv-C6ATJaLp.js` (componente `ProgramGuide`, virtualização manual da grade de EPG), `PainelDeCanais-BclGcD97.js` (painel lateral, busca, favoritos, menu de contexto, modo multi-tela), e trechos localizados de `catalog-Y4ECXKT4.js` (React 19.3.0 embutido, Context/useReducer, favoritos VOD) e `player-DGAgJsZy.js` (lista canônica de categorias, canais de fallback embutidos, store pub/sub de "programa atual", instanciação do Web Worker de EPG).
- Confirmada a versão exata do React/ReactDOM (19.3.0) e do pacote `scheduler`, antes desconhecida (Fase 01 havia registrado isso como limitação em E-002).
- 7 novas descobertas documentadas (E-011 a E-017) em `findings.md`, incluindo: ausência de source maps, rotas adicionais não exploradas (StreamTester, AppDownload, Novidades), padrão de state management (Context+useReducer+pub/sub manual, sem Zustand/Redux), mecanismo de fallback de logo quebrado, categorias ocultas (incluindo "Adulto"), e inventário de 19+ chaves de `localStorage` revelando funcionalidades não documentadas (continuar assistindo, canais personalizados, modo dev, favoritos separados TV/VOD, etc.).
- Criado `docs/reverse-engineering/02-javascript-analysis.md` com: tabela de mapeamento de arquivos JS, fluxo de inicialização, modelo de gerenciamento de estado, 3 interações detalhadas (busca, favoritar, selecionar canal) com diagramas de sequência, componentes identificados, 5 funções analisadas com pseudocódigo educacional, e avaliação de qualidade/arquitetura.
- Criados 5 diagramas Mermaid em `diagrams/`: `02-module-graph.mmd`, `02-init-flow.mmd`, `02-interacao-busca.mmd`, `02-interacao-favoritar.mmd`, `02-interacao-selecionar-canal.mmd`.
- `architecture.md` e `learning.md` atualizados (6 novos conceitos técnicos ensinados: virtualização manual, store externo via pub/sub vs. `useSyncExternalStore`, Context+useReducer, busca binária sobre dados temporais, cache stale-while-revalidate manual, `ResizeObserver`).
- Nenhuma credencial, token ou dado pessoal foi registrado. Nenhuma operação destrutiva ou acesso não autorizado foi realizado — toda leitura foi sobre arquivos JS públicos já legitimamente obtidos.
- Próximo passo: aguardar autorização do usuário para a Fase 03 (Streaming e Player).

## 2026-10-19 — Sessão 3: Fase 03, engenharia reversa do streaming e player

- Recuperação de contexto: releitura de `questions.md` e das entradas de `findings.md` relacionadas ao player (E-007, E-014, E-016) antes de iniciar, conforme exigido pela Fase 03.
- **Decisão metodológica deliberada**: nenhuma reprodução real de canal foi iniciada nesta fase (sem captura de rede de manifesto/segmento real), para não reproduzir conteúdo de TV ao vivo de terceiros sem autorização explícita. Toda a investigação foi por leitura estática de `player-DGAgJsZy.js` (já baixado nas fases anteriores).
- Localizados, via busca por métodos de API característicos (`isSupported`, `loadSource`, `attachMedia`, `createPlayer`) os pontos exatos de orquestração da aplicação (distintos do código interno das bibliotecas hls.js/mpegts.js embutidas), respondendo com alta confiança à Questão Q-002 (critério de seleção de engine: `.mpd`→DASH, `.ts`→mpegts.js, padrão→hls.js).
- Descoberta de um **terceiro motor de reprodução não identificado nas fases anteriores**: Shaka Player, carregado sob demanda via `import()` dinâmico (`vendor-shaka-Csozrona.js`), com suporte a DRM ClearKey — documentado como capacidade do código, sem investigar uso real ou extrair/testar chaves (regra de não contornar DRM).
- Mapeado o sistema de recuperação de falhas: múltiplas fontes por canal, watchdogs de 12s/25s, guard de condição de corrida (flag de cancelamento), destruição defensiva de todos os engines antes de criar um novo.
- Localizado o parser do formato de catálogo de fontes por canal (campos `fonte`/`referer`/`nome`/`qualidade`/`agente`/`chave`) e um parser separado de playlists M3U/M3U8 padrão — resolve parcialmente a Questão Q-001 (apenas o formato do parser, não o conteúdo real dos arquivos).
- Descoberto um Context React de controle de acesso para conteúdo "Adulto" (`isAdultUnlocked`/`unlockAdult`/`lockAdult`), confirmando a hipótese da Fase 02 sobre a categoria "Adulto" — mecanismo de desbloqueio em si não investigado.
- Confirmados, por busca textual de `addEventListener`, os eventos de mídia HTML5 realmente escutados pela aplicação; `loadstart` e `volumechange` registrados como "não confirmados" (ausência de evidência, não prova de ausência).
- Confirmada ausência de WebRTC no bundle do player.
- 9 novas descobertas documentadas (E-018 a E-026) em `findings.md`. `questions.md` atualizado: Q-002 marcada como resolvida, Q-001 como parcialmente resolvida, e 3 novas questões registradas (Q-007 a Q-009), incluindo uma nota explícita de que Q-008 (uso real de DRM) não deve ser investigada ativamente.
- Criado `docs/reverse-engineering/03-streaming-player.md` com todas as 12 seções solicitadas: arquitetura do player, formatos/protocolos (com comparação didática M3U8-manifesto vs. playlist IPTV), fluxo de troca de canal, ciclo de vida de eventos, buffering/qualidade, requisições de rede (limitado por decisão metodológica), desempenho (idem), arquitetura educacional proposta (PlayerController/MediaSourceAdapter/etc. em TypeScript), comparação técnica (HTML5 nativo vs. hls.js vs. Shaka vs. Video.js), e pontos desconhecidos.
- Criados 2 diagramas Mermaid: `03-player-architecture.mmd` (fluxograma de seleção de engine e recuperação de falhas) e `03-channel-switch-sequence.mmd` (sequência completa de troca de canal, incluindo o guard de corrida).
- `architecture.md` e `learning.md` atualizados (4 novos conceitos técnicos: detecção de formato por URL, watchdog sobre timeupdate, guard de condição de corrida em efeitos assíncronos, DRM ClearKey/EME — este último tratado estritamente em nível conceitual).
- Nenhuma credencial, token, URL privada de streaming, ou chave de DRM foi registrada ou buscada. Nenhuma mídia foi baixada, reproduzida ou armazenada.
- Próximo passo: aguardar autorização do usuário para a Fase 04.

## 2026-10-19 — Sessão 4: Fase 04, dados, APIs, backend e infraestrutura

- Recuperação de contexto: releitura de `questions.md` e das entradas de `findings.md` relevantes antes de iniciar.
- Confirmada ausência de IndexedDB em todos os bundles já baixados (busca textual).
- Testada e confirmada a existência pública de `sw.js` (`https://saimo-tv.pages.dev/sw.js`) via `curl` — diferenciado do fallback de SPA (E-012) pelo `Content-Type: application/javascript` real. Baixado e lido por completo: **não minificado**, com comentários originais do desenvolvedor em português, explicando a estratégia de cache — resolve integralmente a Q-006.
- Varredura de todos os bundles por padrões de URL (`https?://host`) revelou dezenas de hosts; filtrados e investigados em contexto apenas os que são **serviços de metadados/API legítimos** (TMDB, ESPN, OpenSubtitles via Stremio) — decisão deliberada de **não enumerar nem listar individualmente** os hosts que parecem ser origens de stream de terceiros (categorizados apenas por tipo de infraestrutura em E-034).
- Localizada e **redigida do relatório** uma chave de API do TMDB hardcoded no bundle `catalog.js` (E-029) — documentada como achado arquitetural (exposição de credencial client-side), sem reproduzir o valor.
- Localizados dois novos endpoints de backend: `/api/events` (própria Cloudflare Pages Function) e `/v1/eventos` (mesmo Worker de E-006), via a função de agregação de eventos esportivos em `index.js`.
- Reexame (via `jq`, sem nova captura de rede) da captura de rede já salva da Fase 01 revelou que a única requisição a `/v1/hello` observada é **POST** (não GET como implícito em E-006) — registrado como correção/detalhamento (E-033).
- 8 novas descobertas documentadas (E-027 a E-034) em `findings.md`. `questions.md` atualizado: Q-006 resolvida, Q-004 parcialmente resolvida, Q-005 ampliada, 3 novas questões (Q-010 a Q-012).
- Criado `docs/reverse-engineering/04-data-api-infrastructure.md` com todas as 12 seções solicitadas: inventário de 16 fontes de dados, mapa de requisições HTTP categorizado, 3 fluxos de dados com diagramas de sequência, modelagem conceitual de entidades (Channel/Source/Category/Program/MediaItem/Favorite) com interfaces TypeScript, estratégias de persistência/cache, investigação de backend/serviços (sem inferir tecnologia não observada), dois diagramas de arquitetura (observada vs. proposta), projeto de API educacional em NestJS/Prisma/PostgreSQL, comparação de três alternativas arquiteturais, e seção de ensino.
- Criados 5 novos diagramas Mermaid: `04-entities-er.mmd`, `04-architecture-observed.mmd`, `04-architecture-proposed.mmd`, `04-fluxo-catalogo-inicial.mmd`, `04-fluxo-selecao-categoria.mmd`, `04-fluxo-selecao-canal-epg.mmd`.
- `architecture.md` e `learning.md` atualizados (2 novos conceitos: padrão App Shell com cache diferenciado, backend "fino" composto por múltiplas funções pequenas — total: 18 conceitos em `learning.md`).
- Nenhuma credencial foi registrada em texto; nenhum endpoint privado foi enumerado; nenhum domínio de origem de stream individual foi listado; nenhuma requisição autenticada foi reproduzida.
- Próximo passo: aguardar autorização do usuário para a Fase 05.

## 2026-10-19 — Sessão 5: Verificação cruzada com o repositório de código-fonte público

- O usuário apontou o repositório `github.com/gabrielsaimo/Saimo-TV` e perguntou por que não havíamos consultado o código-fonte real, já sendo público.
- Verificação de autenticidade: `curl` contra a API pública do GitHub confirmou `homepage: https://saimo-tv.pages.dev` (bate com o alvo), 49 estrelas, sem licença declarada.
- Perguntado ao usuário (via `AskUserQuestion`) qual profundidade de uso dar ao repositório; escolhida a opção **"Passagem profunda de verificação"**.
- Baixados ~20 arquivos-chave do código-fonte (TypeScript não minificado) para `research/artifacts/source-repo/` (já coberto pelo `.gitignore` existente, sem necessidade de ajuste): `package.json`, `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, tipos (`channel.ts`, `epg.ts`, `movie.ts`), serviços (`catalogService.ts`, `epgWorker.ts`, `epgService.ts`, `telemetria.ts`, `fontesDesativadas.ts`, `tmdbService.ts`, `eventos.ts`), utils (`streamUrl.ts`, `sourceOrder.ts`, `proxyUrl.ts`, `fontePreferida.ts`), contexts (`adultoContexto.ts`, `dpadContexto.ts`), funções de borda (`events.ts`, `proxy.ts`, `resolve-vod.ts`), `check-channels.cjs`, `README.md`.
- O `README.md` oficial, lido primeiro, já confirmou ou revelou uma quantidade enorme de detalhes (app desktop é Tauri; EPG também usa `meuguia.tv`; rota `/novidades` é deliberadamente sem link; lógica de "fonte preferida" entre episódios; skip de abertura/créditos via TheIntroDB; etc.).
- `package.json` confirmou com exatidão todas as versões que havíamos inferido por fingerprint (React 19.3.0, ReactDOM 19.3.0, hls.js 1.7.3, Shaka Player 5.2.12) e revelou `mpegts.js@1.8.2`, `react-router-dom@7.18.4`, Vite 8.3.1, Bun como gerenciador de pacotes, e confirmou Tauri (não Electron) para o app desktop.
- Leitura de `src/types/*.ts` elevou o modelo ER proposto na Fase 04 de "proposta" para "fato confirmado", e revelou 3 campos novos de `PlayerState` (`isMirrored`, `isTheaterMode`, `isPiP`).
- Leitura de `src/utils/streamUrl.ts` confirmou com 100% de precisão a lógica de seleção de formato já reconstruída na Fase 03 a partir de código minificado (`isDash`/`isHls`/`isMpegTs` idênticas), e revelou uma camada adicional não visível no bundle minificado: lista de hosts "sem CORS" autoaprendida, múltiplas tentativas por fonte (direta + proxy), proxy com base diferente por plataforma (web vs. app desktop Tauri vs. variável de ambiente), correção de caminho relativo para playlists específicas (Telecine), e a conversão hex→base64url para chaves ClearKey.
- Leitura de `src/services/fontesDesativadas.ts` **corrigiu** uma inferência da Fase 01 (E-006): a lista de "servidores desligados" é curadoria **manual** do mantenedor, não monitoramento automático.
- Leitura de `src/services/telemetria.ts` resolveu a Q-010 por completo: confirma uso de `sendBeacon`/`text/plain`, ausência de registro de IP, limiar de 20s para contar uma visualização, heartbeat de 5 minutos.
- Leitura de `functions/api/events.ts` identificou pelo nome a fonte "embedtv.cc", antes conhecida só como domínio bruto em uma varredura textual.
- Leitura de `src/services/catalogService.ts` resolveu a Q-001 por completo (formato exato do catálogo, incluindo os campos `canal:`/`logo:`/`categoria:` que precediam os já conhecidos campos de fonte).
- **11 novas descobertas (E-035 a E-045)** documentadas em `findings.md`, sob uma nova seção "Verificação cruzada com o código-fonte público", com nota explícita sobre a ausência de licença do repositório (todos os direitos reservados) e o compromisso de nunca copiar código-fonte para uma nova implementação, apenas descrever/citar fragmentos curtos como evidência.
- `questions.md` atualizado: Q-001, Q-010, Q-012 resolvidas por completo; Q-005 parcialmente resolvida; 2 novas questões (Q-013, Q-014) registradas.
- `architecture.md` atualizado com uma nova seção de "Verificação cruzada" e uma nova convenção visual (✅) para fatos confirmados pelo código-fonte original; vários itens da seção "Elementos desconhecidos" marcados como resolvidos.
- `learning.md` ampliado com 2 novos conceitos (lista de fallback autoaprendiz por host; configuração injetada por ambiente de execução) — total: 20 conceitos.
- Nenhum código-fonte foi copiado para dentro da documentação além de fragmentos curtos de identificação (nomes de arquivo/função/constante); todo o restante foi descrito em texto próprio. Valores de credenciais (chave TMDB) permanecem redigidos.
- Próximo passo: aguardar decisão do usuário sobre os próximos passos (Fase 05, resolver Q-013/Q-014, ou outra direção).

## 2026-10-19 — Sessão 6: Auditoria técnica final (validação cruzada completa)

- Usuário pediu para encerrar a auditoria com uma validação técnica final, antes do commit: resolver Q-013/Q-014, completar o inventário funcional, comparar todas as descobertas REA (Fases 01-04) com o código-fonte, montar uma matriz de rastreabilidade, atualizar a arquitetura final, e classificar o que é replicável de forma independente vs. dependente de terceiros. Fase 05 explicitamente **não** deve começar.
- Baixados ~45 arquivos-fonte adicionais do repositório `gabrielsaimo/Saimo-TV` (telas, componentes, serviços, hooks restantes) para `research/artifacts/source-repo/` (total agora: ~64 arquivos `.ts`/`.tsx`, todos fora do versionamento, cobertos pelo `.gitignore` existente).
- **Q-013 resolvida**: leitura de `src/services/eventos.ts` revelou as interfaces exatas (`Jogo`, `EventoAgenda`, `PlacarEspn`) e uma lista de ligas ESPN/canais de streaming maior do que a vista no bundle minificado da Fase 04 (agora inclui NBA, NFL, MLB, NHL, UFC, além de futebol).
- **Q-014 não resolvida por princípio**: busca na API pública do GitHub não encontrou um repositório público `api-saimo-tv`; tratado como componente privado/fora de escopo (geração de catálogo, não o site em produção), sem investigação adicional.
- **Q-003 (antiga, Fase 01) parcialmente resolvida**: leitura de `functions/api/proxy.ts` não encontrou lógica de allowlist de domínio no código — registrado como observação de leitura estática, sem nenhum teste ativo contra o serviço.
- Extração em lote dos comentários de cabeçalho de todos os arquivos-fonte (script Python) para montar o inventário funcional completo de forma eficiente, sem precisar ler cada arquivo manualmente por completo.
- Descobertas novas relevantes nesta rodada: `castService.ts` suporta **4 protocolos de cast** (Google Cast, AirPlay, Remote Playback API, Presentation API), não só Chromecast; `dashPlayer.ts` nomeia **18 canais específicos** que usam DASH+ClearKey (Globo, GNT, Multishow, SporTV 2/3, Premiere); `pulos.ts` (skip de abertura/créditos via TheIntroDB) e `useMediaSession.ts` (controles de mídia do sistema) nunca haviam sido mapeados em nenhuma fase anterior; `canaisPersonalizados.ts` tem recurso de **exportação** de lista/favoritos em `.m3u`, não só importação.
- Construída a **matriz de rastreabilidade completa**: das 34 descobertas das Fases 01-04, 25 confirmadas (várias ampliadas), 1 corrigida (E-006, já havia sido corrigida por E-039), 8 não reverificadas nesta rodada (por não terem sido priorizadas — arquivos grandes como `VideoPlayer.tsx`/`MoviePlayer.tsx`/`ChannelIcon.tsx` não foram lidos por completo).
- Criado `docs/reverse-engineering/auditoria-tecnica-final.md` com todas as 7 seções solicitadas: Q-013/Q-014, inventário funcional completo (telas, componentes, serviços, contexts/hooks, funções de borda), matriz de rastreabilidade, arquitetura final consolidada (React/Tauri/player/estado/catálogo/serviços), classificação de dependências (replicável vs. terceiros), plano proposto (não executado) para a Fase 05, e relatório final de síntese.
- `questions.md`, `architecture.md` atualizados com referências cruzadas à nova auditoria.
- Nenhum código-fonte foi copiado para a documentação além de fragmentos curtos de identificação. Nenhuma URL sensível, credencial ou artefato de terceiros foi incluído no que será versionado.
- **Fase 05 não foi iniciada**, conforme instruído.
- Próximo passo: apresentar `git status` ao usuário e aguardar autorização explícita de quais arquivos commitar.
