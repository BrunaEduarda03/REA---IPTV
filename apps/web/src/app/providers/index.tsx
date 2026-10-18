import type { PropsWithChildren } from "react";
import { QueryProvider } from "./QueryProvider";

/**
 * Ponto único de composição de providers. Hoje só o TanStack Query — o
 * Zustand NÃO precisa de provider (sua store é só um hook, importado
 * diretamente onde for usada: ver app/store/uiStore.ts).
 */
export function AppProviders({ children }: PropsWithChildren) {
  return <QueryProvider>{children}</QueryProvider>;
}
