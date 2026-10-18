interface CatalogSkeletonProps {
  count?: number;
}

export function CatalogSkeleton({ count = 8 }: CatalogSkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="catalog-skeleton"
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse space-y-2">
          <div className="aspect-video rounded-token bg-surface-overlay" />
          <div className="h-3 w-3/4 rounded bg-surface-overlay" />
          <div className="h-2 w-full rounded bg-surface-overlay" />
        </div>
      ))}
    </div>
  );
}
