import type { MovieSort } from "@saimotv/shared";

const OPTIONS: { value: MovieSort; label: string }[] = [
  { value: "recent", label: "Mais recentes" },
  { value: "title_asc", label: "A-Z" },
];

interface SortControlProps {
  sort: MovieSort;
  onChange: (sort: MovieSort) => void;
}

/**
 * Controlado pela página (lê/escreve a URL via `useSearchParams`), não uma
 * store Zustand própria: ordenação é parte do que torna a busca de filmes
 * reproduzível por link, igual busca/categoria/página em `CatalogPage.tsx`
 * — mesmo raciocínio já documentado em `architecture.md`.
 */
export function SortControl({ sort, onChange }: SortControlProps) {
  return (
    <div role="group" aria-label="Ordenar por" className="flex gap-1 rounded-token border border-border p-0.5">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={sort === option.value}
          onClick={() => onChange(option.value)}
          className={`rounded-token px-3 py-1 text-xs font-medium transition-colors ${
            sort === option.value ? "bg-accent text-surface-base" : "text-text-secondary hover:text-text-primary"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
