import { NavLink } from "react-router-dom";
import { HomeIcon, GridIcon, FilmIcon, HeartIcon } from "@/components/ui/icons";

const NAV_ITEMS = [
  { to: "/", label: "Início", end: true, Icon: HomeIcon },
  { to: "/catalogo", label: "Catálogo", end: false, Icon: GridIcon },
  { to: "/filmes", label: "Filmes", end: false, Icon: FilmIcon },
  { to: "/favoritos", label: "Favoritos", end: true, Icon: HeartIcon },
];

/**
 * Barra inferior fixa, só abaixo do breakpoint `md` (ver `TopNavigation`,
 * que assume acima dele) — padrão observado no levantamento visual da
 * referência em viewports de tablet/celular (ver `visual-audit.md`):
 * nenhuma navegação horizontal no topo sobrevive em telas estreitas, vira
 * uma barra de abas no rodapé.
 */
export function MobileNavigation() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-10 flex items-stretch justify-around border-t border-border bg-surface-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      {NAV_ITEMS.map(({ to, label, end, Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors duration-base ${
              isActive ? "text-accent" : "text-text-muted"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}
