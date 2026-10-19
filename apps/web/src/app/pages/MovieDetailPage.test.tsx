import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MovieDetailPage } from "./MovieDetailPage";
import { mockMovieA, mockMoviesFetch } from "@/tests/moviesFixtures";
import { createAdapter } from "@/features/player/adapters/createAdapter";

vi.mock("@/features/player/adapters/createAdapter", () => ({
  createAdapter: vi.fn(() => ({ attach: vi.fn(async () => {}), destroy: vi.fn() })),
}));

function renderDetailPage(id = mockMovieA.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/filmes/${id}`]}>
        <Routes>
          <Route path="/filmes/:id" element={<MovieDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockMoviesFetch());
});

describe("MovieDetailPage", () => {
  test("mostra título, ano, gêneros, sinopse real e a atribuição do TMDB", async () => {
    renderDetailPage();

    await waitFor(() => expect(screen.getByText(mockMovieA.title)).toBeInTheDocument());
    expect(screen.getByText(String(mockMovieA.releaseYear))).toBeInTheDocument();
    expect(screen.getByText(mockMovieA.genres.join(" · "))).toBeInTheDocument();
    expect(screen.getByText(mockMovieA.overview)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tmdb/i })).toHaveAttribute("href", "https://www.themoviedb.org/");
  });

  test("reproduz o stream real do próprio filme (não um stream genérico por categoria)", async () => {
    renderDetailPage();

    await waitFor(() => expect(screen.getByLabelText(mockMovieA.title)).toBeInTheDocument());
    // `createAdapter(video, src)` é quem de fato conecta a fonte ao player
    // (ver `useVideoPlayer.ts`) — o mock acima não escreve `video.src`
    // (isso é testado separadamente em nativeAdapter.test.ts), então a
    // prova de que o filme certo foi passado é o argumento recebido aqui.
    expect(createAdapter).toHaveBeenCalledWith(expect.anything(), mockMovieA.streamUrl);
  });

  test("filme inexistente mostra o estado de erro", async () => {
    renderDetailPage("nao-existe");

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
