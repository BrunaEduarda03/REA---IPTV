# Design System — SaimoTV Lab (Sprint 02.5)

> Identidade visual própria, informada pelos **padrões** observados na referência (ver `visual-audit.md`) — nunca pela cópia de cores, imagens ou CSS dela. Paleta e tokens já existiam desde a Sprint 01 (`tailwind.config.ts`, `styles/index.css`); esta sprint adiciona o que faltava para uma "experiência de catálogo" (sombras, raio maior, transições nomeadas, fundo cinematográfico) sem descartar nada do que já existia.

## Tokens semânticos

Todos vivem como variáveis CSS em `apps/web/src/styles/index.css` (`:root`), consumidos via `tailwind.config.ts` — um único lugar muda a aplicação inteira.

### Cor

| Token | Valor | Uso |
|---|---|---|
| `--color-surface-base` | `#0b0d12` | Fundo da aplicação |
| `--color-surface-raised` | `#14171f` | Navegação, cards elevados |
| `--color-surface-overlay` | `#1c2029` | Inputs, placeholders de imagem |
| `--color-accent` | `#f5a524` (âmbar) | Ações primárias, item ativo, nota, destaque |
| `--color-text-primary/secondary/muted` | — | Hierarquia de texto |

**Por que âmbar, não o ciano→roxo da referência**: decisão já tomada na Sprint 01 (ver `tailwind.config.ts`), reafirmada aqui — identidade própria, não uma recoloração do alvo observado.

### Raio, sombra, transição (novos nesta sprint)

| Token | Valor | Uso |
|---|---|---|
| `--radius-base` (`rounded-token`) | `0.75rem` | Cards, inputs, botões — já existia |
| `--radius-lg` (`rounded-xl2`) | `1.25rem` | Reservado para elementos maiores (não usado ainda — registrado para quando surgir um caso real) |
| `--shadow-card` (`shadow-card`) | sombra sutil, dupla camada | Pôsteres em repouso |
| `--shadow-elevated` (`shadow-elevated`) | sombra mais forte | Pôsteres em hover |
| `--ease-standard` / `--duration-base` | `cubic-bezier(0.22,1,0.36,1)` / `200ms` | Toda transição nova desta sprint (hover de pôster, nav ativa) |

### Fundo cinematográfico

`.bg-cinematic` (`styles/index.css`) — duas camadas de `radial-gradient` com `color-mix(in srgb, var(--color-accent) X%, transparent)` sobre `--color-surface-base`, `position: fixed`, `z-index: -1`. **Nenhuma imagem** — só gradiente, originalmente autoral. Aplicado uma vez em `AppShell`, nunca por página.

### Ícones

`components/ui/icons.tsx` — 6 ícones SVG inline desenhados à mão (traço 1.75px, sem preenchimento): `HomeIcon`, `GridIcon`, `FilmIcon`, `HeartIcon`, `SearchIcon`, `MenuIcon`. Ver ADR-027 para por que não uma biblioteca de ícones.

## Componentes criados nesta sprint

| Componente | Arquivo | Papel |
|---|---|---|
| `AppShell` | `components/layout/AppShell.tsx` | Casca da aplicação — substitui `PageShell` |
| `TopNavigation` | `components/layout/TopNavigation.tsx` | Navegação horizontal, `≥ lg` (1024px) |
| `MobileNavigation` | `components/layout/MobileNavigation.tsx` | Barra de abas fixa no rodapé, `< lg` |
| `PageHeader` | `components/layout/PageHeader.tsx` | Título + destaque + descrição + ações, reutilizado por Início/Catálogo/Filmes/Favoritos |
| `ContentRail` | `components/ui/ContentRail.tsx` | Trilho horizontal com scroll-snap nativo |
| `MoviePosterCard` | `features/movies/components/MoviePosterCard.tsx` | Card de pôster 2:3 (substitui `MovieCard`) |
| `MovieGrid` | `features/movies/components/MovieGrid.tsx` | Grade responsiva de `MoviePosterCard` |
| `FeaturedSection` | `features/movies/components/FeaturedSection.tsx` | `ContentRail` com os filmes mais recentes |

**Não criados como componentes separados** (decisão deliberada, não omissão):
- **"CategoryNavigation"**: já existia como `GenreFilter`/`CategoryFilter` (pílulas) desde Sprints 02/05 — restilizados para o novo sistema de tokens, não reescritos do zero, porque já cumpriam o mesmo papel visual.
- **"SearchInput"**: já existia (`features/catalog/components/SearchInput.tsx`), mantido como está — a lógica de busca (debounce + URL) não muda nesta sprint (regra explícita: "não alterar lógica de reprodução/backend").

## Responsividade

Breakpoint de navegação: `lg` (1024px), não `md` (768px) — ver `visual-audit.md`, "Nota sobre o breakpoint de navegação", para o porquê exato.

| Viewport | Navegação | Grade de pôsteres (`MovieGrid`) |
|---|---|---|
| `< 640px` | Barra de abas (rodapé) | 2 colunas |
| `640–1023px` | Barra de abas (rodapé) | 3 colunas |
| `1024–1279px` | Horizontal (topo) | 4 colunas |
| `≥ 1280px` | Horizontal (topo) | 5–6 colunas |

## Acessibilidade mantida/reforçada

- `:focus-visible` global (já existia, Sprint 01) continua cobrindo todo elemento novo — nenhum `outline: none` foi introduzido.
- `TopNavigation`/`MobileNavigation` usam `<nav aria-label="Navegação principal">` — duas navegações com o MESMO rótulo acessível coexistem no DOM (uma visível por vez via CSS); `AppShell.test.tsx` documenta e testa esse comportamento explicitamente.
- Ícones são `aria-hidden="true"` — o texto do link é que carrega o nome acessível, nunca só o ícone.
