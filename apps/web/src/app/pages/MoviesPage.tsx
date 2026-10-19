import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { movieListQuerySchema } from "@saimotv/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/layout/PageHeader";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogSkeleton";
import { useMovies } from "@/features/movies/hooks/useMovies";
import { useMovieGenres } from "@/features/movies/hooks/useMovieGenres";
import { GenreFilter } from "@/features/movies/components/GenreFilter";
import { SortControl } from "@/features/movies/components/SortControl";
import { MovieGrid } from "@/features/movies/components/MovieGrid";
import { FeaturedSection } from "@/features/movies/components/FeaturedSection";

/**
 * Mesmo padrão de `CatalogPage.tsx`: gênero e ordenação vivem na URL
 * (`useSearchParams`), nunca em `useState`/Zustand — reproduzível por link,
 * sobrevive a F5. Diferente de `CatalogPage`, não há paginação (ADR-026:
 * o acervo real é pequeno e curado de propósito).
 *
 * Reorganizada na Sprint 02.5 (visual): `PageHeader` + `FeaturedSection`
 * (trilho com os mais recentes) + filtros + `MovieGrid` — ver
 * docs/implementation/visual-audit.md.
 */
export function MoviesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(() => movieListQuerySchema.parse(Object.fromEntries(searchParams)), [searchParams]);

  const genresQuery = useMovieGenres();
  const moviesQuery = useMovies(query);

  function patchParams(patch: { genre?: string; sort?: string }) {
    const next = new URLSearchParams(searchParams);
    if ("genre" in patch) {
      if (patch.genre) next.set("genre", patch.genre);
      else next.delete("genre");
    }
    if (patch.sort !== undefined) next.set("sort", patch.sort);
    setSearchParams(next);
  }

  const isInitialLoad = moviesQuery.isPending;
  // Só mostra o trilho "Em destaque" quando há itens o bastante para ele
  // não ser só uma cópia da grade logo abaixo — evita repetir os mesmos
  // pôsteres duas vezes quando o acervo ainda é pequeno (ver ADR-027).
  const showFeatured = !query.genre && query.sort === "recent" && (moviesQuery.data?.length ?? 0) > 4;

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Filmes"
        accent={moviesQuery.data ? `${moviesQuery.data.length} títulos` : undefined}
        description="Curtas-metragens reais, licenciados sob Creative Commons — pôster, sinopse, ano, gênero e nota vêm ao vivo do TMDB. Nenhum item fictício aqui."
        actions={<SortControl sort={query.sort} onChange={(sort) => patchParams({ sort })} />}
      />

      {showFeatured && moviesQuery.data && <FeaturedSection movies={moviesQuery.data.slice(0, 4)} />}

      <section className="flex flex-col gap-4">
        {genresQuery.data && genresQuery.data.length > 0 && (
          <GenreFilter
            genres={genresQuery.data}
            activeGenre={query.genre}
            onSelect={(genre) => patchParams({ genre })}
          />
        )}

        {isInitialLoad && <CatalogSkeleton count={6} />}

        {moviesQuery.isError && (
          <ErrorState
            message="Não foi possível carregar os filmes. Verifique se a API está em execução."
            onRetry={() => moviesQuery.refetch()}
          />
        )}

        {moviesQuery.data && moviesQuery.data.length === 0 && (
          <EmptyState
            title="Nenhum filme encontrado"
            description={
              query.genre
                ? "Tente outro gênero ou volte para “Todos”."
                : "Se isso for inesperado, confirme se TMDB_API_KEY está configurada em apps/api/.env — sem ela, nenhum filme real pode ser resolvido."
            }
          />
        )}

        {moviesQuery.data && moviesQuery.data.length > 0 && <MovieGrid movies={moviesQuery.data} />}
      </section>
    </div>
  );
}
