import { NavLink } from "react-router-dom";
import { useUiStore } from "@/app/store/uiStore";

const NAV_ITEMS = [
  { to: "/", label: "Início", end: true },
  { to: "/catalogo", label: "Catálogo", end: false },
  { to: "/favoritos", label: "Favoritos", end: true },
];

/**
 * Navegação principal em sidebar — escolha deliberada de layout (não um
 * conjunto de abas horizontais no topo), para que a identidade visual desta
 * aplicação seja estruturalmente diferente da observada no alvo investigado,
 * não só uma troca de cores.
 */
export function Sidebar() {
  const isOpen = useUiStore((state) => state.isSidebarOpen);

  return (
    <aside
      aria-label="Navegação principal"
      className={`shrink-0 border-r border-border bg-surface-raised transition-all duration-200 ${
        isOpen ? "w-56" : "w-16"
      }`}
    >
      <nav className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `rounded-token px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-surface-overlay hover:text-text-primary"
              }`
            }
          >
            <span className={isOpen ? "" : "sr-only"}>{item.label}</span>
            <span aria-hidden={isOpen} className={isOpen ? "sr-only" : ""}>
              {item.label.charAt(0)}
            </span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
