import type { Movie } from "@saimotv/shared";
import { MoviePosterCard } from "./MoviePosterCard";

interface MovieGridProps {
  movies: Movie[];
}

/**
 * Grade responsiva de pôsteres 2:3 — 2 colunas no celular, até 6 em telas
 * largas (ver visual-audit.md para a contagem observada na referência por
 * viewport). Extraído de `MoviesPage.tsx` para ser testável/reutilizável
 * isoladamente (Sprint 02.5).
 */
export function MovieGrid({ movies }: MovieGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {movies.map((movie) => (
        <MoviePosterCard key={movie.id} movie={movie} />
      ))}
    </div>
  );
}
