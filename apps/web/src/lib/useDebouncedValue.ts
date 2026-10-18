import { useEffect, useState } from "react";

/** Devolve `value`, mas só depois de ele ficar `delayMs` sem mudar — evita
 * disparar uma requisição a cada tecla digitada em um campo de busca. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timeout);
  }, [value, delayMs]);

  return debounced;
}
