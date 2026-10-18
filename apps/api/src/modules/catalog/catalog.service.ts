import type { Category, Channel, ChannelListQuery, ChannelListResponse } from "@saimotv/shared";
import { normalize } from "../../lib/normalize";
import { catalogRepository } from "./catalog.repository";

/**
 * Regras de negócio do catálogo: filtrar, ordenar e paginar. O service NUNCA
 * sabe de onde os dados vêm (hoje é `catalogRepository`, um array em
 * memória; amanhã poderia ser Drizzle) — essa é exatamente a fronteira que
 * permite trocar a persistência sem tocar nesta função.
 */
function matchesSearch(channel: Channel, search: string): boolean {
  const needle = normalize(search);
  return normalize(channel.name).includes(needle) || normalize(channel.description).includes(needle);
}

/** Comparador determinístico: mesmo em empate pelo critério principal,
 * desempata por `id` — sem isso, duas chamadas com o mesmo filtro poderiam,
 * em teoria, devolver ordens diferentes (ex.: se a fonte de dados real não
 * garantir ordem estável), quebrando a paginação (um item pode aparecer
 * duas vezes ou nenhuma, entre páginas diferentes). */
function sortChannels(channels: Channel[], sort: ChannelListQuery["sort"]): Channel[] {
  const byIdAsc = (a: Channel, b: Channel) => a.id.localeCompare(b.id);

  switch (sort) {
    case "name_asc":
      return [...channels].sort((a, b) => a.name.localeCompare(b.name, "pt-BR") || byIdAsc(a, b));
    case "name_desc":
      return [...channels].sort((a, b) => b.name.localeCompare(a.name, "pt-BR") || byIdAsc(a, b));
    case "featured_first":
    default:
      return [...channels].sort((a, b) => {
        if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
        return a.name.localeCompare(b.name, "pt-BR") || byIdAsc(a, b);
      });
  }
}

export const catalogService = {
  listCategories(): Category[] {
    return catalogRepository.findAllCategories().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  listChannels(query: ChannelListQuery): ChannelListResponse {
    let items = catalogRepository.findAllChannels();

    if (query.categoryId) {
      items = items.filter((channel) => channel.categoryId === query.categoryId);
    }
    if (query.search) {
      items = items.filter((channel) => matchesSearch(channel, query.search!));
    }

    items = sortChannels(items, query.sort);

    const total = items.length;
    const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
    const page = Math.min(query.page, totalPages);
    const start = (page - 1) * query.pageSize;
    const pageItems = items.slice(start, start + query.pageSize);

    return { items: pageItems, page, pageSize: query.pageSize, total, totalPages };
  },

  getChannelById(id: string): Channel | undefined {
    return catalogRepository.findChannelById(id);
  },
};
