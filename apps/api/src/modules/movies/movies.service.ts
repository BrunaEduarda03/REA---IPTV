import type { Movie, MovieListQuery } from "@saimotv/shared";
import { env } from "../../lib/env";
import { searchMovie } from "../../lib/tmdb/tmdbClient";
import { movieSeeds, type MovieSeed } from "./movies.fixtures";

/**
 * Resolve UM filme real a partir do seed. Diferente de `catalog.service.ts`
 * (onde um canal sem TMDB ainda é um canal válido, com dados fictícios de
 * fallback), aqui um filme sem dados reais simplesmente NÃO é um filme —
 * devolve `null`, e o chamador o remove da lista. `/filmes` é 100% sobre
 * conteúdo real; não existe "filme fictício de fallback" aqui (ver ADR-026).
 */
async function resolveMovie(seed: MovieSeed): Promise<Movie | null> {
  const tmdb = await searchMovie(env.TMDB_API_KEY, seed.tmdbQuery.title, seed.tmdbQuery.year);
  if (!tmdb) return null;

  return {
    id: seed.id,
    title: tmdb.title,
    overview: tmdb.overview,
    backdropUrl: tmdb.backdropUrl,
    posterUrl: tmdb.posterUrl,
    releaseYear: tmdb.releaseYear,
    genres: tmdb.genres,
    rating: tmdb.rating,
    streamUrl: seed.streamUrl,
  };
}

async function resolveAllMovies(): Promise<Movie[]> {
  const resolved = await Promise.all(movieSeeds.map(resolveMovie));
  return resolved.filter((movie): movie is Movie => movie !== null);
}

function sortMovies(movies: Movie[], sort: MovieListQuery["sort"]): Movie[] {
  const byTitleAsc = (a: Movie, b: Movie) => a.title.localeCompare(b.title, "pt-BR");

  if (sort === "title_asc") {
    return [...movies].sort(byTitleAsc);
  }
  // "recent" (padrão): ano mais alto primeiro; sem ano conhecido vai por
  // último; desempate por título para ordem sempre determinística.
  return [...movies].sort((a, b) => (b.releaseYear ?? -1) - (a.releaseYear ?? -1) || byTitleAsc(a, b));
}

export const moviesService = {
  async listMovies(query: MovieListQuery): Promise<Movie[]> {
    let movies = await resolveAllMovies();

    if (query.genre) {
      movies = movies.filter((movie) => movie.genres.includes(query.genre!));
    }

    return sortMovies(movies, query.sort);
  },

  async getMovie(id: string): Promise<Movie | null> {
    const seed = movieSeeds.find((item) => item.id === id);
    if (!seed) return null;
    return resolveMovie(seed);
  },

  /** Lista só os gêneros que de fato aparecem no catálogo real atual — não
   * a lista completa de gêneros que o TMDB conhece (a maioria nunca
   * apareceria, já que o acervo aqui é pequeno e curado). */
  async listGenres(): Promise<string[]> {
    const movies = await resolveAllMovies();
    const genres = new Set<string>();
    movies.forEach((movie) => movie.genres.forEach((genre) => genres.add(genre)));
    return [...genres].sort((a, b) => a.localeCompare(b, "pt-BR"));
  },
};
