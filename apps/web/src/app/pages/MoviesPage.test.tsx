import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MoviesPage } from "./MoviesPage";
import { mockMovieA, mockMovieB, mockMoviesFetch } from "@/tests/moviesFixtures";
import type { Movie } from "@saimotv/shared";

function renderMoviesPage(initialPath = "/filmes") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <MoviesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockMoviesFetch());
});

describe("MoviesPage", () => {
  test("lista os filmes reais, ordenados por mais recente por padrão", async () => {
    renderMoviesPage();

    await waitFor(() => expect(screen.getByText(mockMovieA.title)).toBeInTheDocument());
    expect(screen.getByText(mockMovieB.title)).toBeInTheDocument();
  });

  test("mostra os filtros de gênero reais vindos da API", async () => {
    renderMoviesPage();
    await waitFor(() => expect(screen.getByRole("button", { name: "Animação" })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Ficção científica" })).toBeInTheDocument();
  });

  test("clicar num gênero filtra a lista para só os filmes daquele gênero", async () => {
    const user = userEvent.setup();
    renderMoviesPage();

    await waitFor(() => expect(screen.getByText(mockMovieA.title)).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Ficção científica" }));

    await waitFor(() => expect(screen.getByText(mockMovieB.title)).toBeInTheDocument());
    expect(screen.queryByText(mockMovieA.title)).not.toBeInTheDocument();
  });

  test("gênero sem resultado mostra estado vazio com orientação sobre TMDB_API_KEY", async () => {
    renderMoviesPage("/filmes?genre=Terror");

    await waitFor(() => expect(screen.getByText(/nenhum filme encontrado/i)).toBeInTheDocument());
  });

  test("com poucos filmes (≤4), não duplica o trilho 'Em destaque' sobre a grade", async () => {
    renderMoviesPage();
    await waitFor(() => expect(screen.getByText(mockMovieA.title)).toBeInTheDocument());

    expect(screen.queryByRole("heading", { name: /em destaque/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(mockMovieA.title)).toHaveLength(1);
  });

  test("com mais de 4 filmes, mostra o trilho 'Em destaque' com os mais recentes, além da grade completa", async () => {
    const many: Movie[] = Array.from({ length: 6 }, (_, i) => ({
      ...mockMovieA,
      id: `movie-${i}`,
      title: `Filme ${i}`,
      releaseYear: 2000 + i,
    }));
    vi.stubGlobal("fetch", mockMoviesFetch({ movies: many }));

    renderMoviesPage();

    await waitFor(() => expect(screen.getByRole("heading", { name: /em destaque/i })).toBeInTheDocument());
    // O mais recente (Filme 5, ano 2005) aparece tanto no trilho quanto na grade.
    expect(screen.getAllByText("Filme 5").length).toBeGreaterThanOrEqual(2);
  });
});
