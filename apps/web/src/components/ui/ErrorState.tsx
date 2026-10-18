import { Button } from "./Button";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-token border border-danger-muted bg-danger-muted py-12 text-center"
    >
      <p className="text-sm font-semibold text-danger">{message}</p>
      {onRetry && (
        <Button variant="ghost" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
