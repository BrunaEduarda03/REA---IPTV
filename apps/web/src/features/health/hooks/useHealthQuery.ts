import { useQuery } from "@tanstack/react-query";
import { getHealth } from "../api/getHealth";

/**
 * Este é "server state": um dado que vive no backend, pode ficar velho,
 * pode falhar ao buscar, e cuja responsabilidade (cache, retry, refetch)
 * pertence ao TanStack Query — não ao Zustand. Ver
 * docs/implementation/learning.md para a explicação completa dessa
 * distinção (server state vs. client state).
 */
export function useHealthQuery() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 15_000,
    // `retry` deliberadamente NÃO é fixado aqui: fica a cargo da política
    // padrão do QueryClient (ver app/providers/QueryProvider.tsx), para que
    // testes possam desligar retries no client sem precisar sobrescrever
    // cada hook individualmente.
  });
}
