import { healthResponseSchema, type HealthResponse } from "@saimotv/shared";
import { apiGet } from "@/lib/httpClient";

/**
 * Busca /api/health e valida a resposta contra o MESMO schema Zod que o
 * backend usa para construí-la (`@saimotv/shared`). Mesmo que o `fetch`
 * tenha sucesso (HTTP 200), o payload só é confiado depois de passar por
 * `.parse()` — nunca fazemos `as HealthResponse` sem validar de verdade.
 */
export async function getHealth(): Promise<HealthResponse> {
  const data = await apiGet<unknown>("/api/health");
  return healthResponseSchema.parse(data);
}
