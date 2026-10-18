import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ChannelListQuery } from "@saimotv/shared";
import { getChannels } from "../services/catalogApi";
import { catalogKeys } from "./catalogKeys";

/**
 * `queryKey` inclui o objeto `query` inteiro: busca, categoria, página,
 * ordenação e tamanho de página diferentes são, para o TanStack Query,
 * resultados DIFERENTES — cada combinação tem seu próprio slot de cache,
 * nunca mistura a página 2 de uma busca com a página 2 de outra.
 *
 * `placeholderData: keepPreviousData` evita o "flash" de loading ao trocar
 * de página: a lista anterior continua na tela (um pouco "desatualizada")
 * enquanto a nova busca roda, em vez de a grade inteira sumir e reaparecer.
 */
export function useChannels(query: ChannelListQuery) {
  return useQuery({
    queryKey: catalogKeys.channels(query),
    queryFn: () => getChannels(query),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
