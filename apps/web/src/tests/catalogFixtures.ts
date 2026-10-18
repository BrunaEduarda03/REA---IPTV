import { vi } from "vitest";
import type { Category, Channel, ChannelListResponse } from "@saimotv/shared";

/** Dados fictícios SÓ para testes de frontend — independentes dos fixtures
 * do backend (apps/api), de propósito: o frontend não deveria depender de
 * conhecer os dados reais da API, só do CONTRATO (schema) que ela expõe. */
export const mockCategories: Category[] = [
  { id: "cat-01", name: "Documentários", slug: "documentarios", description: "Produções sobre natureza e ciência." },
  { id: "cat-02", name: "Esportes", slug: "esportes", description: "Competições e análises." },
];

/** Exportados nomeadamente (não só dentro do array) para que os testes não
 * precisem de acesso por índice — com `noUncheckedIndexedAccess` ativo no
 * tsconfig base, `mockChannels[0]` tipa como `Channel | undefined`. */
export const mockFeaturedChannel: Channel = {
  id: "ch-01",
  name: "Horizonte Azul",
  description: "Expedições pelo mundo.",
  categoryId: "cat-01",
  thumbnail: "/thumbnails/documentarios.svg",
  isFeatured: true,
  status: "available",
};

export const mockComingSoonChannel: Channel = {
  id: "ch-02",
  name: "Pulso Esportivo",
  description: "Cobertura de competições amadoras.",
  categoryId: "cat-02",
  thumbnail: "/thumbnails/esportes.svg",
  isFeatured: false,
  status: "coming_soon",
};

export const mockChannels: Channel[] = [mockFeaturedChannel, mockComingSoonChannel];

export function mockChannelListResponse(items: Channel[] = mockChannels): ChannelListResponse {
  return { items, page: 1, pageSize: 12, total: items.length, totalPages: 1 };
}

/** Mock de `fetch` que decide a resposta olhando o caminho da URL —
 * reutilizável em qualquer teste que precise simular a API sem subi-la de
 * verdade. `onChannels` permite customizar a resposta de /api/channels por
 * teste (ex.: lista vazia, erro). */
export function mockCatalogFetch(options?: { onChannels?: (url: URL) => unknown; channelsStatus?: number }) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));

    if (url.pathname === "/api/categories") {
      return jsonResponse({ items: mockCategories });
    }

    if (url.pathname === "/api/channels") {
      if (options?.channelsStatus && options.channelsStatus >= 400) {
        return jsonResponse({ error: "Falha simulada" }, options.channelsStatus);
      }
      const body = options?.onChannels ? options.onChannels(url) : mockChannelListResponse();
      return jsonResponse(body);
    }

    const match = /\/api\/channels\/(.+)$/.exec(url.pathname);
    if (match) {
      const channel = mockChannels.find((c) => c.id === match[1]);
      if (!channel) return jsonResponse({ error: "Não encontrado" }, 404);
      return jsonResponse(channel);
    }

    throw new Error(`Rota não mockada: ${url.pathname}`);
  });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status < 400,
    status,
    json: async () => body,
  } as Response;
}
