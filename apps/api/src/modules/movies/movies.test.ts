import { describe, expect, test, mock } from "bun:test";

/**
 * `searchMovie` é mockado aqui (não deixado para `.env.test` resolver tudo
 * como `null`) porque estes testes precisam verificar filtro/ordenação
 * sobre dados REAIS variados — algo que só é possível com um TMDB falso
 * determinístico, não com "toda busca falha" (que é o comportamento real
 * em ambiente de teste, sem chave configurada).
 */
mock.module("../../lib/tmdb/tmdbClient", () => ({
  searchMovie: async (_apiKey: string | undefined, title: string) => {
    const byTitle: Record<string, unknown> = {
      "Big Buck Bunny": {
        tmdbId: 10378,
        title: "Big Buck Bunny",
        overview: "...",
        backdropUrl: "https://image.tmdb.org/t/p/w780/bbb.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w342/bbb.jpg",
        releaseYear: 2008,
        genres: ["Animação", "Aventura"],
        rating: 7.8,
      },
      "Tears of Steel": {
        tmdbId: 133701,
        title: "Tears of Steel",
        overview: "...",
        backdropUrl: "https://image.tmdb.org/t/p/w780/tos.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w342/tos.jpg",
        releaseYear: 2012,
        genres: ["Ficção científica"],
        rating: 7.2,
      },
      Sintel: {
        tmdbId: 45745,
        title: "Sintel",
        overview: "...",
        backdropUrl: "https://image.tmdb.org/t/p/w780/sintel.jpg",
        posterUrl: "https://image.tmdb.org/t/p/w342/sintel.jpg",
        releaseYear: 2010,
        genres: ["Animação", "Fantasia"],
        rating: 7.5,
      },
      "Elephants Dream": null, // simula um dos 4 seeds sem correspondência/erro
    };
    return byTitle[title] ?? null;
  },
}));

const { createApp } = await import("../../app");
const app = createApp();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await app.request(path);
  const body = await res.json();
  return { status: res.status, body };
}

describe("GET /api/movies", () => {
  test("lista só os filmes resolvidos com sucesso (3 de 4 seeds, no mock)", async () => {
    const { status, body } = await get("/api/movies");
    expect(status).toBe(200);
    expect(body.items).toHaveLength(3);
    expect(body.items.map((m: { id: string }) => m.id).sort()).toEqual(
      ["big-buck-bunny", "sintel", "tears-of-steel"].sort(),
    );
  });

  test("ordena por mais recente (padrão): ano decrescente", async () => {
    const { body } = await get("/api/movies");
    const years = body.items.map((m: { releaseYear: number }) => m.releaseYear);
    expect(years).toEqual([2012, 2010, 2008]);
  });

  test("ordena por título (A-Z) quando pedido", async () => {
    const { body } = await get("/api/movies?sort=title_asc");
    const titles = body.items.map((m: { title: string }) => m.title);
    expect(titles).toEqual(["Big Buck Bunny", "Sintel", "Tears of Steel"]);
  });

  test("filtra por gênero real", async () => {
    const { body } = await get("/api/movies?genre=Fantasia");
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe("sintel");
  });

  test("gênero sem nenhum filme correspondente devolve lista vazia, não erro", async () => {
    const { status, body } = await get("/api/movies?genre=Terror");
    expect(status).toBe(200);
    expect(body.items).toHaveLength(0);
  });
});

describe("GET /api/movies/genres", () => {
  test("lista só os gêneros que de fato aparecem no acervo atual, sem repetição", async () => {
    const { status, body } = await get("/api/movies/genres");
    expect(status).toBe(200);
    expect(body.items.sort()).toEqual(["Animação", "Aventura", "Fantasia", "Ficção científica"].sort());
  });
});

describe("GET /api/movies/:id", () => {
  test("devolve os detalhes de um filme real existente", async () => {
    const { status, body } = await get("/api/movies/tears-of-steel");
    expect(status).toBe(200);
    expect(body.title).toBe("Tears of Steel");
    expect(body.streamUrl).toContain("tos_ismc");
  });

  test("devolve 404 para um filme que não resolveu dados reais (sem TMDB)", async () => {
    const { status, body } = await get("/api/movies/elephants-dream");
    expect(status).toBe(404);
    expect(body.error).toContain("não encontrado");
  });

  test("devolve 404 com contrato de erro para id completamente inexistente", async () => {
    const { status, body } = await get("/api/movies/nao-existe");
    expect(status).toBe(404);
    expect(body.error).toContain("não encontrado");
  });
});
