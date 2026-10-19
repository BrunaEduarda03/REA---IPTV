import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { PageHeader } from "@/components/layout/PageHeader";
import { useChannels } from "@/features/catalog/hooks/useChannels";
import { ChannelCard } from "@/features/catalog/components/ChannelCard";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogSkeleton";
import { useFavoritesStore } from "@/features/favorites/store/favoritesStore";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";

/**
 * Não existe (nem precisa existir) um endpoint `/api/channels?ids=...` —
 * o catálogo inteiro cabe em uma página (`pageSize: 50` cobre os 20
 * conteúdos fictícios), então reaproveitamos `useChannels` (o mesmo hook
 * do catálogo) e filtramos no cliente pelos ids favoritados. Os IDS
 * favoritados são client state (Zustand); os DADOS dos canais continuam
 * vindo do servidor (TanStack Query) — nunca duplicamos o conteúdo de um
 * canal dentro do estado de favoritos, só a referência (id).
 */
export function FavoritesPage() {
  const favoriteIds = useFavoritesStore((state) => state.favoriteIds);
  const channelsQuery = useChannels({ page: 1, pageSize: 50, sort: "name_asc" });

  const favoriteChannels = (channelsQuery.data?.items ?? []).filter((channel) =>
    favoriteIds.includes(channel.id),
  );

  return (
    <section className="flex flex-col gap-4">
      <PageHeader title="Favoritos" description="Conteúdos que você marcou com a estrela no catálogo." />

      {channelsQuery.isPending && <CatalogSkeleton />}

      {channelsQuery.isError && (
        <ErrorState
          message="Não foi possível carregar seus favoritos. Verifique se a API está em execução."
          onRetry={() => channelsQuery.refetch()}
        />
      )}

      {channelsQuery.data && favoriteChannels.length === 0 && (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Marque conteúdos com a estrela no catálogo para vê-los aqui."
        />
      )}

      {favoriteChannels.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {favoriteChannels.map((channel) => (
            <ChannelCard
              key={channel.id}
              channel={channel}
              actions={<FavoriteButton channelId={channel.id} channelName={channel.name} />}
            />
          ))}
        </div>
      )}
    </section>
  );
}
