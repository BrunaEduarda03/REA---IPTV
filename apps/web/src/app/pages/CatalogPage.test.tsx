import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, afterEach } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogPage } from "./CatalogPage";
import { ChannelDetailPage } from "./ChannelDetailPage";
import { mockCatalogFetch, mockChannelListResponse, mockChannels } from "@/tests/catalogFixtures";

function renderCatalog(initialPath = "/catalogo") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/catalogo" element={<CatalogPage />} />
          <Route path="/catalogo/:id" element={<ChannelDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CatalogPage", () => {
  test("mostra o esqueleto de carregamento antes dos dados chegarem", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderCatalog();

    expect(screen.getByTestId("catalog-skeleton")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Horizonte Azul")).toBeInTheDocument());
  });

  test("renderiza os cards devolvidos pela API", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    renderCatalog();

    await waitFor(() => {
      expect(screen.getByText("Horizonte Azul")).toBeInTheDocument();
      expect(screen.getByText("Pulso Esportivo")).toBeInTheDocument();
    });
  });

  test("mostra estado de erro quando a API falha, com botão de tentar novamente", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch({ channelsStatus: 500 }));
    renderCatalog();

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(/não foi possível carregar o catálogo/i);
    });
    expect(screen.getByRole("button", { name: /tentar novamente/i })).toBeInTheDocument();
  });

  test("mostra estado vazio quando a busca não encontra nada", async () => {
    vi.stubGlobal(
      "fetch",
      mockCatalogFetch({ onChannels: () => mockChannelListResponse([]) }),
    );
    renderCatalog("/catalogo?search=inexistente");

    await waitFor(() => {
      expect(screen.getByText(/nenhum conteúdo encontrado/i)).toBeInTheDocument();
    });
  });

  test("digitar na busca atualiza a URL e refaz a consulta (debounced)", async () => {
    const fetchMock = mockCatalogFetch();
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderCatalog();
    await waitFor(() => expect(screen.getByText("Horizonte Azul")).toBeInTheDocument());

    await user.type(screen.getByLabelText(/buscar conteúdo/i), "pulso");

    await waitFor(
      () => {
        const calledWithSearch = fetchMock.mock.calls.some((call: unknown[]) =>
          String(call[0]).includes("search=pulso"),
        );
        expect(calledWithSearch).toBe(true);
      },
      { timeout: 2000 },
    );
  });

  test("selecionar uma categoria filtra a lista", async () => {
    const fetchMock = mockCatalogFetch({
      onChannels: (url) => {
        const categoryId = url.searchParams.get("categoryId");
        const items = categoryId ? mockChannels.filter((c) => c.categoryId === categoryId) : mockChannels;
        return mockChannelListResponse(items);
      },
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    renderCatalog();
    await waitFor(() => expect(screen.getByText("Esportes")).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Esportes" }));

    await waitFor(() => {
      expect(screen.queryByText("Horizonte Azul")).not.toBeInTheDocument();
      expect(screen.getByText("Pulso Esportivo")).toBeInTheDocument();
    });
  });

  test("clicar em um card navega para a página de detalhes", async () => {
    vi.stubGlobal("fetch", mockCatalogFetch());
    const user = userEvent.setup();

    renderCatalog();
    await waitFor(() => expect(screen.getByText("Horizonte Azul")).toBeInTheDocument());

    await user.click(screen.getByText("Horizonte Azul"));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Horizonte Azul" })).toBeInTheDocument();
    });
    expect(screen.getByText(/voltar ao catálogo/i)).toBeInTheDocument();
  });
});
