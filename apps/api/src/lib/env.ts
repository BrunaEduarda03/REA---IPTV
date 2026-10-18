import { z } from "zod";

/**
 * Variáveis de ambiente do backend, validadas na inicialização.
 *
 * Por quê validar aqui (e não só usar `process.env.X` direto nas rotas):
 * se uma variável obrigatória estiver ausente ou no formato errado, queremos
 * que o processo falhe IMEDIATAMENTE ao subir — com uma mensagem clara —
 * em vez de falhar de forma confusa em algum request no meio da produção.
 */
const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  WEB_ORIGIN: z.string().url().default("http://localhost:5173"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
    throw new Error("Falha ao validar variáveis de ambiente. Veja o detalhe acima.");
  }
  return parsed.data;
}

export const env = loadEnv();
