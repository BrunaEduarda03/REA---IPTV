import { create } from "zustand";

/**
 * "Client state": estado que só existe no navegador, não representa nenhum
 * recurso do backend, e não precisa de cache/revalidação — o oposto do que
 * o TanStack Query resolve (ver features/health/hooks/useHealthQuery.ts).
 * Se um dia guardássemos aqui uma resposta HTTP, seria o sinal de que essa
 * store cresceu para o lugar errado.
 */
interface UiState {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  closeSidebar: () => set({ isSidebarOpen: false }),
}));
