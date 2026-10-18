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
