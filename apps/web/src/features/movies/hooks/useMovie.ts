import { useQuery } from "@tanstack/react-query";
import { getMovie } from "../services/moviesApi";
import { moviesKeys } from "./moviesKeys";

export function useMovie(id: string) {
  return useQuery({
    queryKey: moviesKeys.detail(id),
    queryFn: () => getMovie(id),
    enabled: id.length > 0,
  });
}
