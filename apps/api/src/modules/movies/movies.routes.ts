import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import type { ApiError } from "@saimotv/shared";
import { movieListQuerySchema, idParamSchema } from "./movies.schemas";
import { moviesService } from "./movies.service";

function invalidParamsResponse(issues: { path: PropertyKey[]; message: string }[]) {
  const body: ApiError = {
    error: "Parâmetros inválidos",
    issues: issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message })),
  };
  return body;
}

/**
 * `/api/movies` — deliberadamente sem paginação (ver ADR-026): o acervo
 * real é pequeno e curado de propósito, não um catálogo que cresce sem
 * limite. Se isso mudar, paginação entra nessa hora, não antes de haver um
 * problema real para resolver (mesmo princípio já seguido em todo o resto
 * do projeto — ver "evite abstrações desnecessárias").
 */
export const moviesRoutes = new Hono()
  .get(
    "/movies",
    zValidator("query", movieListQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(invalidParamsResponse(result.error.issues), 400);
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const items = await moviesService.listMovies(query);
      return c.json({ items });
    },
  )

  .get("/movies/genres", async (c) => {
    const items = await moviesService.listGenres();
    return c.json({ items });
  })

  .get(
    "/movies/:id",
    zValidator("param", idParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(invalidParamsResponse(result.error.issues), 400);
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const movie = await moviesService.getMovie(id);

      if (!movie) {
        throw new HTTPException(404, { message: `Filme "${id}" não encontrado` });
      }

      return c.json(movie);
    },
  );
