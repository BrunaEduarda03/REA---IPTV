import { Link, useParams } from "react-router-dom";
import { ErrorState } from "@/components/ui/ErrorState";
import { useMovie } from "@/features/movies/hooks/useMovie";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { useIsTheaterMode } from "@/features/player/store/playerUiStore";

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-2xl animate-pulse flex-col gap-4">
      <div className="aspect-video w-full rounded-token bg-surface-overlay" />
      <div className="h-6 w-1/2 rounded bg-surface-overlay" />
      <div className="h-4 w-full rounded bg-surface-overlay" />
    </div>
  );
}

/**
 * Reproduz `movie.streamUrl` diretamente — diferente de `ChannelDetailPage`
 * (que usa `getDemoStreamUrl(categoryId)`, uma fonte por CATEGORIA), aqui
 * cada filme real já tem a sua própria fonte (ver `movies.fixtures.ts`):
 * é, finalmente, "um vídeo por conteúdo" — o próximo degrau que ADR-022
 * tinha deixado registrado como evolução futura.
 */
export function MovieDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const movieQuery = useMovie(id);
  const isTheaterMode = useIsTheaterMode();

  return (
    <article
      data-theater-mode={isTheaterMode}
      className={`mx-auto flex flex-col gap-4 transition-[max-width] ${isTheaterMode ? "max-w-5xl" : "max-w-2xl"}`}
    >
      <Link to="/filmes" className="w-fit text-sm text-accent hover:underline">
        ← Voltar aos filmes
      </Link>

      {movieQuery.isPending && <DetailSkeleton />}

      {movieQuery.isError && (
        <ErrorState
          message="Não foi possível carregar este filme. Ele pode não estar mais disponível."
          onRetry={() => movieQuery.refetch()}
        />
      )}

      {movieQuery.data && (
        <>
          <VideoPlayer
            src={movieQuery.data.streamUrl}
            poster={movieQuery.data.backdropUrl ?? undefined}
            title={movieQuery.data.title}
            isRealContent
          />

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{movieQuery.data.title}</h1>
              {movieQuery.data.releaseYear && (
                <span className="text-xs font-medium text-text-muted">{movieQuery.data.releaseYear}</span>
              )}
              {movieQuery.data.rating && (
                <span className="text-xs font-semibold text-accent">★ {movieQuery.data.rating.toFixed(1)}</span>
              )}
            </div>
            {movieQuery.data.genres.length > 0 && (
              <p className="text-sm text-text-muted">{movieQuery.data.genres.join(" · ")}</p>
            )}
          </div>

          <p className="text-text-secondary">{movieQuery.data.overview}</p>

          <p className="text-[10px] text-text-muted">
            Dados de{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-text-secondary"
            >
              TMDB
            </a>{" "}
            — este produto usa a API do TMDB, mas não é endossado ou certificado pelo TMDB.
          </p>
        </>
      )}
    </article>
  );
}
