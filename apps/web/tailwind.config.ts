import type { Config } from "tailwindcss";

/**
 * Design tokens próprios do SaimoTV Lab.
 *
 * Paleta deliberadamente distinta da identidade visual do Saimo TV original
 * (que usa gradiente ciano→roxo, #4ff3e0 a #a35cf0): aqui o acento é âmbar
 * sobre uma base "slate" fria, para ter uma assinatura visual própria.
 * Tokens expostos como variáveis CSS (ver src/styles/index.css) para que
 * um eventual tema claro troque só os valores, não as classes usadas.
 */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        surface: {
          base: "var(--color-surface-base)",
          raised: "var(--color-surface-raised)",
          overlay: "var(--color-surface-overlay)",
        },
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        text: {
          primary: "var(--color-text-primary)",
          secondary: "var(--color-text-secondary)",
          muted: "var(--color-text-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          hover: "var(--color-accent-hover)",
          muted: "var(--color-accent-muted)",
        },
        danger: {
          DEFAULT: "var(--color-danger)",
          muted: "var(--color-danger-muted)",
        },
        success: {
          DEFAULT: "var(--color-success)",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        token: "var(--radius-base)",
      },
      spacing: {
        "gutter": "var(--space-gutter)",
      },
    },
  },
  plugins: [],
} satisfies Config;
