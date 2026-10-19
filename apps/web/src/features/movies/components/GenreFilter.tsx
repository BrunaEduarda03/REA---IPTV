interface GenreFilterProps {
  genres: string[];
  activeGenre?: string;
  onSelect: (genre: string | undefined) => void;
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

/**
 * Mesmo padrão visual de `features/catalog/components/CategoryFilter.tsx`,
 * mas deliberadamente um componente próprio: os gêneros aqui são strings
 * reais vindas do TMDB (`useMovieGenres`), não um `Category` com `id`/
 * `slug` — não existe um id estável de gênero no nosso domínio, só o nome.
 */
export function GenreFilter({ genres, activeGenre, onSelect }: GenreFilterProps) {
  return (
    <div role="group" aria-label="Filtrar por gênero" className="flex flex-wrap gap-2">
      <Pill label="Todos" active={!activeGenre} onClick={() => onSelect(undefined)} />
      {genres.map((genre) => (
        <Pill key={genre} label={genre} active={activeGenre === genre} onClick={() => onSelect(genre)} />
      ))}
    </div>
  );
}
