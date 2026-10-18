import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { parseFavoriteIds } from "../lib/parseFavoriteIds";
import { toggleFavoriteIds } from "../lib/toggleFavoriteIds";

interface FavoritesState {
  favoriteIds: string[];
  toggleFavorite: (id: string) => void;
}

/**
 * Por que Zustand + `persist` aqui (e não um `useEffect` manual
 * sincronizando com `localStorage`, como seria o jeito "cru"): favoritos
 * precisam ser lidos/escritos por componentes não aparentados
 * (`ChannelCard` no catálogo, `ChannelDetailPage`, `FavoritesPage`) — é
 * exatamente o "client state compartilhado" que justificou escolher
 * Zustand desde a Sprint 01 (ADR-003). O middleware `persist` é a peça do
 * próprio Zustand feita para este problema específico (sincronizar uma
 * store com `localStorage`); escrever isso à mão reimplementaria o que a
 * lib já resolve corretamente — incluindo não escrever em cada render.
 *
 * A validação de corrupção (`merge`) é o que `persist` NÃO resolve sozinho:
 * por padrão, ele confiaria cegamente no que está salvo. `parseFavoriteIds`
 * (função pura, testada separadamente) é quem garante que um valor
 * corrompido vira lista vazia, nunca um erro.
 */
export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set) => ({
      favoriteIds: [],
      toggleFavorite: (id) => set((state) => ({ favoriteIds: toggleFavoriteIds(state.favoriteIds, id) })),
    }),
    {
      name: "saimotv-lab:favorites",
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => ({
        ...current,
        favoriteIds: parseFavoriteIds((persisted as { favoriteIds?: unknown } | null)?.favoriteIds),
      }),
    },
  ),
);

export function useIsFavorite(id: string): boolean {
  return useFavoritesStore((state) => state.favoriteIds.includes(id));
}
