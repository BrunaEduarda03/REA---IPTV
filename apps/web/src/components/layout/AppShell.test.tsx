import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "./AppShell";

// Isola o teste de layout da rede real: o TopNavigation renderiza
// <ConnectionStatus/> só em modo DEV (que é o caso em `vitest run`), então
// precisamos de um QueryClientProvider no ar, mas não de uma API respondendo.
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

describe("AppShell", () => {
  test("renderiza a navegação principal (uma única vez cada — desktop e mobile) e o conteúdo filho", () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo da página</p>
      </AppShell>,
    );

    // Duas navegações coexistem no DOM (uma visível por vez via CSS,
    // conforme o breakpoint) — ver TopNavigation/MobileNavigation.
    expect(screen.getAllByRole("navigation", { name: /navegação principal/i })).toHaveLength(2);
    expect(screen.getByText("SaimoTV Lab")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo da página")).toBeInTheDocument();
  });

  test("o link de navegação para Início está presente e acessível por teclado", () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo</p>
      </AppShell>,
    );

    const links = screen.getAllByRole("link", { name: /início/i });
    expect(links.length).toBeGreaterThan(0);
    links.forEach((link) => expect(link).toHaveAttribute("href", "/"));
  });

  test("não existe mais uma sidebar (role 'complementary') como navegação principal", () => {
    renderWithProviders(
      <AppShell>
        <p>Conteúdo</p>
      </AppShell>,
    );

    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});
