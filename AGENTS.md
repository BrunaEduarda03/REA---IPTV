# AGENTS.md — Diretrizes do Laboratório SaimoTV

Este arquivo contém as regras compartilhadas para qualquer agente (Claude Code ou outro) que trabalhe neste projeto. Ferramentas e humanos devem seguir estas diretrizes sem exceção.

## Natureza do projeto

1. Este projeto é um **laboratório de engenharia reversa educacional**. O objetivo é aprender, não construir um produto concorrente.
2. O alvo de investigação é exclusivamente **https://saimo-tv.pages.dev/tv** (aplicação pública, acessada de forma legítima, sem autenticação contornada).

## Metodologia de investigação

3. Utilize o **MCP REA (Reverse Engineer Anything)** e o skill `reverse-engineer-anything` para investigações tecnicamente suportadas por evidência (ferramentas de análise de bundle JS, inspeção de página, captura de rede, etc.).
4. **Nunca invente** resultados, código-fonte, frameworks, bibliotecas ou arquiteturas. Se não há evidência, diga que não há evidência.
5. **Diferencie sempre** três categorias de afirmação:
   - **Fato verificado**: há evidência direta (ex.: nome de arquivo, string em bundle, header HTTP observado).
   - **Inferência**: conclusão razoável a partir de evidência indireta, mas não comprovada diretamente.
   - **Hipótese**: possibilidade levantada sem evidência suficiente, a ser testada depois.
6. Trabalhe **uma funcionalidade por vez**. Não tente mapear a aplicação inteira em uma única investigação.

## Comunicação e didática

7. Explique conceitos técnicos em **português brasileiro**.
8. Utilize **exemplos em TypeScript** sempre que isso melhorar o aprendizado (pseudocódigo educacional, nunca cópia do alvo).

## Limites éticos e de segurality

9. **Não implemente funcionalidades** (clone, backend, frontend) sem autorização explícita do usuário.
10. **Documente cada descoberta** com evidência, ferramenta/método utilizado e grau de confiança (alta/média/baixa).
11. **Atualize a documentação** (`docs/reverse-engineering/`) ao final de cada investigação.
12. **Preserve o histórico** de descobertas — ao corrigir algo registrado antes, mantenha o registro da correção (não apague silenciosamente).
13. **Não contorne** autenticação, DRM, controles de acesso ou qualquer mecanismo de segurança do alvo.
14. **Não copie** código-fonte, identidade visual, mídias ou outros materiais proprietários do alvo para uma nova implementação.
15. **Não execute operações destrutivas** ou que modifiquem a aplicação investigada (sem envio de formulários destrutivos, sem automação que altere estado do servidor do alvo).
16. **Não avance automaticamente** para a próxima fase/etapa do laboratório sem autorização explícita do usuário ao final de cada etapa.
