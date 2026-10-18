import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-surface-base hover:bg-accent-hover",
  ghost: "bg-transparent text-text-secondary hover:bg-surface-overlay hover:text-text-primary",
};

/**
 * Componente de UI "burro" de propósito: sem lógica de domínio, só
 * apresentação + acessibilidade (foco visível vem do :focus-visible global
 * em styles/index.css). Variantes cobrem só o que já é necessário — nada
 * especulativo (ver ADR-002 em docs/implementation/decisions.md).
 */
export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-token px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  );
}
