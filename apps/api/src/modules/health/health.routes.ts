import { Hono } from "hono";
import { healthResponseSchema } from "@saimotv/shared";

export const healthRoutes = new Hono().get("/health", (c) => {
  // Construído e validado contra o MESMO schema que o frontend usa para
  // interpretar a resposta — se um dos dois lados divergir do contrato,
  // isso quebra em desenvolvimento (aqui) ou em teste, nunca silenciosamente.
  const body = healthResponseSchema.parse({
    status: "ok",
    service: "saimotv-lab-api",
  });

  return c.json(body, 200);
});
