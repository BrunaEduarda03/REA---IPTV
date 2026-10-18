import { z } from "zod";

/**
 * Lê e valida as variáveis de ambiente expostas pelo Vite (`import.meta.env`,
 * sempre prefixadas com VITE_ — é o próprio Vite que só expõe ao bundle
 * variáveis com esse prefixo, por segurança: nenhum segredo do `.env` sem
 * esse prefixo vaza para o código do navegador).
 */
const envSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3001"),
});

export const env = envSchema.parse(import.meta.env);
