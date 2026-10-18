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
