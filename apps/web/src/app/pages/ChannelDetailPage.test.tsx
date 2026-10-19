import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { ChannelDetailPage } from "./ChannelDetailPage";
import { usePlayerUiStore } from "@/features/player/store/playerUiStore";
import { mockCatalogFetch, mockCategories, mockFeaturedChannel } from "@/tests/catalogFixtures";

vi.mock("@/features/player/adapters/createAdapter", () => ({
  createAdapter: vi.fn(() => ({ attach: vi.fn(async () => {}), destroy: vi.fn() })),
}));

function renderDetailPage(id = mockFeaturedChannel.id) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/catalogo/${id}`]}>
        <Routes>
          <Route path="/catalogo/:id" element={<ChannelDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  usePlayerUiStore.setState({ isTheaterMode: false });
  vi.stubGlobal(
    "fetch",
    mockCatalogFetch({ onChannels: () => ({ items: mockCategories, page: 1, pageSize: 12, total: 0, totalPages: 1 }) }),
  );
});

describe("ChannelDetailPage — modo cinema (Sprint 05)", () => {
  test("ativar o modo cinema no player alarga o contêiner da página", async () => {
    const user = userEvent.setup();
    renderDetailPage();

    await waitFor(() => expect(screen.getByText(mockFeaturedChannel.name)).toBeInTheDocument());

    const article = screen.getByText(mockFeaturedChannel.name).closest("article")!;
    expect(article).toHaveAttribute("data-theater-mode", "false");

    await user.click(screen.getByRole("button", { name: /^modo cinema$/i }));

    expect(article).toHaveAttribute("data-theater-mode", "true");
  });
});

describe("ChannelDetailPage — metadados reais do TMDB (correção pós-Sprint 05)", () => {
  test("quando o canal tem dados do TMDB, mostra a sinopse real e a atribuição obrigatória", async () => {
    vi.stubGlobal(
      "fetch",
      mockCatalogFetch({
        onChannels: () => ({ items: mockCategories, page: 1, pageSize: 12, total: 0, totalPages: 1 }),
        channelOverride: {
          ...mockFeaturedChannel,
          tmdb: {
            tmdbId: 10378,
            title: "Big Buck Bunny",
            overview: "Sinopse real vinda do TMDB, não a descrição fictícia do fixture.",
            backdropUrl: "https://image.tmdb.org/t/p/w780/real.jpg",
            posterUrl: "https://image.tmdb.org/t/p/w342/real.jpg",
            releaseYear: 2008,
            genres: ["Animação", "Aventura"],
            rating: 7.8,
          },
        },
      }),
    );

    renderDetailPage();

    await waitFor(() => expect(screen.getByText(/sinopse real vinda do tmdb/i)).toBeInTheDocument());
    expect(screen.getByText("2008")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /tmdb/i })).toHaveAttribute("href", "https://www.themoviedb.org/");
  });

  test("sem dados do TMDB (canal fictício), mostra a descrição do fixture e nenhuma atribuição", async () => {
    renderDetailPage();

    await waitFor(() => expect(screen.getByText(mockFeaturedChannel.description)).toBeInTheDocument());
    expect(screen.queryByRole("link", { name: /tmdb/i })).not.toBeInTheDocument();
  });

  test("TMDB presente mas sem sinopse traduzida (overview vazio): cai para a descrição do fixture, mas mantém a atribuição", async () => {
    // Caso real encontrado em verificação manual: o TMDB às vezes devolve
    // `overview: ""` para um idioma sem tradução comunitária completa.
    vi.stubGlobal(
      "fetch",
      mockCatalogFetch({
        onChannels: () => ({ items: mockCategories, page: 1, pageSize: 12, total: 0, totalPages: 1 }),
        channelOverride: {
          ...mockFeaturedChannel,
          tmdb: {
            tmdbId: 10378,
            title: "Big Buck Bunny",
            overview: "",
            backdropUrl: "https://image.tmdb.org/t/p/w780/real.jpg",
            posterUrl: "https://image.tmdb.org/t/p/w342/real.jpg",
            releaseYear: 2008,
            genres: ["Animação", "Aventura"],
            rating: 7.8,
          },
        },
      }),
    );

    renderDetailPage();

    await waitFor(() => expect(screen.getByText(mockFeaturedChannel.description)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: /tmdb/i })).toBeInTheDocument();
  });
});
