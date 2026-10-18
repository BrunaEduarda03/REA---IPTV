import { useEffect, useState } from "react";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Mantém um valor "de rascunho" local (`draft`) para a digitação parecer
 * instantânea, e só propaga para `onChange` (que atualiza a URL — ver
 * CatalogPage) depois de 400ms sem novas teclas. Sem isso, cada letra
 * digitada dispararia uma requisição e uma mudança de URL separadas.
 */
export function SearchInput({ value, onChange }: SearchInputProps) {
  const [draft, setDraft] = useState(value);
  const debounced = useDebouncedValue(draft, 400);

  useEffect(() => {
    if (debounced !== value) onChange(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // Sincroniza quando o valor muda por fora (ex.: um botão "limpar filtros").
  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="relative">
      <input
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Buscar por nome ou descrição"
        aria-label="Buscar conteúdo"
        className="w-full rounded-token border border-border bg-surface-overlay px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus-visible:border-accent"
      />
    </div>
  );
}
