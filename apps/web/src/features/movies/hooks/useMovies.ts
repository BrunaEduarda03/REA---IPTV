import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { MovieListQuery } from "@saimotv/shared";
import { getMovies } from "../services/moviesApi";
import { moviesKeys } from "./moviesKeys";

export function useMovies(query: MovieListQuery) {
  return useQuery({
    queryKey: moviesKeys.list(query),
    queryFn: () => getMovies(query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
