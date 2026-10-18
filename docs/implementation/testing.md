# Estratégia de Testes

## Princípios

- Um teste só é reportado como "passou" se foi **de fato executado** nesta sessão — nunca inferido ou presumido (regra explícita da Fase 05).
- Prioriza-se testar **funções puras de domínio** (fáceis, rápidas, sem mock de DOM) sobre testar detalhes de implementação de componentes.
- Teste de integração > teste de snapshot: preferimos verificar comportamento (o que o usuário vê/faz) a estrutura de markup, que muda com frequência no início do projeto.

## Camadas

| Camada | Ferramenta | O que cobre | Quando |
|---|---|---|---|
| Unitária | Vitest | Funções puras (parsers Zod, filtros, normalização de busca, adapters de player com mocks) | Todo sprint, desde o 01 |
| Componente/integração | Vitest + React Testing Library | Comportamento de componentes e fluxos curtos (clicar → navegar, digitar → filtrar) | A partir do Sprint 02 |
| End-to-end | Playwright | Fluxo crítico completo (abrir catálogo → selecionar → reproduzir), só se justificado | Avaliado no Sprint 06, não antes |
| Manual (documentado) | — | Reprodução real de vídeo, responsividade em viewport real, verificação visual | Todo sprint que tocar UI/player, registrado em `progress.md` com passos exatos |

## O que NÃO testamos (e por quê)

- **Estilo visual pixel-a-pixel:** Tailwind + revisão manual é suficiente para o escopo educacional; testes de snapshot de CSS teriam custo de manutenção alto sem benefício proporcional.
- **Bibliotecas de terceiros em si** (`hls.js`, Zustand, Zod): confiamos nos testes delas; testamos apenas **nosso uso** delas (ex.: nosso adapter chama `destroy()` corretamente).

## Registro de execução

Cada sprint, ao ser reportado como concluído, deve incluir nesta seção (ou em `progress.md`) o comando exato rodado e o resultado real (ex.: `vitest run` → `12 passed, 0 failed`). Nenhuma alegação de "testado" sem esse registro.
