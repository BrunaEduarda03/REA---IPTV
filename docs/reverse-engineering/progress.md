# Progress — Estado do Laboratório

**Última atualização:** 2026-10-19

## Etapa atual

Etapa 0, Etapa 1, Fase 01, Fase 02 e Fase 03 concluídas. **Aguardando autorização do usuário para iniciar a Fase 04**, conforme regra 16 de `AGENTS.md` (não avançar automaticamente).

## Tarefas concluídas

- [x] Estrutura de diretórios criada (`docs/reverse-engineering/`, `diagrams/`, `research/artifacts/`).
- [x] `AGENTS.md` e `CLAUDE.md` criados.
- [x] Documentação base criada (`README.md`, `findings.md`, `architecture.md`, `learning.md`, `research-log.md`, `questions.md`).
- [x] MCP REA validado.
- [x] **Fase 01 — Reconhecimento técnico**: 10 descobertas (E-001 a E-010).
- [x] Repositório git inicializado e publicado em `git@github.com:BrunaEduarda03/REA---IPTV.git` (apenas documentação; `research/artifacts/` excluído via `.gitignore`).
- [x] **Fase 02 — Engenharia reversa do JavaScript**: 7 descobertas (E-011 a E-017); criado `02-javascript-analysis.md`; 5 diagramas Mermaid; `learning.md` com 12 conceitos.
- [x] **Fase 03 — Engenharia reversa do streaming e player**: 9 novas descobertas (E-018 a E-026), incluindo resolução da Q-002 (seleção de engine: DASH/Shaka para `.mpd`, mpegts.js para `.ts`, hls.js como padrão), descoberta de um terceiro motor de reprodução (Shaka Player, lazy-loaded, com suporte a DRM ClearKey — documentado apenas conceitualmente), sistema de recuperação de falhas com múltiplas fontes/watchdogs/guard de corrida, formato do catálogo de fontes por canal (resolve parcialmente Q-001), e Context de controle de acesso para conteúdo "Adulto".
- [x] Criado `docs/reverse-engineering/03-streaming-player.md` (12 seções: arquitetura, formatos/protocolos, fluxo de troca de canal, ciclo de vida de eventos, buffering, requisições de rede, desempenho, arquitetura educacional própria, comparação técnica hls.js/Shaka/Video.js/nativo, ensino, evidências, desconhecidos).
- [x] 2 novos diagramas Mermaid (`03-player-architecture.mmd`, `03-channel-switch-sequence.mmd`).
- [x] `architecture.md` atualizado com a arquitetura de streaming. `learning.md` ampliado com 4 novos conceitos (total: 16).
- [x] `questions.md` atualizado: Q-002 resolvida, Q-001 parcialmente resolvida, 3 novas questões (Q-007 a Q-009).

## Decisões metodológicas importantes

- A Fase 03 foi conduzida **inteiramente por análise estática de código**, sem iniciar reprodução real de nenhum canal — decisão deliberada para não reproduzir conteúdo de TV ao vivo de terceiros sem autorização explícita e específica do usuário.
- Onde o código revelou suporte a DRM ClearKey, isso foi documentado apenas como **capacidade observada no código-fonte**, sem qualquer tentativa de uso, extração de chaves reais, ou verificação de quais canais o utilizam (`AGENTS.md`, item 13).

## Pendências

- [ ] Autorização do usuário para iniciar a Fase 04 — ou outra direção (ex.: ler o conteúdo real de `canais.txt`/`catalogo.txt` para resolver Q-001 por completo, ou uma captura de rede real de reprodução, com escopo limitado e autorização explícita, para resolver Q-007).
- [ ] Commit/push das Fases 02 e 03 ao repositório remoto (ainda não solicitado pelo usuário nesta sessão).

## Bloqueios

Nenhum bloqueio registrado até o momento.

## Próxima ação

Aguardar decisão do usuário: autorizar a Fase 04, pedir para resolver alguma questão específica em aberto (Q-001, Q-007, Q-008 — esta última não recomendada), ou commitar o progresso atual no git. Não iniciar nova fase nem implementar o clone sem autorização explícita.
