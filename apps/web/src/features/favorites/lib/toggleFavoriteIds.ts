/** Função pura: adiciona `id` se ainda não estiver na lista, remove se já
 * estiver. Extraída do store de propósito — é a regra de negócio real
 * ("o que significa favoritar"), testável sem nenhuma dependência de
 * Zustand ou localStorage. */
export function toggleFavoriteIds(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((existing) => existing !== id) : [...ids, id];
}
