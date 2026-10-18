import type { ChannelListQuery } from "@saimotv/shared";

/**
 * Query keys hierárquicas: `catalogKeys.all` é a raiz, e invalidar
 * `queryClient.invalidateQueries({ queryKey: catalogKeys.all })` invalidaria
 * TUDO sob "catalog" (categorias, todas as listagens, todos os detalhes) —
 * útil para quando o catálogo mudar por inteiro (ex.: uma ação futura de
 * "recarregar catálogo"). Chaves mais específicas (`channels(query)`)
 * permitem invalidar só uma fatia, sem derrubar o cache de tudo o mais.
 */
export const catalogKeys = {
  all: ["catalog"] as const,
  categories: () => [...catalogKeys.all, "categories"] as const,
  channels: (query: ChannelListQuery) => [...catalogKeys.all, "channels", query] as const,
  channel: (id: string) => [...catalogKeys.all, "channel", id] as const,
};
