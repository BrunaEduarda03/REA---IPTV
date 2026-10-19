import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import type { ApiError } from "@saimotv/shared";
import { channelListQuerySchema, idParamSchema } from "./catalog.schemas";
import { catalogService } from "./catalog.service";

/**
 * `zValidator` (do pacote oficial `@hono/zod-validator`) resolve, em uma
 * linha por rota, o que seria repetido manualmente em toda rota que recebe
 * entrada: ler query/param, rodar `.safeParse`, e devolver 400 com detalhe
 * se falhar. Por que usar a lib em vez de escrever isso à mão: é código
 * puramente mecânico (nenhuma regra de negócio), oficial do próprio
 * ecossistema Hono, e a alternativa (repetir esse bloco em cada rota)
 * violaria o princípio de baixo acoplamento sem ganhar nada em clareza.
 *
 * O terceiro argumento (`hook`) customiza o formato do erro 400 para o
 * mesmo contrato `ApiError` usado em qualquer outro erro da API — sem ele,
 * a lib devolveria seu próprio formato, diferente do nosso.
 */
function invalidParamsResponse(issues: { path: PropertyKey[]; message: string }[]) {
  const body: ApiError = {
    error: "Parâmetros inválidos",
    issues: issues.map((issue) => ({ path: issue.path.map(String).join("."), message: issue.message })),
  };
  return body;
}

export const catalogRoutes = new Hono()
  .get("/categories", (c) => {
    return c.json({ items: catalogService.listCategories() });
  })

  .get(
    "/channels",
    zValidator("query", channelListQuerySchema, (result, c) => {
      if (!result.success) {
        return c.json(invalidParamsResponse(result.error.issues), 400);
      }
    }),
    async (c) => {
      const query = c.req.valid("query");
      const result = catalogService.listChannels(query);
      const items = await catalogService.enrichChannelsWithTmdb(result.items);
      return c.json({ ...result, items });
    },
  )

  .get(
    "/channels/:id",
    zValidator("param", idParamSchema, (result, c) => {
      if (!result.success) {
        return c.json(invalidParamsResponse(result.error.issues), 400);
      }
    }),
    async (c) => {
      const { id } = c.req.valid("param");
      const channel = catalogService.getChannelById(id);

      if (!channel) {
        // Mensagem deliberadamente genérica (não ecoa dado bruto do
        // cliente além do id solicitado, que o próprio cliente já conhece).
        throw new HTTPException(404, { message: `Conteúdo "${id}" não encontrado` });
      }

      const enriched = await catalogService.enrichChannel(channel);
      return c.json(enriched);
    },
  );
