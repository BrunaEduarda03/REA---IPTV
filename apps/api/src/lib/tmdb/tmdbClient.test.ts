import { describe, expect, test, mock, afterEach } from "bun:test";
import { searchMovie } from "./tmdbClient";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

const GENRE_LIST = { genres: [{ id: 16, name: "Animação" }, { id: 12, name: "Aventura" }] };

/** Mock de `fetch` que decide a resposta olhando o caminho da URL — a busca
 * de filme e a lista de gêneros são dois endpoints diferentes do TMDB,
 * ambos chamados por `searchMovie` quando um filme é encontrado. */
function tmdbFetchMock(searchResults: unknown[], movieDetailsById: Record<number, unknown> = {}) {
  return mock(async (input: string | URL) => {
    const url = new URL(String(input));
    if (url.pathname.includes("/genre/movie/list")) return jsonResponse(GENRE_LIST);
    if (url.pathname.includes("/search/movie")) return jsonResponse({ results: searchResults });
    const detailsMatch = /\/movie\/(\d+)$/.exec(url.pathname);
    if (detailsMatch) {
      const id = Number(detailsMatch[1]);
      return jsonResponse(movieDetailsById[id] ?? { overview: "" });
    }
    throw new Error(`Rota TMDB não mockada: ${url.pathname}`);
  });
}

describe("searchMovie", () => {
  test("sem chave de API, devolve null sem chamar fetch", async () => {
    const fetchSpy = tmdbFetchMock([]);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    const result = await searchMovie(undefined, "Um Filme Qualquer", 1999);

    expect(result).toBeNull();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("encontra um resultado e normaliza os campos (backdrop, pôster, ano, gêneros e nota reais)", async () => {
    globalThis.fetch = tmdbFetchMock([
      {
        id: 10378,
        title: "Big Buck Bunny",
        overview: "Um coelho gigante e gentil é provocado por três roedores valentões.",
        backdrop_path: "/abc123.jpg",
        poster_path: "/poster123.jpg",
        release_date: "2008-04-10",
        genre_ids: [16, 12],
        vote_average: 7.8,
      },
    ]) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste-unica-1", "Big Buck Bunny Único 1", 2008);

    expect(result).toEqual({
      tmdbId: 10378,
      title: "Big Buck Bunny",
      overview: "Um coelho gigante e gentil é provocado por três roedores valentões.",
      backdropUrl: "https://image.tmdb.org/t/p/w780/abc123.jpg",
      posterUrl: "https://image.tmdb.org/t/p/w342/poster123.jpg",
      releaseYear: 2008,
      genres: ["Animação", "Aventura"],
      rating: 7.8,
    });
  });

  test("nenhum resultado encontrado devolve null (não lança)", async () => {
    globalThis.fetch = tmdbFetchMock([]) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste", "Filme Que Não Existe De Verdade", 1900);

    expect(result).toBeNull();
  });

  test("resposta não-OK da API devolve null (não lança)", async () => {
    globalThis.fetch = mock(async () => jsonResponse({}, false)) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste", "Falha De Api", 2001);

    expect(result).toBeNull();
  });

  test("erro de rede (fetch rejeita) devolve null (não lança)", async () => {
    globalThis.fetch = mock(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste", "Erro De Rede", 2002);

    expect(result).toBeNull();
  });

  test("backdrop, pôster, nota ou gênero ausentes/desconhecidos viram null/vazio, sem quebrar os outros campos", async () => {
    globalThis.fetch = tmdbFetchMock([
      {
        id: 1,
        title: "Sem Imagem",
        overview: "...",
        backdrop_path: null,
        poster_path: null,
        release_date: null,
        genre_ids: [9999],
        vote_average: 0, // TMDB devolve 0 quando não há avaliações — deve virar null, não "nota zero"
      },
    ]) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste-unica-2", "Sem Imagem Único", 2003);

    expect(result).toEqual({
      tmdbId: 1,
      title: "Sem Imagem",
      overview: "...",
      backdropUrl: null,
      posterUrl: null,
      releaseYear: null,
      genres: [], // 9999 não existe no mapa de gêneros mockado — filtrado, não vira "undefined"
      rating: null,
    });
  });

  test("sinopse em pt-BR vazia: busca a sinopse em inglês como fallback, em vez de deixar vazio", async () => {
    globalThis.fetch = tmdbFetchMock(
      [
        {
          id: 77,
          title: "Sem Sinopse PT",
          overview: "",
          backdrop_path: null,
          release_date: "2015-01-01",
          genre_ids: [],
        },
      ],
      { 77: { overview: "English overview from fallback." } },
    ) as unknown as typeof fetch;

    const result = await searchMovie("chave-de-teste-unica-4", "Sem Sinopse PT Único", 2015);

    expect(result?.overview).toBe("English overview from fallback.");
  });

  test("resultados repetidos (mesmo título/ano) usam cache — fetch de busca chamado só uma vez", async () => {
    const fetchSpy = tmdbFetchMock([
      { id: 2, title: "Cacheado", overview: "...", backdrop_path: null, release_date: "2010-01-01", genre_ids: [] },
    ]);
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    await searchMovie("chave-de-teste-unica-3", "Título Cacheado Único", 2010);
    await searchMovie("chave-de-teste-unica-3", "Título Cacheado Único", 2010);

    const searchCalls = fetchSpy.mock.calls.filter(([input]: [string | URL]) =>
      String(input).includes("/search/movie"),
    );
    expect(searchCalls).toHaveLength(1);
  });
});
