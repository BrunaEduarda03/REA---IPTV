import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PageShell } from "./PageShell";

// Isola o teste de layout da rede real: o TopBar renderiza <ConnectionStatus/>
// só em modo DEV (que é o caso em `vitest run`), então precisamos de um
// QueryClientProvider no ar, mas não de uma API respondendo de verdade.
vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ status: "ok", service: "saimotv-lab-api" }),
  }),
);

function renderWithProviders(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PageShell", () => {
  test("renderiza a navegação principal, o topo e o conteúdo filho", () => {
    renderWithProviders(
      <PageShell>
        <p>Conteúdo da página</p>
      </PageShell>,
    );

    expect(screen.getByRole("complementary", { name: /navegação principal/i })).toBeInTheDocument();
    expect(screen.getByText("SaimoTV Lab")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  test("o link de navegação para Início está presente e acessível por teclado", () => {
    renderWithProviders(
      <PageShell>
        <p>Conteúdo</p>
      </PageShell>,
    );

    const link = screen.getByRole("link", { name: /início/i });
    expect(link).toHaveAttribute("href", "/");
  });
});
