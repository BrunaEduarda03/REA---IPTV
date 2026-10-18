# Implementação — SaimoTV Lab (Fase 05)

Documentação da **implementação original e independente** construída após o laboratório de engenharia reversa (`docs/reverse-engineering/`). Este é um projeto educacional próprio: arquitetura, código e decisões são nossos, informados pelos **requisitos funcionais** aprendidos na investigação — nunca pelo código-fonte do alvo.

## Separação de responsabilidades da documentação

- `docs/reverse-engineering/` — **o que foi observado** no sistema de terceiros (Saimo TV). Histórico intocado a partir daqui.
- `docs/implementation/` (este diretório) — **o que nós construímos**: arquitetura própria, decisões, backlog, progresso, testes e aprendizado durante o desenvolvimento.

## Índice

| Arquivo | Conteúdo |
|---|---|
| [`architecture.md`](./architecture.md) | Proposta de arquitetura, stack, diagrama Mermaid |
| [`decisions.md`](./decisions.md) | ADRs — decisões técnicas, alternativas e trade-offs |
| [`backlog.md`](./backlog.md) | MVP detalhado + plano de sprints |
| [`progress.md`](./progress.md) | Estado por sprint: concluído, testado, pendente |
| [`testing.md`](./testing.md) | Estratégia de testes (unitário, integração, e2e) |
| [`learning.md`](./learning.md) | Conceitos técnicos aprendidos durante a construção |

## Regras do laboratório aplicadas a esta fase

Herdadas de `AGENTS.md` (raiz do repositório) e reforçadas pela Fase 05:

1. Nenhum código-fonte, componente, estilo ou asset do repositório original (`gabrielsaimo/Saimo-TV`, `gabrielsaimo/SaimoPlayer`) é copiado ou usado como base direta.
2. Nenhum dos repositórios originais é importado como dependência.
3. Apenas dados fictícios e mídias de demonstração legitimamente autorizadas são usados.
4. A distinção entre "sistema observado" e "nossa arquitetura proposta" é preservada em toda a documentação.
5. Nenhuma funcionalidade é implementada sem autorização explícita; nenhuma sprint avança sem aprovação da anterior.
6. `research/artifacts/` (evidências da engenharia reversa) nunca é lido, referenciado ou usado como insumo de implementação.

## Estado atual

**Planejamento (pré-Sprint 01).** Nenhum código foi escrito. Ver `backlog.md` para o MVP e o plano de sprints propostos, e `decisions.md` para as decisões técnicas que precisam da sua aprovação antes de começar.
