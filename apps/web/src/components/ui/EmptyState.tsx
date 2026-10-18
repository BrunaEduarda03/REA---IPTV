interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center gap-1 rounded-token border border-dashed border-border py-16 text-center"
    >
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      {description && <p className="max-w-xs text-xs text-text-secondary">{description}</p>}
    </div>
  );
}
