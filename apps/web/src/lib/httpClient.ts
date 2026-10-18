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
 * Client HTTP centralizado: TODA chamada da aplicação ao backend passa por
 * aqui, nunca um `fetch` solto espalhado pelos componentes. Isso dá um único
 * lugar para tratar a URL base, erros de rede e (no futuro) cabeçalhos
 * comuns — sem precisar caçar cada chamada individual depois.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${env.VITE_API_URL}${path}`);

  if (!response.ok) {
    throw new HttpError(response.status, `Falha ao buscar ${path}: HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}
