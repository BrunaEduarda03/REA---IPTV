import { z } from "zod";

/**
 * Contrato da resposta de GET /api/health.
 *
 * Este schema é a ÚNICA fonte de verdade sobre o formato dessa resposta:
 * o backend o usa para validar o que está prestes a devolver, e o frontend
 * o usa para validar o que recebeu antes de confiar no dado. Nenhum dos
 * dois lados redefine este tipo manualmente — ambos importam daqui.
 */
export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("saimotv-lab-api"),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
