import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { FavoritesPage } from "./FavoritesPage";
import { CatalogPage } from "./CatalogPage";
import { useFavoritesStore } from "@/features/favorites/store/favoritesStore";
import { mockCatalogFetch, mockChannelListResponse, mockChannels } from "@/tests/catalogFixtures";

function renderWithProviders(ui: React.ReactNode, initialPath = "/favoritos") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useFavoritesStore.setState({ favoriteIds: [] });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FavoritesPage", () => {
  test("mostra estado vazio quando nada foi favoritado", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ onChannels: () => mockChannelListResponse(mockChannels) }));

    renderWithProviders(<FavoritesPage />);

    await waitFor(() => {
      expect(screen.getByText(/nenhum favorito ainda/i)).toBeInTheDocument();
    });
  });

  test("lista apenas os conteúdos favoritados, cruzando ids (client state) com dados do catálogo (server state)", async () => {
    useFavoritesStore.setState({ favoriteIds: ["ch-02"] });
    vi.stubGlobal("fetch", mockCatalogFetch({ onChannels: () => mockChannelListResponse(mockChannels) }));

    renderWithProviders(<FavoritesPage />);

    await waitFor(() => {
      expect(screen.getByText("Pulso Esportivo")).toBeInTheDocument();
    });
    expect(screen.queryByText("Horizonte Azul")).not.toBeInTheDocument();
  });

  test("fluxo completo: favoritar no catálogo → o item aparece em /favoritos", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ onChannels: () => mockChannelListResponse(mockChannels) }));
    const user = userEvent.setup();

    const { unmount } = renderWithProviders(<CatalogPage />, "/catalogo");
    await waitFor(() => expect(screen.getByText("Horizonte Azul")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /favoritar horizonte azul/i }));
    expect(useFavoritesStore.getState().favoriteIds).toContain("ch-01");

    // Simula a "próxima navegação": desmonta o catálogo e monta a tela de
    // favoritos — a store (singleton) e o localStorage persistido
    // continuam os mesmos, como aconteceria numa navegação real ou mesmo
    // após recarregar a página (a store relê do localStorage ao montar).
    unmount();
    renderWithProviders(<FavoritesPage />, "/favoritos");

    await waitFor(() => {
      expect(screen.getByText("Horizonte Azul")).toBeInTheDocument();
    });
  });
});
