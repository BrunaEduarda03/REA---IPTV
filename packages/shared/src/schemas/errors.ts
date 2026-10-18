import { z } from "zod";

/**
 * Formato ÚNICO de erro que qualquer endpoint da API pode devolver —
 * independente de ser 400 (parâmetro inválido), 404 (não encontrado) ou
 * 500 (erro interno). `issues` só aparece em erros de validação; nunca
 * inclui mensagens de stack trace ou detalhe interno (ver
 * apps/api/src/middleware/errorHandler.ts).
 */
export const apiErrorSchema = z.object({
  error: z.string(),
  issues: z
    .array(
      z.object({
        path: z.string(),
        message: z.string(),
      }),
    )
    .optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
