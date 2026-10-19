import type { MovieListQuery } from "@saimotv/shared";

export const moviesKeys = {
  all: ["movies"] as const,
  list: (query: MovieListQuery) => [...moviesKeys.all, "list", query] as const,
  genres: () => [...moviesKeys.all, "genres"] as const,
  detail: (id: string) => [...moviesKeys.all, "detail", id] as const,
};
