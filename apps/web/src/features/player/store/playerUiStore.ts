import { create } from "zustand";

interface PlayerUiState {
  isTheaterMode: boolean;
  toggleTheaterMode: () => void;
}

/**
 * Preferência de "como ver" o player nesta sessão — não persistida de
 * propósito (ao contrário de favoritos): theater mode é um ajuste de
 * visualização momentâneo, não algo que a usuária espera encontrar ligado
 * ao reabrir a aplicação depois. Mesmo raciocínio já aplicado a
 * `catalogUiStore.viewMode` (grid/lista).
 */
export const usePlayerUiStore = create<PlayerUiState>((set) => ({
  isTheaterMode: false,
  toggleTheaterMode: () => set((state) => ({ isTheaterMode: !state.isTheaterMode })),
}));

export function useIsTheaterMode(): boolean {
  return usePlayerUiStore((state) => state.isTheaterMode);
}
