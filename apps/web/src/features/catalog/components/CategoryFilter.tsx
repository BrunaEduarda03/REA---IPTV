import type { Category } from "@saimotv/shared";

interface CategoryFilterProps {
  categories: Category[];
  activeCategoryId?: string;
  onSelect: (categoryId: string | undefined) => void;
}

function Pill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-accent bg-accent-muted text-accent"
          : "border-border text-text-secondary hover:border-border-strong hover:text-text-primary"
      }`}
    >
      {label}
    </button>
  );
}

export function CategoryFilter({ categories, activeCategoryId, onSelect }: CategoryFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por categoria" className="flex flex-wrap gap-2">
      <Pill label="Todos" active={!activeCategoryId} onClick={() => onSelect(undefined)} />
      {categories.map((category) => (
        <Pill
          key={category.id}
          label={category.name}
          active={activeCategoryId === category.id}
          onClick={() => onSelect(category.id)}
        />
      ))}
    </div>
  );
}
