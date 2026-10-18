import type { MiddlewareHandler } from "hono";

/**
 * Logger mínimo: método, caminho, status e duração — nunca corpo da
 * requisição, headers de autenticação ou qualquer dado potencialmente
 * sensível. Suficiente para depurar localmente nesta sprint; um logger
 * estruturado (ex. pino) é candidato natural quando houver observabilidade
 * real a fazer (ver docs/implementation/decisions.md).
 */
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = performance.now();
  await next();
  const durationMs = (performance.now() - start).toFixed(1);
  console.log(`${c.req.method} ${c.req.path} -> ${c.res.status} (${durationMs}ms)`);
};
