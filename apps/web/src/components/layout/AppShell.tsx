import type { PropsWithChildren } from "react";
import { TopNavigation } from "./TopNavigation";
import { MobileNavigation } from "./MobileNavigation";

/**
 * Casca da aplicação (Sprint 02.5) — substitui `PageShell` (sidebar fixa +
 * barra superior estreita, um padrão de dashboard administrativo) por uma
 * experiência de catálogo de entretenimento: navegação horizontal no
 * desktop, barra de abas no rodapé em telas estreitas, conteúdo centralizado
 * em largura fluida sobre um fundo cinematográfico (`.bg-cinematic`, ver
 * styles/index.css — gradientes originais, nenhum asset copiado).
 *
 * Ver docs/implementation/visual-audit.md para o levantamento que motivou
 * cada decisão, e ADR-027 em decisions.md para o raciocínio completo.
 */
export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="min-h-dvh">
      <div className="bg-cinematic" aria-hidden="true" />
      <TopNavigation />
      <main className="mx-auto w-full max-w-[1400px] px-gutter pb-24 pt-6 lg:pb-12">{children}</main>
      <MobileNavigation />
    </div>
  );
}
