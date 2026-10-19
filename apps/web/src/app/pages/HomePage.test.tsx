import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { HomePage } from "./HomePage";
import { mockCatalogFetch, mockChannelListResponse, mockChannels, mockFeaturedChannel } from "@/tests/catalogFixtures";

function renderHomePage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", mockCatalogFetch({ onChannels: () => mockChannelListResponse(mockChannels) }));
});

describe("HomePage", () => {
  test("mostra o título da aplicação e links para filmes e catálogo (não a página vazia da Sprint 01)", () => {
    renderHomePage();

    expect(screen.getByRole("heading", { name: "SaimoTV Lab" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver filmes/i })).toHaveAttribute("href", "/filmes");
    expect(screen.getByRole("link", { name: /explorar catálogo/i })).toHaveAttribute("href", "/catalogo");
  });

  test("carrega e mostra conteúdos em destaque do catálogo real (mesma API de /catalogo)", async () => {
    renderHomePage();

    await waitFor(() => expect(screen.getByText(mockFeaturedChannel.name)).toBeInTheDocument());
  });
});
