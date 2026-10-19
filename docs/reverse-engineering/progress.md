# Progress — Estado do Laboratório

**Última atualização:** 2026-10-18

## Etapa atual

Etapa 0, Etapa 1, Fases 01 a 04, verificação cruzada com o código-fonte, e **auditoria técnica final** concluídas. **Fase 05 (reimplementação educacional independente) autorizada e em andamento** — escopo e stack aprovados pelo usuário; acompanhamento sprint a sprint em `docs/implementation/` (não neste arquivo, que documenta só o laboratório de *engenharia reversa* em si, não a implementação própria).

**Status da Fase 05** (detalhe completo em `docs/implementation/progress.md`): Sprints 01 (Fundação), 02 (Catálogo), 03 (Player), 04 (Favoritos) e 05 (Atalhos de teclado + Modo cinema) concluídas e verificadas (testes reais + verificação visual em navegador real via `mcp__rea__capture_browser_scenario`, nenhum teste/verificação presumidos). Falta a Sprint 06 (qualidade e entrega: CI local, auditoria de acessibilidade, verificação de responsividade em viewport real, documentação do build de produção) para fechar o plano de sprints aprovado. Nenhum commit foi feito até agora nesta fase — por instrução explícita do usuário, cada sprint só é commitada depois que ele revisa o relatório de entrega.

**Importante (não um "gap", uma fronteira de escopo deliberada):** mesmo depois da Sprint 06, a aplicação própria **não** terá paridade de funcionalidades com o Saimo TV real — isso nunca foi o objetivo (ver `AGENTS.md`, item 1: "o objetivo é aprender, não construir um produto concorrente"). Ficam deliberadamente fora (documentado em `auditoria-tecnica-final.md`, Seção 5, e em `docs/implementation/backlog.md`): catálogo/conteúdo real (IPTV, filmes, séries — dependem de direitos de distribuição que não temos), EPG real (dependeria de fonte licenciada), metadados de VOD via TMDB, eventos esportivos, legendas via OpenSubtitles, DRM, PWA/Service Worker, app desktop via Tauri, motor de player com 3 engines + watchdog + fallback multi-fonte (implementamos 2 engines, sem fallback — ADR-016), navegação por D-pad/controle remoto, EPG sintético, layout dedicado para TV, Picture-in-Picture e espelhamento de tela (estes 5 últimos candidatos a uma sprint futura opcional, ver ADR-020 em `docs/implementation/decisions.md`).

## Tarefas concluídas

- [x] Estrutura de diretórios criada (`docs/reverse-engineering/`, `diagrams/`, `research/artifacts/`).
- [x] `AGENTS.md` e `CLAUDE.md` criados.
- [x] Documentação base criada (`README.md`, `findings.md`, `architecture.md`, `learning.md`, `research-log.md`, `questions.md`).
- [x] MCP REA validado.
- [x] **Fase 01 — Reconhecimento técnico**: 10 descobertas (E-001 a E-010).
- [x] Repositório git inicializado e publicado em `git@github.com:BrunaEduarda03/REA---IPTV.git` (apenas documentação; `research/artifacts/` excluído via `.gitignore`).
- [x] **Fase 02 — Engenharia reversa do JavaScript**: 7 descobertas (E-011 a E-017); `02-javascript-analysis.md`; 5 diagramas.
- [x] **Fase 03 — Engenharia reversa do streaming e player**: 9 descobertas (E-018 a E-026); `03-streaming-player.md`; 2 diagramas.
- [x] **Fase 04 — Dados, APIs, backend e infraestrutura**: 8 descobertas (E-027 a E-034); `04-data-api-infrastructure.md`; 6 diagramas.
- [x] **Verificação cruzada com o código-fonte público**: 11 descobertas (E-035 a E-045).
- [x] **Auditoria técnica final**: Q-013 e Q-014 investigadas (Q-013 resolvida; Q-014 deliberadamente não resolvida — componente privado/fora de escopo); Q-003 (antiga) parcialmente resolvida; inventário funcional completo (todas as telas e serviços do repositório fonte); matriz de rastreabilidade das 34 descobertas das Fases 01-04 (25 confirmadas, 1 corrigida, 8 não reverificadas — nenhuma refutada); arquitetura final consolidada; classificação do que é replicável de forma independente vs. dependente de terceiros. Criado `docs/reverse-engineering/auditoria-tecnica-final.md`.
- [x] `questions.md`, `architecture.md`, `research-log.md` atualizados com a auditoria.
- [x] Criado `docs/reverse-engineering/rea-vs-source-analysis.md` — estudo de caso técnico comparando engenharia reversa vs. código-fonte original lado a lado (métricas: 73,5% confirmado, 2,9% corrigido, 23,5% não reverificado, 0% refutado), pensado para uso em portfólio.
- [x] `README.md` do laboratório atualizado com índice completo (9 documentos) e status de todas as fases.

## Decisões metodológicas importantes

- O código-fonte original (`gabrielsaimo/Saimo-TV`, sem licença declarada = todos os direitos reservados) foi lido para **verificação/documentação**, nunca copiado para uma nova implementação. ~64 arquivos-fonte baixados ficam em `research/artifacts/source-repo/`, coberto pelo `.gitignore` existente — não serão versionados.
- Nenhuma URL sensível, credencial (ex.: chave TMDB) ou artefato de terceiros foi incluído na documentação que será versionada.
- A busca por Q-014 ("api-saimo-tv"/Supabase) foi deliberadamente interrompida ao não encontrar um repositório público — não foi feita nenhuma tentativa de acessar infraestrutura privada.

## Pendências

- [x] ~~Decisão do usuário sobre o escopo próprio da Fase 05~~ → decidido: Bun Workspaces + React/Vite/TS + Hono, ver `docs/implementation/architecture.md` e `backlog.md`.
- [ ] Sprint 06 (qualidade e entrega) da Fase 05, ver `docs/implementation/backlog.md`.

## Bloqueios

Nenhum bloqueio registrado até o momento.

## Próxima ação

Laboratório de engenharia reversa (Fases 01-04 + verificação cruzada + auditoria final) permanece encerrado e intocado desde seu commit original. A Fase 05 (implementação própria) está em `docs/implementation/`, com Sprints 01-05 concluídas e aguardando autorização do usuário para a Sprint 06 (última do plano) ou para ajuste de escopo.
