import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useState } from "react";

/**
 * Um QueryClient por instância de app (criado dentro de `useState` em vez
 * de no escopo do módulo) — evita compartilhar cache entre diferentes
 * renders em testes/SSR futuro. Padrão recomendado pela própria
 * documentação do TanStack Query.
 */
export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
