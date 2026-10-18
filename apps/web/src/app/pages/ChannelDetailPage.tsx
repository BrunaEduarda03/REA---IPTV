import { Link, useParams } from "react-router-dom";
import { ErrorState } from "@/components/ui/ErrorState";
import { useChannel } from "@/features/catalog/hooks/useChannel";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { channelStatusLabel } from "@/features/catalog/lib/statusLabels";
import { VideoPlayer } from "@/features/player/components/VideoPlayer";
import { DEMO_STREAM_URL } from "@/features/player/lib/demoStream";

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

  const category = categoriesQuery.data?.find((item) => item.id === channelQuery.data?.categoryId);

  return (
    <article className="mx-auto flex max-w-2xl flex-col gap-4">
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
              src={DEMO_STREAM_URL}
              poster={channelQuery.data.thumbnail}
              title={channelQuery.data.name}
            />
          ) : (
            <img
              src={channelQuery.data.thumbnail}
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
            </div>
            {category && <p className="text-sm text-text-muted">{category.name}</p>}
          </div>
          <p className="text-text-secondary">{channelQuery.data.description}</p>
          <p className="text-xs font-medium text-text-muted">
            Status: {channelStatusLabel[channelQuery.data.status]}
          </p>
        </>
      )}
    </article>
  );
}
