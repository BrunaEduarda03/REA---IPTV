import {
  movieListResponseSchema,
  movieGenreListResponseSchema,
  movieSchema,
  type Movie,
  type MovieListQuery,
} from "@saimotv/shared";
import { apiGet } from "@/lib/httpClient";

/** Mesmo padrão de `catalogApi.ts` (ADR-009): cada resposta é validada com
 * o MESMO schema que o backend usa para construí-la. */

export async function getMovies(query: MovieListQuery): Promise<Movie[]> {
  const params = new URLSearchParams();
  if (query.genre) params.set("genre", query.genre);
  params.set("sort", query.sort);

  const data = await apiGet<unknown>(`/api/movies?${params.toString()}`);
  return movieListResponseSchema.parse(data).items;
}

export async function getMovieGenres(): Promise<string[]> {
  const data = await apiGet<unknown>("/api/movies/genres");
  return movieGenreListResponseSchema.parse(data).items;
}

export async function getMovie(id: string): Promise<Movie> {
  const data = await apiGet<unknown>(`/api/movies/${encodeURIComponent(id)}`);
  return movieSchema.parse(data);
}
