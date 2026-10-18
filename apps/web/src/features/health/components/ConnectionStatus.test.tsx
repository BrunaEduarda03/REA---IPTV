import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, afterEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConnectionStatus } from "./ConnectionStatus";

function renderWithClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ConnectionStatus />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ConnectionStatus", () => {
  test("mostra 'Conectando' e depois 'online' quando a API responde com sucesso", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "ok", service: "saimotv-lab-api" }),
      }),
    );

    renderWithClient();

    expect(screen.getByRole("status")).toHaveTextContent(/conectando/i);

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/api online/i);
    });
  });

  test("mostra estado de erro quando a API falha", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({}),
      }),
    );

    renderWithClient();

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/falha ao conectar/i);
    });
  });
});
