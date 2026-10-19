import { vi } from "vitest";
import type { Movie } from "@saimotv/shared";

/** Dados fictícios SÓ para testes de frontend — mesmo raciocínio de
 * `catalogFixtures.ts`: o frontend não deveria depender dos dados reais da
 * API, só do CONTRATO (schema) que ela expõe. Os "filmes" aqui são
 * inventados para teste; os reais só existem via a API/TMDB de verdade. */
export const mockMovieA: Movie = {
  id: "movie-a",
  title: "Um Filme de Teste",
  overview: "Sinopse de teste.",
  backdropUrl: "https://image.tmdb.org/t/p/w780/a.jpg",
  posterUrl: "https://image.tmdb.org/t/p/w342/a.jpg",
  releaseYear: 2012,
  genres: ["Animação", "Aventura"],
  rating: 7.8,
  streamUrl: "https://example.com/movie-a.m3u8",
};

export const mockMovieB: Movie = {
  id: "movie-b",
  title: "Outro Filme de Teste",
  overview: "Outra sinopse de teste.",
  backdropUrl: null,
  posterUrl: null,
  releaseYear: 2008,
  genres: ["Ficção científica"],
  rating: null,
  streamUrl: "https://example.com/movie-b.m3u8",
};

export const mockMovies: Movie[] = [mockMovieA, mockMovieB];

export function mockMoviesFetch(options?: { movies?: Movie[]; genres?: string[] }) {
  const movies = options?.movies ?? mockMovies;
  const genres = options?.genres ?? [...new Set(movies.flatMap((m) => m.genres))].sort();

  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));

    if (url.pathname === "/api/movies/genres") {
      return jsonResponse({ items: genres });
    }

    if (url.pathname === "/api/movies") {
      const genreFilter = url.searchParams.get("genre");
      const sort = url.searchParams.get("sort") ?? "recent";
      let items = genreFilter ? movies.filter((m) => m.genres.includes(genreFilter)) : [...movies];
      items =
        sort === "title_asc"
          ? items.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
          : items.sort((a, b) => (b.releaseYear ?? 0) - (a.releaseYear ?? 0));
      return jsonResponse({ items });
    }

    const match = /\/api\/movies\/(.+)$/.exec(url.pathname);
    if (match) {
      const movie = movies.find((m) => m.id === match[1]);
      if (!movie) return jsonResponse({ error: "Não encontrado" }, 404);
      return jsonResponse(movie);
    }

    throw new Error(`Rota não mockada: ${url.pathname}`);
  });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}
