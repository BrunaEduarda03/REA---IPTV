import type { ReactNode } from "react";

interface ContentRailProps {
  title: string;
  children: ReactNode;
}

/**
 * Trilho horizontal com scroll-snap (ver `.content-rail` em
 * styles/index.css) — padrão de "fileira de pôsteres" observado na
 * referência (seção "Em alta", ver visual-audit.md), implementado aqui só
 * com CSS nativo (scroll-snap + `overflow-x-auto`), sem nenhuma biblioteca
 * de carrossel: suporta teclado, trackpad e touch de graça.
 */
export function ContentRail({ title, children }: ContentRailProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">{title}</h2>
      <div className="content-rail -mx-gutter flex gap-4 overflow-x-auto px-gutter pb-1">{children}</div>
    </section>
  );
}
