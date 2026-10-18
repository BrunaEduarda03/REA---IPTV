# Laboratório de Engenharia Reversa — SaimoTV

## Objetivo

Compreender, de forma progressiva e fundamentada em evidências, como a aplicação **https://saimo-tv.pages.dev/tv** funciona e como sua arquitetura foi construída. Este é um exercício educacional de engenharia reversa aplicada a uma aplicação web — não um esforço para clonar, copiar ou reconstruir o produto.

## Metodologia

1. **Evidência antes de conclusão.** Toda afirmação técnica vem de uma ferramenta, uma observação ou um artefato concreto (HTML, JS, resposta de rede, etc.), nunca de suposição.
2. **Fato vs. inferência vs. hipótese.** Cada descoberta é classificada explicitamente (ver `AGENTS.md`).
3. **Uma funcionalidade por vez.** Investigações são incrementais e documentadas antes de avançar.
4. **Ensino aplicado.** Cada descoberta relevante é acompanhada de explicação conceitual, pseudocódigo educacional (TypeScript) e exercício prático.
5. **Reversibilidade e não-invasão.** Apenas tráfego gerado por uso normal e legítimo da aplicação é observado. Nenhuma autenticação, DRM ou controle de acesso é contornado.

## Índice da documentação

| Arquivo | Conteúdo |
|---|---|
| [`findings.md`](./findings.md) | Registro numerado de descobertas (E-001, E-002, ...) com evidência e confiança |
| [`architecture.md`](./architecture.md) | Arquitetura observada, módulos, hipóteses arquiteturais |
| [`learning.md`](./learning.md) | Conceitos aprendidos, explicações e exercícios |
| [`progress.md`](./progress.md) | Etapa atual, pendências, bloqueios, próxima ação |
| [`research-log.md`](./research-log.md) | Linha do tempo cronológica das investigações |
| [`questions.md`](./questions.md) | Dúvidas técnicas e hipóteses a investigar |
| [`diagrams/`](./diagrams/) | Diagramas Mermaid (arquitetura, fluxos, componentes) |

## Organização do laboratório

- `AGENTS.md` (raiz do projeto) — regras compartilhadas entre qualquer agente.
- `CLAUDE.md` (raiz do projeto) — instruções específicas para o Claude Code, importa `AGENTS.md`.
- `docs/reverse-engineering/` — toda a documentação de descobertas e progresso deste laboratório.
- `research/artifacts/` — evidências brutas coletadas (bundles JS/CSS públicos, snapshots de DOM, screenshots, capturas de rede), salvas localmente dentro do projeto para permitir análise sem solicitar permissões de leitura fora do diretório de trabalho.

## Fases do laboratório

- **Etapa 0** — Preparação do laboratório (estrutura, documentação). ✅
- **Etapa 1** — Validação do ambiente REA.
- **Fase 01** — Reconhecimento técnico do Saimo TV (interface, tecnologias, recursos públicos, navegação/estado, rede, player, arquitetura inicial).
- Fases futuras — a definir após autorização do usuário, com base nas prioridades levantadas na Fase 01.
