import type { Category, Channel, ChannelListQuery, ChannelListResponse } from "@saimotv/shared";
import { normalize } from "../../lib/normalize";
import { env } from "../../lib/env";
import { searchMovie } from "../../lib/tmdb/tmdbClient";
import { catalogRepository } from "./catalog.repository";
import { tmdbQueryByChannelId } from "./catalog.fixtures";

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

/**
 * Enriquece UM canal com metadados reais do TMDB, se (e só se) ele estiver
 * marcado em `tmdbQueryByChannelId`. Nunca lança: `searchMovie` já absorve
 * qualquer falha (chave ausente, rede, API fora do ar) e devolve `null`
 * nesses casos — o canal fictício de fallback (`name`/`description`
 * já presentes) continua funcionando normalmente.
 */
async function enrichOne(channel: Channel): Promise<Channel> {
  const query = tmdbQueryByChannelId[channel.id];
  if (!query) return channel;

  const tmdb = await searchMovie(env.TMDB_API_KEY, query.title, query.year);
  return { ...channel, tmdb };
}

export const catalogService = {
  listCategories(): Category[] {
    return catalogRepository.findAllCategories().sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  },

  /** Aplicado só sobre os itens já paginados (nunca o catálogo inteiro) —
   * menos chamadas ao TMDB, e cada uma é cacheada por processo de qualquer
   * forma (ver `tmdbClient.ts`). */
  async enrichChannelsWithTmdb(channels: Channel[]): Promise<Channel[]> {
    return Promise.all(channels.map(enrichOne));
  },

  async enrichChannel(channel: Channel): Promise<Channel> {
    return enrichOne(channel);
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
