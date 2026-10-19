import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Destaque curto logo abaixo do título (ex.: contagem de itens) — cor de
   * acento, imitando o padrão "34.415 títulos" observado na referência
   * (ver visual-audit.md), mas com dado real da nossa própria API. */
  accent?: string;
  description?: string;
  actions?: ReactNode;
}

/**
 * Cabeçalho de página consistente (Sprint 02.5) — título grande, destaque
 * opcional, descrição, e um slot de ações à direita (ex.: controle de
 * ordenação). Usado por toda página de listagem, substituindo o `<header>`
 * ad-hoc que cada página montava à mão antes desta sprint.
 */
export function PageHeader({ title, accent, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-3 pb-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">{title}</h1>
        {accent && <p className="text-sm font-semibold text-accent">{accent}</p>}
        {description && <p className="max-w-prose text-sm text-text-secondary">{description}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
