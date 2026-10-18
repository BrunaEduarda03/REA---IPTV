import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="text-xl font-bold text-text-primary">Página não encontrada</h1>
      <p className="text-text-secondary">O endereço acessado não existe nesta aplicação.</p>
      <Link
        to="/"
        className="inline-flex items-center justify-center rounded-token bg-accent px-4 py-2 text-sm font-semibold text-surface-base transition-colors hover:bg-accent-hover"
      >
        Voltar ao início
      </Link>
    </section>
  );
}
