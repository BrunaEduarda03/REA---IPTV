import { describe, expect, test } from "bun:test";
import { movieSchema, movieListQuerySchema } from "./movies";

describe("movieSchema", () => {
  const valid = {
    id: "big-buck-bunny",
    title: "Big Buck Bunny",
    overview: "Um coelho gigante e gentil é provocado por três roedores valentões.",
    backdropUrl: "https://image.tmdb.org/t/p/w780/abc.jpg",
    posterUrl: "https://image.tmdb.org/t/p/w342/abc.jpg",
    releaseYear: 2008,
    genres: ["Animação", "Aventura"],
    rating: 7.8,
    streamUrl: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  };

  test("aceita um filme válido", () => {
    expect(movieSchema.safeParse(valid).success).toBe(true);
  });

  test("aceita backdropUrl, posterUrl, rating e releaseYear nulos (TMDB encontrado, mas sem essas informações)", () => {
    expect(
      movieSchema.safeParse({ ...valid, backdropUrl: null, posterUrl: null, releaseYear: null, rating: null })
        .success,
    ).toBe(true);
  });

  test("rejeita streamUrl que não é uma URL válida", () => {
    expect(movieSchema.safeParse({ ...valid, streamUrl: "não é url" }).success).toBe(false);
  });

  test("rejeita genres que não é array de strings", () => {
    expect(movieSchema.safeParse({ ...valid, genres: "Animação" }).success).toBe(false);
  });
});

describe("movieListQuerySchema", () => {
  test("aplica sort padrão quando nada é informado", () => {
    expect(movieListQuerySchema.parse({})).toEqual({ sort: "recent" });
  });

  test("aceita um gênero e um sort válidos", () => {
    const result = movieListQuerySchema.parse({ genre: "Animação", sort: "title_asc" });
    expect(result).toEqual({ genre: "Animação", sort: "title_asc" });
  });

  test("rejeita sort fora do enum permitido", () => {
    expect(movieListQuerySchema.safeParse({ sort: "aleatorio" }).success).toBe(false);
  });
});
