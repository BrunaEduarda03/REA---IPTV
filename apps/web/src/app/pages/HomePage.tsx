import { Link } from "react-router-dom";
import { PageHeader } from "@/components/layout/PageHeader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ContentRail } from "@/components/ui/ContentRail";
import { ChannelCard } from "@/features/catalog/components/ChannelCard";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogSkeleton";
import { useChannels } from "@/features/catalog/hooks/useChannels";
import { FavoriteButton } from "@/features/favorites/components/FavoriteButton";

const PRIMARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-token bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-hover";
const SECONDARY_LINK_CLASSES =
  "inline-flex items-center justify-center rounded-token border border-border px-4 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary";

/**
 * Página inicial (reorganizada na Sprint 02.5 — ver visual-audit.md):
 * `PageHeader` + um trilho horizontal de destaques, no lugar da grade fixa
 * de antes. Busca os primeiros destaques do catálogo real (mesma API usada
 * por `/catalogo`) para a home nunca ficar sem conteúdo visível.
 */
export function HomePage() {
  const featuredQuery = useChannels({ page: 1, pageSize: 8, sort: "featured_first" });

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="SaimoTV Lab"
        description="Laboratório educacional de full stack: catálogo fictício com busca e categorias, filmes reais licenciados sob Creative Commons com metadados do TMDB, player com seleção automática de motor, favoritos persistidos localmente, e atalhos de teclado com modo cinema."
        actions={
          <div className="flex flex-wrap gap-3">
            <Link to="/filmes" className={PRIMARY_LINK_CLASSES}>
              Ver filmes
            </Link>
            <Link to="/catalogo" className={SECONDARY_LINK_CLASSES}>
              Explorar catálogo
            </Link>
          </div>
        }
      />

      {featuredQuery.isPending && <CatalogSkeleton />}

      {featuredQuery.isError && (
        <ErrorState
          message="Não foi possível carregar os destaques. Verifique se a API está em execução."
          onRetry={() => featuredQuery.refetch()}
        />
      )}

      {featuredQuery.data && (
        <ContentRail title="Em destaque">
          {featuredQuery.data.items.map((channel) => (
            <div key={channel.id} className="w-48 shrink-0 sm:w-56">
              <ChannelCard channel={channel} actions={<FavoriteButton channelId={channel.id} channelName={channel.name} />} />
            </div>
          ))}
        </ContentRail>
      )}
    </div>
  );
}
