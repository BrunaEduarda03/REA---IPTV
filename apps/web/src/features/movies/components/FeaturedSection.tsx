import type { Movie } from "@saimotv/shared";
import { ContentRail } from "@/components/ui/ContentRail";
import { MoviePosterCard } from "./MoviePosterCard";

interface FeaturedSectionProps {
  movies: Movie[];
}

/**
 * Trilho "Em destaque" no topo de `/filmes` (Sprint 02.5) — os mesmos
 * dados de `useMovies({ sort: "recent" })`, só os 4 primeiros, num trilho
 * horizontal em vez de grade. Espelha o padrão "Em alta" observado na
 * referência (ver visual-audit.md) com conteúdo 100% nosso.
 */
export function FeaturedSection({ movies }: FeaturedSectionProps) {
  if (movies.length === 0) return null;

  return (
    <ContentRail title="Em destaque">
      {movies.map((movie) => (
        <MoviePosterCard key={movie.id} movie={movie} fixedWidth />
      ))}
    </ContentRail>
  );
}
