export type PlayerShortcutAction = "toggle-play" | "toggle-mute" | "volume-up" | "volume-down" | "toggle-theater";

const KEY_TO_ACTION: Record<string, PlayerShortcutAction> = {
  " ": "toggle-play",
  m: "toggle-mute",
  M: "toggle-mute",
  ArrowUp: "volume-up",
  ArrowDown: "volume-down",
  t: "toggle-theater",
  T: "toggle-theater",
};

/**
 * Função pura: só traduz uma tecla em uma intenção. Não sabe nada de
 * `<video>`, Zustand ou React — por isso é testável sem nenhum mock de DOM,
 * e é o único lugar que precisaria mudar para adicionar/remover um atalho.
 */
export function mapKeyToAction(key: string): PlayerShortcutAction | null {
  return KEY_TO_ACTION[key] ?? null;
}
