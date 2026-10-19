import { useQuery } from "@tanstack/react-query";
import { getMovieGenres } from "../services/moviesApi";
import { moviesKeys } from "./moviesKeys";

/** `staleTime` alto: os gêneros só mudam se o acervo real mudar (ver
 * `movies.fixtures.ts`), algo raro — mesmo raciocínio de `useCategories`. */
export function useMovieGenres() {
  return useQuery({
    queryKey: moviesKeys.genres(),
    queryFn: getMovieGenres,
    staleTime: 5 * 60_000,
  });
}
