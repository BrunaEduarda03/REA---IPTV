# CLAUDE.md — Instruções para o Claude Code neste laboratório

@AGENTS.md

As diretrizes compartilhadas estão em `AGENTS.md` (importado acima). Este arquivo contém apenas orientações específicas para o Claude Code.

## Antes de cada investigação

- Consulte `docs/reverse-engineering/progress.md` para saber a etapa atual, pendências e próxima ação antes de iniciar qualquer trabalho novo.
- Consulte `docs/reverse-engineering/findings.md` e `docs/reverse-engineering/architecture.md` para não repetir investigações já concluídas.
- Consulte `docs/reverse-engineering/questions.md` para ver dúvidas abertas que podem orientar a investigação atual.

## Ferramentas

- **Priorize o MCP REA** (`mcp__rea__*`) sempre que suas ferramentas forem adequadas para a tarefa (análise de bundle JS/web, inspeção de página, captura de rede, comparação de versões, etc.).
- Utilize o skill oficial **`reverse-engineer-anything`** para orientação de fluxo de trabalho com REA.
- Use `mcp__claude-in-chrome__*` (via skill `chrome-browser`) apenas quando necessário para observar comportamento visual/interativo que o REA não capture diretamente, sempre de forma não destrutiva.

## Aprendizado progressivo

- Siga a metodologia de ensino definida pelo usuário: o que encontramos → como encontramos → como funciona → por que importa → como implementaríamos (pseudocódigo educacional) → como verificar → exercício prático.
- Adapte a profundidade da explicação ao conhecimento prévio do usuário em React, Next.js, TypeScript, Node.js e desenvolvimento full-stack.
- Trabalhe uma fase/etapa por vez e pare para autorização ao final, conforme `AGENTS.md`.

## Evidências antes de conclusões

- Toda afirmação técnica sobre o alvo deve vir acompanhada de evidência (ferramenta usada, saída observada) e classificação de confiança.
- Nunca apresente hipótese como fato. Se uma conclusão anterior for corrigida, registre a correção em `findings.md` preservando o registro original.

## Ao final de cada sessão

- Atualize `docs/reverse-engineering/progress.md` com: etapa atual, tarefas concluídas, pendências, bloqueios e próxima ação.
- Registre novas descobertas em `findings.md`, atualize `architecture.md` se houver mudança no entendimento estrutural, e adicione ao `research-log.md` o que foi feito cronologicamente.
