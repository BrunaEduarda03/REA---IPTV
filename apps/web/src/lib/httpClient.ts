import { apiErrorSchema } from "@saimotv/shared";
import { env } from "./env";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/**
 * Tenta ler `{ error, issues? }` do corpo da resposta (nosso contrato de
 * erro, ver packages/shared/src/schemas/errors.ts). Se o corpo não bater
 * com esse formato (ex.: a API nem chegou a responder, ou um proxy no meio
 * do caminho devolveu HTML), cai para uma mensagem genérica — nunca deixa
 * o erro "sumir" por falha ao fazer parse do próprio erro.
 */
async function extractErrorMessage(response: Response, path: string): Promise<string> {
  try {
    const body: unknown = await response.json();
    const parsed = apiErrorSchema.safeParse(body);
    if (parsed.success) return parsed.data.error;
  } catch {
    // corpo não era JSON — segue para a mensagem genérica abaixo
  }
  return `Falha ao buscar ${path}: HTTP ${response.status}`;
}

/**
 * Client HTTP centralizado: TODA chamada da aplicação ao backend passa por
 * aqui, nunca um `fetch` solto espalhado pelos componentes. Isso dá um único
 * lugar para tratar a URL base, erros de rede e (no futuro) cabeçalhos
 * comuns — sem precisar caçar cada chamada individual depois.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`);

  if (!response.ok) {
    throw new HttpError(response.status, await extractErrorMessage(response, path));
  }

  return (await response.json()) as T;
}
