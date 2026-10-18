import { create } from "zustand";

export type ViewMode = "grid" | "list";

interface CatalogUiState {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

/**
 * Por que isso é Zustand, e por que busca/categoria/página NÃO são
 * (ficam na URL, ver app/pages/CatalogPage.tsx): o modo de visualização é
 * uma preferência de "como ver", não parte do que torna uma busca
 * compartilhável — ninguém espera que um link enviado a outra pessoa force
 * o modo de visualização dela. Já busca/filtro/página SÃO parte do que faz
 * o link reproduzível (dar F5 ou compartilhar o link deveria mostrar a
 * mesma coisa). Nenhum desses dois estados é duplicado no outro lugar.
 */
export const useCatalogUiStore = create<CatalogUiState>((set) => ({
  viewMode: "grid",
  setViewMode: (viewMode) => set({ viewMode }),
}));
