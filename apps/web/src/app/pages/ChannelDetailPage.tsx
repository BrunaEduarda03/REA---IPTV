import { Link, useParams } from "react-router-dom";
import { ErrorState } from "@/components/ui/ErrorState";
import { useChannel } from "@/features/catalog/hooks/useChannel";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { channelStatusLabel } from "@/features/catalog/lib/statusLabels";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { getDemoStreamUrl } from "@/features/player/lib/demoStream";
import { useIsTheaterMode } from "@/features/player/store/playerUiStore";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";

function DetailSkeleton() {
  return (
    <div aria-hidden="true" className="mx-auto flex max-w-2xl animate-pulse flex-col gap-4">
      <div className="aspect-video w-full rounded-token bg-surface-overlay" />
      <div className="h-6 w-1/2 rounded bg-surface-overlay" />
      <div className="h-4 w-full rounded bg-surface-overlay" />
      <div className="h-4 w-3/4 rounded bg-surface-overlay" />
    </div>
  );
}

export function ChannelDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const channelQuery = useChannel(id);
  const categoriesQuery = useCategories();
  const isTheaterMode = useIsTheaterMode();

  const category = categoriesQuery.data?.find((item) => item.id === channelQuery.data?.categoryId);

  return (
    <article
      data-theater-mode={isTheaterMode}
      className={`mx-auto flex flex-col gap-4 transition-[max-width] ${
        isTheaterMode ? "max-w-5xl" : "max-w-2xl"
      }`}
    >
      <Link to="/catalogo" className="w-fit text-sm text-accent hover:underline">
        ← Voltar ao catálogo
      </Link>

      {channelQuery.isPending && <DetailSkeleton />}

      {channelQuery.isError && (
        <ErrorState
          message="Não foi possível carregar este conteúdo. Ele pode não existir mais."
          onRetry={() => channelQuery.refetch()}
        />
      )}

      {channelQuery.data && (
        <>
          {channelQuery.data.status === "available" ? (
            <VideoPlayer
              src={getDemoStreamUrl(channelQuery.data.categoryId)}
              poster={channelQuery.data.tmdb?.backdropUrl ?? channelQuery.data.thumbnail}
              title={channelQuery.data.name}
            />
          ) : (
            <img
              src={channelQuery.data.tmdb?.backdropUrl ?? channelQuery.data.thumbnail}
              alt=""
              className="aspect-video w-full rounded-token object-cover"
            />
          )}
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-text-primary">{channelQuery.data.name}</h1>
              {channelQuery.data.isFeatured && (
                <span className="rounded-full bg-accent-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                  Destaque
                </span>
              )}
              {channelQuery.data.tmdb?.releaseYear && (
                <span className="text-xs font-medium text-text-muted">{channelQuery.data.tmdb.releaseYear}</span>
              )}
              <FavoriteButton channelId={channelQuery.data.id} channelName={channelQuery.data.name} />
            </div>
            {category && <p className="text-sm text-text-muted">{category.name}</p>}
          </div>
          {/* `||`, não `??`: o TMDB às vezes devolve `overview: ""` para um
              idioma sem tradução comunitária completa — uma sinopse vazia
              não deveria "vencer" a descrição fictícia de fallback. */}
          <p className="text-text-secondary">{channelQuery.data.tmdb?.overview || channelQuery.data.description}</p>
          <p className="text-xs font-medium text-text-muted">
            Status: {channelStatusLabel[channelQuery.data.status]}
          </p>
          {channelQuery.data.tmdb && (
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
          )}
        </>
      )}
    </article>
  );
}
