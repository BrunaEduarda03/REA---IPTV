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

## Sprint 02 — cobertura real do módulo de catálogo

| Pacote | Ferramenta | O que cobre | Resultado real |
|---|---|---|---|
| `packages/shared` | `bun test` | Validação dos schemas `category`/`channel`/`channelListQuery` (aceitação e rejeição) | 9 testes novos, 12 no total do pacote, 0 falhas |
| `apps/api` | `bun test` | Listagem de categorias, listagem/busca/filtro/ordenação/paginação de canais, paginação determinística (sem repetição entre páginas), 400 para parâmetros inválidos, 404 para id inexistente | 13 testes novos, 14 no total do pacote, 0 falhas |
| `apps/web` | `vitest run` + React Testing Library + `user-event` | Renderização de card (nome, descrição, selo de destaque, rótulo de status, link), esqueleto de loading, estado de erro com retry, estado vazio, busca com debounce (verificada pela URL da requisição real disparada), filtro por categoria, navegação para a página de detalhes ao clicar em um card | 12 testes novos, 16 no total do pacote, 0 falhas |

**Total Sprint 02: 34 testes novos. Total do monorepo após a sprint: 42 testes, 42 passando, 0 falhando** (comando: `bun run test`, executado e conferido — ver `progress.md` para o output completo).

### Decisão de teste notável: mock de `fetch` por rota, não por teste

Em vez de mockar `fetch` de forma ad-hoc em cada teste do frontend, `apps/web/src/tests/catalogFixtures.ts` centraliza um `mockCatalogFetch()` que inspeciona o `pathname` da URL chamada e decide a resposta — reaproveitado por todos os testes de `CatalogPage`. Isso evita duplicar a lógica de "se for /api/categories, devolva X" em oito testes diferentes, e deixa cada teste focado só no que é específico dele (ex.: só o teste de erro passa `channelsStatus: 500`).

## Sprint 03 — cobertura real do player

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `adapters/nativeAdapter.test.ts` | `attach` define `video.src`; `destroy` chama `removeAttribute("src")` + `load()`; `destroy` sem `attach` anterior não lança | 3 testes |
| `adapters/hlsAdapter.test.ts` | `attach` cria instância do `Hls` mockado, chama `loadSource`/`attachMedia`; `destroy` chama `hls.destroy()` na instância certa | 3 testes |
| `adapters/createAdapter.test.ts` | Seleção de motor: `.mp4` → nativo; `.m3u8` + suporte nativo → nativo (não baixa hls.js); `.m3u8` sem suporte nativo → hls.js | 3 testes |
| `hooks/useVideoPlayer.test.tsx` | Anexa o motor da fonte inicial; **trocar `src` destrói o motor anterior antes de criar o novo** (critério de aceitação explícito da sprint); desmontar destrói o motor ativo; eventos nativos `error`/`playing` atualizam `state.status` | 5 testes |
| `components/VideoPlayer.test.tsx` | Renderiza `<video>` com rótulo acessível; mostra "Carregando vídeo…" antes do motor terminar de anexar; expõe os controles (play/pause, volume) | 3 testes |

**Total Sprint 03: 17 testes novos. Total do monorepo após a sprint: 59 testes, 59 passando, 0 falhando.**

### Por que o teste do hook usa um `MediaSourceAdapter` falso, não o `hls.js` mockado diretamente

`useVideoPlayer.test.tsx` mocka o **módulo `createAdapter`** (não `hls.js`) e injeta dois adapters falsos (`adapterA`/`adapterB`), cada um só registrando quando `attach`/`destroy` são chamados. Isso testa exatamente o que o hook é responsável por garantir — a ORDEM de destruição/criação ao trocar de fonte — sem depender de nenhum detalhe de como o hls.js funciona por dentro (isso já está coberto, separadamente, por `hlsAdapter.test.ts`). Sem essa separação, o teste do hook ficaria acoplado a dois motores ao mesmo tempo, dificultando saber qual dos dois quebrou quando um teste falha.

### Verificação manual real (não substituível por teste automatizado)

Reprodução real testada em Chromium headless via `mcp__rea__capture_browser_scenario` (ver `progress.md` para os detalhes): clique em "Reproduzir" → manifesto HLS mestre carregado → hls.js escolheu entre as variantes de qualidade disponíveis → segmentos `.ts` baixados (HTTP 206) → vídeo "Big Buck Bunny" renderizado na tela, botão mudando para "Pausar". Zero erros de console. Nenhum teste automatizado prova que o vídeo *de fato aparece na tela* — só a verificação manual/visual faz isso, por isso ela é registrada aqui como parte da cobertura real da sprint, não como substituível pelos testes unitários.

## Sprint 04 — cobertura real de favoritos

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `lib/toggleFavoriteIds.test.ts` | Adiciona id ausente; remove id presente; não muta o array recebido; alternar duas vezes volta ao estado original | 4 testes |
| `lib/parseFavoriteIds.test.ts` | Aceita array de strings (vazio incluso); `test.each` com 7 formas de dado corrompido (string solta, número, objeto, `null`, `undefined`, array de números, array misto) — todas caem para `[]` | 11 testes |
| `store/favoritesStore.test.ts` | `toggleFavorite` adiciona/remove; persiste sob a chave `saimotv-lab:favorites`; nova instância do módulo lê o que foi persistido antes; `localStorage` com JSON inválido cai para `[]`; `localStorage` com shape inesperado (`favoriteIds` não é array de strings) cai para `[]` | 5 testes |
| `components/FavoriteButton.test.tsx` | Começa não marcado e alterna ao clicar (`aria-pressed`); clique atualiza a store compartilhada; clique dentro de um `<Link>` não navega (prova via `useLocation()`, não via mock de `preventDefault`) | 3 testes |
| `app/pages/FavoritesPage.test.tsx` | Estado vazio quando nada foi favoritado; lista só os favoritados, cruzando `favoriteIds` (client state) com dados do catálogo (server state); **fluxo completo**: favoritar em `CatalogPage` → desmontar → montar `FavoritesPage` → item aparece (prova de integração entre store singleton e composição de página) | 3 testes |

**Total Sprint 04: 24 testes novos** (nota: `parseFavoriteIds.test.ts` tem 2 testes diretos + 7 casos via `test.each`, mas apenas os 9 testes de corrupção e aceitação do arquivo somam 11 — ver contagem exata acima). **Total do monorepo após a sprint: 83 testes, 83 passando, 0 falhando.**

### Decisão de teste notável: `vi.resetModules()` + `import()` dinâmico para testar um store singleton

Zustand cria a store **uma vez**, na primeira importação do módulo — e a reidratação do `persist` a partir do `localStorage` acontece nesse exato momento. Isso significa que testar "o que acontece quando o app abre com `localStorage` já populado/corrompido" não é possível só chamando `useFavoritesStore.setState(...)` depois (a store já existe, já reidratou). A solução:

```typescript
beforeEach(() => {
  localStorage.clear();
  vi.resetModules(); // força o próximo import() a reavaliar o módulo do zero
});

test("localStorage corrompido não quebra a store", async () => {
  localStorage.setItem(STORAGE_KEY, "isto não é JSON {{{");
  const { useFavoritesStore } = await import("./favoritesStore"); // reidrata AGORA, com esse localStorage
  expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
});
```

Sem `vi.resetModules()`, o módulo ficaria em cache entre testes (comportamento padrão de `import()`/`require()`), e todos os testes dessa suíte compartilhariam a mesma instância já reidratada do primeiro teste a importar o módulo.

### Verificação manual real (não substituível por teste automatizado)

Fluxo favoritar → navegar → **recarregar de verdade** testado em Chromium real via `mcp__rea__capture_browser_scenario` (ver `progress.md`): clicar na estrela de "Horizonte Azul" em `/catalogo`, ir para `/favoritos`, confirmar que o item aparece, recarregar a página de fato (nova navegação HTTP, não um re-render em memória) e confirmar que o item continua lá — a prova de que a persistência é real (`localStorage` sobrevivendo a um reload do navegador), não só um efeito de estado React mantido em memória durante a sessão de teste automatizado. Zero erros de console.

## Sprint 05 — cobertura real de atalhos de teclado e modo cinema

| Arquivo de teste | O que cobre | Resultado real |
|---|---|---|
| `lib/mapKeyToAction.test.ts` | Espaço → `toggle-play`; `m`/`M` → `toggle-mute`; `ArrowUp`/`ArrowDown` → `volume-up`/`volume-down`; `t`/`T` → `toggle-theater`; qualquer outra tecla → `null` | 5 testes |
| `store/playerUiStore.test.ts` | Começa com `isTheaterMode: false`; `toggleTheaterMode` alterna o estado nos dois sentidos | 2 testes |
| `components/VideoPlayer.test.tsx` (3 testes novos) | Botão "Modo cinema" alterna `aria-pressed` e o estado compartilhado da store ao clicar; a tecla "T", com o player focado, também alterna o modo cinema; a tecla `ArrowDown`, com o player focado, reduz o valor refletido no slider de volume | 3 testes (total do arquivo: 6) |
| `app/pages/ChannelDetailPage.test.tsx` (novo arquivo) | Clicar em "Modo cinema" muda o atributo `data-theater-mode` do `<article>` da página de `"false"` para `"true"` — prova de que a composição (`ChannelDetailPage` lendo `useIsTheaterMode()`) funciona de ponta a ponta, não só o botão isolado | 1 teste |

**Total Sprint 05: 11 testes novos** (5 + 2 + 3 + 1). **Total do monorepo após a sprint: 94 testes, 94 passando, 0 falhando.**

### Decisão de teste notável: testar o atalho de teclado via `user.keyboard()` com o elemento focado, não via `fireEvent.keyDown` direto

```typescript
const player = screen.getByRole("group");
player.focus();
await user.keyboard("t");
expect(usePlayerUiStore.getState().isTheaterMode).toBe(true);
```

`user.keyboard()` (de `@testing-library/user-event`) despacha a sequência completa de eventos que um teclado real dispara (`keydown`/`keypress`/`keyup`), no elemento que está de fato focado no momento — diferente de `fireEvent.keyDown(elemento, { key: "t" })`, que dispara só o evento `keydown` manualmente no elemento indicado, sem passar pelo mecanismo real de foco do navegador. Como o próprio comportamento sendo testado é "o atalho só funciona com o player focado" (ADR-021), usar `user.keyboard()` depois de `player.focus()` testa exatamente essa dependência — um teste com `fireEvent.keyDown` não provaria que o foco importa, porque dispararia o evento independentemente de qualquer estado de foco real.

### Problema real encontrado por este teste (não hipotético)

O primeiro teste a de fato acionar `play()` (via atalho de espaço) revelou que `video.play().catch(...)` falha em `jsdom` porque `HTMLMediaElement.prototype.play()` devolve `undefined`, não uma `Promise`, nesse ambiente — um caso concreto de "o teste automatizado encontrou um bug que a verificação manual de navegador real (Sprint 03) nunca teria encontrado", porque em um navegador real `play()` sempre devolve uma `Promise`. Ver `progress.md` e `learning.md` para o detalhe completo. Corrigido em `useVideoPlayer.ts` com `Promise.resolve(video.play())`.

### Verificação manual real (não substituível por teste automatizado)

Modo cinema e atalhos de teclado testados em Chromium real via `mcp__rea__capture_browser_scenario` (ver `progress.md`): clique no botão "Modo cinema" alargando visivelmente o player; foco no player + tecla "T" alternando o estado sem erro; foco no player + três `ArrowDown` reduzindo visivelmente a posição do controle deslizante de volume (~70% da trilha, consistente com os 3 decrementos de 10%). Zero erros de console nas três execuções.
