import { z } from "zod";

/**
 * Modelos de domínio do catálogo — autorais, pensados para esta aplicação.
 * Não são cópias dos modelos do Saimo TV original (que nunca foram lidos
 * em código-fonte algum para construir isto; nasceram diretamente dos
 * requisitos funcionais do backlog, ver docs/implementation/backlog.md).
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
});
export type Category = z.infer<typeof categorySchema>;

export const channelStatusSchema = z.enum(["available", "coming_soon", "unavailable"]);
export type ChannelStatus = z.infer<typeof channelStatusSchema>;

export const channelSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  categoryId: z.string(),
  thumbnail: z.string(),
  isFeatured: z.boolean(),
  status: channelStatusSchema,
});
export type Channel = z.infer<typeof channelSchema>;

/** Ordenação sempre determinística: dado o mesmo filtro, a mesma página
 * sempre devolve os mesmos itens na mesma ordem — essencial para paginação
 * confiável (ver catalog.service.ts no backend). */
export const channelSortSchema = z.enum(["featured_first", "name_asc", "name_desc"]);
export type ChannelSort = z.infer<typeof channelSortSchema>;

/**
 * Parâmetros de busca/filtro/paginação — a MESMA fonte de verdade usada
 * para (a) validar a query string no backend e (b) tipar os parâmetros no
 * frontend. `z.coerce.number()` existe porque query strings chegam como
 * texto ("2", não 2) — o Zod converte e valida no mesmo passo.
 */
export const channelListQuerySchema = z.object({
  search: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .optional(),
  categoryId: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(12),
  sort: channelSortSchema.default("featured_first"),
});
export type ChannelListQuery = z.infer<typeof channelListQuerySchema>;

/** Envelope de paginação genérico — reaproveitável para qualquer lista do
 * domínio, não só canais. */
export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  });
}

export const channelListResponseSchema = paginatedSchema(channelSchema);
export type ChannelListResponse = z.infer<typeof channelListResponseSchema>;

export const categoryListResponseSchema = z.object({
  items: z.array(categorySchema),
});
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;

/** Identificador de rota (`:id`) — reaproveitado por qualquer endpoint que
 * receba um id de recurso como parâmetro de caminho. */
export const idParamSchema = z.object({
  id: z.string().min(1),
});
export type IdParam = z.infer<typeof idParamSchema>;
