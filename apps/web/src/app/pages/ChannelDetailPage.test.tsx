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
