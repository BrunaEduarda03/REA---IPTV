import { Link } from "react-router-dom";
import type { Movie } from "@saimotv/shared";
import { FilmIcon } from "@/components/ui/icons";

interface MoviePosterCardProps {
  movie: Movie;
  /** Largura fixa (trilho horizontal) vs. flexível (grade) — ver
   * `ContentRail`/`MovieGrid`. Mesma estrutura visual nos dois casos. */
  fixedWidth?: boolean;
}

/**
 * Card de pôster vertical (2:3) — Sprint 02.5, ADR-027. Substitui o antigo
 * `MovieCard` (pôster "paisagem" 16:9, mesma proporção do catálogo de
 * canais fictícios) por uma proporção de pôster de cinema real, usando
 * `movie.posterUrl` (montado a partir de `poster_path` do TMDB + a base
 * oficial de imagens — ver `tmdbClient.ts`).
 */
export function MoviePosterCard({ movie, fixedWidth }: MoviePosterCardProps) {
  return (
    <Link
      to={`/filmes/${movie.id}`}
      className={`group flex flex-col gap-2 ${fixedWidth ? "w-36 shrink-0 sm:w-44" : ""}`}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-token bg-surface-overlay shadow-card transition-transform duration-base ease-standard group-hover:-translate-y-1 group-hover:shadow-elevated">
        {movie.posterUrl ? (
          <img
            src={movie.posterUrl}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-text-muted">
            <FilmIcon className="h-8 w-8" />
            <span className="text-[11px]">Sem pôster</span>
          </div>
        )}

        {movie.rating && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-surface-base/85 px-1.5 py-0.5 text-[10px] font-semibold text-accent backdrop-blur">
            ★ {movie.rating.toFixed(1)}
          </span>
        )}

        <div className="absolute inset-0 rounded-token ring-1 ring-inset ring-white/10 transition-colors duration-base group-hover:ring-accent/60" />
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold text-text-primary">{movie.title}</h3>
        <p className="truncate text-xs text-text-muted">
          {[movie.releaseYear, movie.genres[0]].filter(Boolean).join(" · ")}
        </p>
      </div>
    </Link>
  );
}
