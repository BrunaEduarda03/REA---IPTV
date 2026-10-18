import { Hono } from "hono";
import { cors } from "hono/cors";
import { env } from "./lib/env";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { healthRoutes } from "./modules/health/health.routes";

/**
 * Monta o app Hono sem iniciar o servidor — separado de `index.ts` de
 * propósito, para que os testes possam importar `app` e chamar
 * `app.request(...)` diretamente, sem abrir uma porta de rede de verdade.
 */
export function createApp() {
  const app = new Hono();

  app.use(requestLogger);
  app.use(
    "/api/*",
    cors({
      origin: env.WEB_ORIGIN,
      allowMethods: ["GET", "POST", "OPTIONS"],
    }),
  );

  app.route("/api", healthRoutes);

  app.onError(errorHandler);

  return app;
}
