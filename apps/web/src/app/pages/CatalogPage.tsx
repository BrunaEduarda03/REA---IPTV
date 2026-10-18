import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { channelListQuerySchema } from "@saimotv/shared";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { useCategories } from "@/features/catalog/hooks/useCategories";
import { useChannels } from "@/features/catalog/hooks/useChannels";
import { useCatalogUiStore } from "@/features/catalog/store/catalogUiStore";
import { CategoryFilter } from "@/features/catalog/components/CategoryFilter";
import { SearchInput } from "@/features/catalog/components/SearchInput";
import { ChannelCard } from "@/features/catalog/components/ChannelCard";
import { CatalogSkeleton } from "@/features/catalog/components/CatalogSkeleton";
import { Pagination } from "@/features/catalog/components/Pagination";
import { ViewToggle } from "@/features/catalog/components/ViewToggle";

/**
 * Busca, categoria e página vivem na URL (`useSearchParams`), nunca em
 * `useState`/Zustand: isso é o que torna "voltar" no navegador, recarregar
 * a página (F5) ou compartilhar o link reproduzir exatamente a mesma busca.
 * O MESMO schema Zod que valida a query no backend (`channelListQuerySchema`)
 * é usado aqui para interpretar os parâmetros — nenhuma regra duplicada.
 */
export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const query = useMemo(
    () => channelListQuerySchema.parse(Object.fromEntries(searchParams)),
    [searchParams],
  );

  const categoriesQuery = useCategories();
  const channelsQuery = useChannels(query);
  const viewMode = useCatalogUiStore((state) => state.viewMode);

  function patchParams(patch: { search?: string; categoryId?: string; page?: number }) {
    const next = new URLSearchParams(searchParams);

    if (patch.search !== undefined) {
      if (patch.search) next.set("search", patch.search);
      else next.delete("search");
      next.delete("page");
    }

    if ("categoryId" in patch) {
      if (patch.categoryId) next.set("categoryId", patch.categoryId);
      else next.delete("categoryId");
      next.delete("page");
    }

    if (patch.page !== undefined) next.set("page", String(patch.page));

    setSearchParams(next);
  }

  const data = channelsQuery.data;
  const isInitialLoad = channelsQuery.isPending;
  const isRefreshing = channelsQuery.isFetching && !isInitialLoad;

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Catálogo</h1>
          <p className="text-sm text-text-secondary">
            Conteúdos de demonstração — dados fictícios criados para este laboratório.
          </p>
        </div>
        <ViewToggle />
      </header>

      <SearchInput value={query.search ?? ""} onChange={(value) => patchParams({ search: value })} />

      {categoriesQuery.data && (
        <CategoryFilter
          categories={categoriesQuery.data}
          activeCategoryId={query.categoryId}
          onSelect={(categoryId) => patchParams({ categoryId })}
        />
      )}

      {isRefreshing && (
        <p role="status" aria-live="polite" className="text-xs text-text-muted">
          Atualizando…
        </p>
      )}

      {isInitialLoad && <CatalogSkeleton />}

      {channelsQuery.isError && (
        <ErrorState
          message="Não foi possível carregar o catálogo. Verifique se a API está em execução."
          onRetry={() => channelsQuery.refetch()}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          title="Nenhum conteúdo encontrado"
          description="Tente ajustar a busca ou remover os filtros aplicados."
        />
      )}

      {data && data.items.length > 0 && (
        <>
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
                : "flex flex-col gap-2"
            }
          >
            {data.items.map((channel) => (
              <ChannelCard key={channel.id} channel={channel} viewMode={viewMode} />
            ))}
          </div>

          <Pagination page={data.page} totalPages={data.totalPages} onPageChange={(page) => patchParams({ page })} />
        </>
      )}
    </section>
  );
}
