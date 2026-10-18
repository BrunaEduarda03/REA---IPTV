import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Handler de erro central do Hono (`app.onError`).
 *
 * Qualquer exceção não tratada em uma rota cai aqui — garante que o cliente
 * sempre recebe um JSON consistente (nunca um stack trace cru ou um HTML de
 * erro do runtime), e que o status HTTP reflete o tipo de falha.
 */
export const errorHandler: ErrorHandler = (err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }

  console.error("Erro não tratado:", err);
  return c.json({ error: "Erro interno do servidor" }, 500);
};
