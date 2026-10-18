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
