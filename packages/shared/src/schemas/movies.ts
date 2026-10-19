import { z } from "zod";

/**
 * Modelo de domínio para a seção "/filmes" — deliberadamente SEPARADO de
 * `channelSchema` (catalog.ts). `catalog` mistura 18 canais fictícios com
 * 2 reais (enriquecidos quando possível, mas sempre funcionais mesmo sem
 * dados reais); `movies` é 100% sobre conteúdo real, licenciado sob
 * Creative Commons, com metadados reais do TMDB — nunca fictício, nunca
 * um item "de fallback". Ver docs/implementation/decisions.md, ADR-026.
 */
export const movieSchema = z.object({
  /** Id interno estável (ex. "big-buck-bunny"), não o id do TMDB — nunca
   * muda mesmo que o TMDB recatalogue o filme sob um id diferente. */
  id: z.string(),
  title: z.string(),
  overview: z.string(),
  backdropUrl: z.string().url().nullable(),
  /** Pôster retrato (2:3) — a imagem principal do `MoviePosterCard`
   * (Sprint 02.5, ADR-027); `backdropUrl` fica como alternativa paisagem,
   * não usada no card padrão de `/filmes`. */
  posterUrl: z.string().url().nullable(),
  releaseYear: z.number().int().nullable(),
  /** Nomes reais de gênero, vindos do TMDB (ex. "Animação", "Fantasia"). */
  genres: z.array(z.string()),
  /** Nota média do TMDB (0-10) — `null` quando não há avaliações. */
  rating: z.number().min(0).max(10).nullable(),
  /** URL do stream público de demonstração que o player de fato reproduz
   * — sempre uma mídia Creative Commons/de domínio público autorizada,
   * nunca uma fonte de IPTV ou conteúdo protegido (ver AGENTS.md, item 15). */
  streamUrl: z.string().url(),
});
export type Movie = z.infer<typeof movieSchema>;

export const movieSortSchema = z.enum(["recent", "title_asc"]);
export type MovieSort = z.infer<typeof movieSortSchema>;

export const movieListQuerySchema = z.object({
  genre: z.string().trim().min(1).optional(),
  sort: movieSortSchema.default("recent"),
});
export type MovieListQuery = z.infer<typeof movieListQuerySchema>;

export const movieListResponseSchema = z.object({
  items: z.array(movieSchema),
});
export type MovieListResponse = z.infer<typeof movieListResponseSchema>;

export const movieGenreListResponseSchema = z.object({
  items: z.array(z.string()),
});
export type MovieGenreListResponse = z.infer<typeof movieGenreListResponseSchema>;
