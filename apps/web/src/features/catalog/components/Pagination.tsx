import { Button } from "@/components/ui/Button";

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Paginação do catálogo" className="flex items-center justify-center gap-4 pt-2">
      <Button variant="ghost" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
        Anterior
      </Button>
      <span className="text-sm text-text-secondary" aria-live="polite">
        Página {page} de {totalPages}
      </span>
      <Button variant="ghost" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
        Próxima
      </Button>
    </nav>
  );
}
