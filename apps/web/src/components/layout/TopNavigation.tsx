import { NavLink } from "react-router-dom";
import { ConnectionStatus } from "@/features/health/components/ConnectionStatus";
import { HomeIcon, GridIcon, FilmIcon, HeartIcon, SearchIcon } from "@/components/ui/icons";

const NAV_ITEMS = [
  { to: "/", label: "Início", end: true, Icon: HomeIcon },
  { to: "/catalogo", label: "Catálogo", end: false, Icon: GridIcon },
  { to: "/filmes", label: "Filmes", end: false, Icon: FilmIcon },
  { to: "/favoritos", label: "Favoritos", end: true, Icon: HeartIcon },
];

/**
 * Navegação principal horizontal (Sprint 02.5) — substitui a sidebar
 * administrativa. Visível só a partir do breakpoint `md` (abaixo disso,
 * `MobileNavigation` assume); ver ADR-027 para a decisão completa e o
 * levantamento visual que motivou a troca.
 */
export function TopNavigation() {
  return (
    <header className="sticky top-0 z-10 hidden items-center gap-6 border-b border-border/60 bg-surface-base/80 px-gutter py-3 backdrop-blur lg:flex">
      <NavLink to="/" className="flex items-center gap-2 whitespace-nowrap text-sm font-bold tracking-wide text-text-primary">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-surface-base">▶</span>
        SaimoTV Lab
      </NavLink>

      <nav aria-label="Navegação principal" className="flex items-center gap-1 rounded-full border border-border bg-surface-raised p-1">
        {NAV_ITEMS.map(({ to, label, end, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-base ${
                isActive
                  ? "bg-accent text-surface-base"
                  : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {import.meta.env.DEV && <ConnectionStatus />}
        <NavLink
          to="/catalogo"
          aria-label="Buscar"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-text-secondary transition-colors duration-base hover:border-border-strong hover:text-text-primary"
        >
          <SearchIcon className="h-4 w-4" />
        </NavLink>
      </div>
    </header>
  );
}
