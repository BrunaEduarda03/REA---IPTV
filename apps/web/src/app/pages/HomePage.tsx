export function HomePage() {
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-bold text-text-primary">Bem-vinda ao SaimoTV Lab</h1>
      <p className="max-w-prose text-text-secondary">
        Esta é a fundação full stack da Sprint 01: frontend React servido pelo Vite, backend Hono em
        Bun, e um contrato Zod compartilhado entre os dois. O catálogo, a busca e o player chegam na
        Sprint 02 em diante.
      </p>
    </section>
  );
}
