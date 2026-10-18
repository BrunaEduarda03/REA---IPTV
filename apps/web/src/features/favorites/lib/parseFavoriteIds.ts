import { z } from "zod";

const favoriteIdsSchema = z.array(z.string());

/**
 * Nunca confia cegamente no que está em `localStorage` — pode estar
 * corrompido (alguém editou manualmente), de um formato antigo (uma versão
 * anterior desta feature usava outro shape), ou simplesmente ausente.
 * Em qualquer caso que não seja "um array de strings", cai para uma lista
 * vazia — a aplicação nunca quebra por causa de um dado de preferência
 * inválido (mesma lição aprendida observando o Saimo TV: ver
 * docs/reverse-engineering/learning.md).
 */
export function parseFavoriteIds(raw: unknown): string[] {
  const result = favoriteIdsSchema.safeParse(raw);
  return result.success ? result.data : [];
}
