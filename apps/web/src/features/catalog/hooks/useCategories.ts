import { useQuery } from "@tanstack/react-query";
import { getCategories } from "../services/catalogApi";
import { catalogKeys } from "./catalogKeys";

/**
 * `staleTime` alto (5 min): categorias são dado quase estático neste
 * catálogo de demonstração — não há razão para refazer essa requisição
 * toda vez que o usuário troca de página/filtro.
 */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories(),
    queryFn: getCategories,
    staleTime: 5 * 60_000,
  });
}
