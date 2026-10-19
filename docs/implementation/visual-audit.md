# Auditoria Visual — Sprint 02.5

> Levantamento visual da referência pública (`https://saimo-tv.pages.dev/movies`) comparado à nossa aplicação (`/filmes`), nos 4 viewports pedidos. Nenhum CSS, asset ou código foi extraído da referência — só observação visual via screenshot real (`mcp__rea__capture_browser_scenario`), a mesma ferramenta já usada em toda a Fase 05 (ver "Por que não usamos Playwright" em `visual-regression.md`).
>
> **Convenção de medidas:** valores com `≈` são **estimativas visuais** (medidas a partir do pixel da screenshot, não de inspeção de DOM/CSS computado — a ferramenta disponível não expõe isso). Valores sem `≈` são contagens ou textos diretamente legíveis na imagem (ex.: "4 categorias por linha").

## ETAPA 1 — O que foi observado na referência

| Viewport | Screenshot |
|---|---|
| 1440×900 | navegação horizontal completa, header "On Demand" + "34.415 títulos", 4 categorias, trilho "Em alta" com ~9 cards parcialmente visíveis |
| 1280×800 | mesmo padrão, levemente mais compacto |
| 768×1024 | navegação superior **desaparece**; barra inferior de abas (Início/Ao vivo/Eventos/Filmes e séries/Baixar app) assume; título dos pôsteres passa a aparecer abaixo da imagem |
| 390×844 | mesmo padrão do tablet, 1 categoria completa + fração da próxima (scroll horizontal), ~2 cards completos no trilho |

### Achados por tópico

1. **Navegação**: pílula horizontal no topo (logo + Buscar/Início/Ao vivo/Eventos/On Demand ativo/Favoritos/Rádios/"Baixar app") — desaparece por completo abaixo de ~768px, substituída por uma barra de abas fixa no rodapé (5 itens, ícone + rótulo).
2. **Header**: título grande (`≈ 40px`, peso bold/extrabold), subtítulo em verde-acento com contagem ("34.415 títulos"), parágrafo de descrição abaixo, tudo alinhado à esquerda.
3. **Espaçamento**: `≈ 24px` de respiro lateral consistente (`gutter`); seções separadas por `≈ 32-40px` verticais.
4. **Tipografia**: sans-serif bold para títulos, peso regular/medium para corpo — alto contraste (branco sobre fundo quase preto).
5. **Proporção dos pôsteres**: `≈ 2:3` (retrato) — medido por amostragem de largura/altura do card na screenshot.
6. **Cards por linha**: `≈ 9` (parcial) a 1440px no trilho "Em alta"; 4 categorias por linha a 1440/1280px, 2 (+ fração) a 768px, 1 (+ fração) a 390px.
7. **Trilhos horizontais**: scroll nativo, sem paginação visível, cards "cortados" na borda direita sinalizando mais conteúdo.
8. **Filtros/sub-navegação**: uma segunda barra pílula abaixo do header, combinando breadcrumb ("‹ Início"), abas de seção (On Demand/Filmes/Séries/Animes/Doramas), campo de busca e um botão de ordenação ("A a Z") — tudo numa única barra arredondada.
9. **Cards e badges**: cantos arredondados (`≈ 12px`), sem borda visível, sombra sutil; título do pôster some do card em telas largas (só aparece abaixo dele a partir do tablet, no espaço que sobra).
10. **Estados hover/focus**: **não capturados** — a ferramenta de automação disponível não tem uma ação de "hover" (só clique/preenchimento/tecla), e não acionamos nenhum clique na referência para não gerar nenhum efeito colateral na aplicação de terceiros. Tratado como limitação conhecida, não como "não existe".
11. **Background**: base escura quase preta, com uma imagem de pôster em destaque fortemente desfocada/escurecida sangrando do canto superior direito — tons quentes (vermelho/laranja/amarelo), cria uma sensação "cinematográfica" sem comprometer a legibilidade do texto por cima.
12. **Responsividade**: o mesmo conteúdo reflui de header+trilhos (desktop/tablet) para uma pilha vertical com barra de abas fixa (mobile) — a transição de navegação (topo → rodapé) acontece no mesmo ponto em que os cards deixam de caber confortavelmente lado a lado.
13. **Relação imagem/texto/interação**: pôster domina o card; metadado (título, e no card maior, contagem) é sempre texto simples, nunca sobre um botão — a área inteira do card é clicável (link).

## ETAPA 2 — Auditoria da nossa implementação (estado ANTES da Sprint 02.5)

| Componente | Referência | Implementação atual (pré-sprint) | Diferença | Correção proposta | Prioridade |
|---|---|---|---|---|---|
| Navegação principal | Horizontal, pílulas, topo; vira barra de abas no rodapé em telas estreitas | Sidebar administrativa fixa à esquerda (expansível/recolhível), barra superior estreita | Estrutura de dashboard admin, não de catálogo de entretenimento | Nova `AppShell` com `TopNavigation` (horizontal) + `MobileNavigation` (abas no rodapé) | **P0** |
| Cards de filme | Pôster vertical 2:3, imagem domina | `MovieCard` usava proporção 16:9 (igual aos canais fictícios) | Proporção errada para "filme" — parece card de vídeo genérico, não pôster de cinema | `MoviePosterCard` novo, `aspect-[2/3]`, usando `poster_path` do TMDB (não `backdrop_path`) | **P0** |
| Cabeçalho de página | Título grande + destaque numérico + descrição | `<header>` ad-hoc por página, título pequeno (`text-xl`), sem destaque numérico | Hierarquia tipográfica fraca | `PageHeader` reutilizável: título `text-3xl/4xl`, `accent` opcional, descrição | **P1** |
| Conteúdo em destaque | Trilho horizontal com scroll | Nenhum — só grade fixa | Falta a "sensação de catálogo vivo" que um trilho dá | `ContentRail` (scroll-snap nativo) + `FeaturedSection` em `/filmes` e `/` | **P1** |
| Background | Gradiente/imagem cinematográfica, iluminação difusa | Cor sólida (`--color-surface-base`) | Sem nenhum tratamento visual, "chapado" | `.bg-cinematic` (gradientes radiais originais, sem imagem) | **P1** |
| Densidade de conteúdo | Alta: categorias ilustradas + trilho + grade, tudo visível rolando pouco | Catálogo é só uma grade, sem seções | Sensação de app mais simples/vazio | `FeaturedSection` antes da grade em `/filmes` (quando há itens suficientes) | **P1** |
| Badges/selos | Sutil, sobre a imagem (ex.: contagem na categoria) | "DESTAQUE" como badge retangular pequeno, nota não existia | Sem indicação de avaliação | Selo de nota (`★ 7.8`) sobre o pôster, canto superior direito | **P2** |
| Filtros | Pílulas numa única barra com busca e ordenação juntos | `CategoryFilter`/`GenreFilter` já eram pílulas, mas numa barra separada da busca/ordenação | Estruturalmente parecido, só não unificado numa única barra | Mantido separado deliberadamente (ver `visual-regression.md`, "O que não foi replicado") | **P2** |
| Tipografia dos títulos | Bold/extrabold, grande | `font-bold`, `text-xl` (pequeno para um H1) | Hierarquia fraca | Resolvido junto com `PageHeader` (`text-3xl`/`text-4xl`, `font-extrabold`) | **P1** |
| Responsividade da navegação | Navegação muda de lugar (topo → rodapé) | Sidebar só "encolhia" (ícone), nunca saía da lateral | Sidebar lateral em mobile desperdiça largura preciosa | `TopNavigation`/`MobileNavigation` com breakpoint `lg` (ver nota abaixo) | **P0** |

### Nota sobre o breakpoint de navegação

A referência troca para a barra de abas **já em 768px** (tablet). Nossa primeira implementação usava o breakpoint `md` (768px) do Tailwind, o que faria a troca acontecer exatamente NESSE viewport — mas, testando, a navegação horizontal com 4 itens + busca ainda cabia tecnicamente em 768px, só com a logo quebrando linha de forma estranha ("SaimoTV" / "Lab"). Ajustado para o breakpoint `lg` (1024px): a 768px, nossa aplicação já usa a barra de abas, igual à referência; a diferença restante (nosso corte em 1024px vs. o corte real da referência, que não foi medido com precisão por não termos testado uma largura intermediária como 900px) fica registrada como uma estimativa não refinada, não um erro.

## Resumo de prioridades

- **P0 (estrutural, corrigido nesta sprint):** navegação (sidebar → horizontal/abas), proporção dos cards de filme (16:9 → 2:3).
- **P1 (visual relevante, corrigido nesta sprint):** cabeçalho de página, trilho horizontal, background cinematográfico, densidade de conteúdo.
- **P2 (refinamento, parcialmente corrigido/registrado como pendência):** selo de nota (corrigido), unificação da barra de filtros+busca+ordenação (deliberadamente não replicada — ver `visual-regression.md`).
