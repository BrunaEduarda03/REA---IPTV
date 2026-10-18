import { useCatalogUiStore } from "../store/catalogUiStore";

const OPTIONS = [
  { mode: "grid", label: "Grade" },
  { mode: "list", label: "Lista" },
] as const;

export function ViewToggle() {
  const viewMode = useCatalogUiStore((state) => state.viewMode);
  const setViewMode = useCatalogUiStore((state) => state.setViewMode);

  return (
    <div role="group" aria-label="Modo de visualização" className="flex gap-1 rounded-token border border-border p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.mode}
          type="button"
          aria-pressed={viewMode === option.mode}
          onClick={() => setViewMode(option.mode)}
          className={`rounded-token px-3 py-1 text-xs font-medium transition-colors ${
            viewMode === option.mode
              ? "bg-accent text-surface-base"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
