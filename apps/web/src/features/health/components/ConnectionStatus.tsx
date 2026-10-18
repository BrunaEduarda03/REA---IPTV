import { useHealthQuery } from "../hooks/useHealthQuery";

const STATUS_STYLES = {
  loading: "bg-surface-overlay text-text-muted",
  online: "bg-success/10 text-success",
  error: "bg-danger-muted text-danger",
} as const;

/**
 * Indicador discreto de conectividade com a API — pensado para
 * desenvolvimento/depuração, não como uma mensagem voltada ao usuário final
 * (por isso o texto é técnico e o componente é pequeno, no canto da tela).
 */
export function ConnectionStatus() {
  const { data, isLoading, isError } = useHealthQuery();

  const state: keyof typeof STATUS_STYLES = isLoading ? "loading" : isError ? "error" : "online";

  const label = {
    loading: "Conectando à API…",
    online: data ? `API online (${data.service})` : "API online",
    error: "Falha ao conectar com a API",
  }[state];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 rounded-token border border-border px-3 py-1 text-xs font-medium ${STATUS_STYLES[state]}`}
    >
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 rounded-full ${
          state === "online" ? "bg-success" : state === "error" ? "bg-danger" : "bg-text-muted"
        }`}
      />
      {label}
    </div>
  );
}
