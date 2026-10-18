export type PlayerStatus = "idle" | "loading" | "playing" | "paused" | "error" | "ended";

export interface PlayerState {
  status: PlayerStatus;
  errorMessage: string | null;
  isMuted: boolean;
  volume: number;
}

export const initialPlayerState: PlayerState = {
  status: "idle",
  errorMessage: null,
  isMuted: false,
  volume: 1,
};

/**
 * Interface que qualquer motor de reprodução precisa cumprir. O
 * `usePlayer` (hooks/useVideoPlayer.ts) só conhece ESTA interface — nunca
 * importa `hls.js` nem sabe se está lidando com HLS ou um arquivo
 * progressivo. Isso é o que permite trocar/adicionar um motor (ex.: Shaka
 * Player para DASH, numa evolução futura) sem tocar no hook.
 *
 * Padrão aprendido observando o Saimo TV (Fase 03 da engenharia reversa:
 * três motores por trás de uma única interface de troca de fonte) —
 * reimplementado aqui de forma original e bem mais simples, proporcional
 * ao escopo desta sprint (um motor nativo + hls.js, sem DASH/DRM).
 */
export interface MediaSourceAdapter {
  /** Conecta a fonte `src` ao elemento de vídeo. Pode ser assíncrono (ex.:
   * import dinâmico do hls.js antes de instanciá-lo). */
  attach(video: HTMLVideoElement, src: string): void | Promise<void>;
  /** Libera qualquer recurso do motor (instância, listeners internos).
   * Chamado SEMPRE antes de anexar uma nova fonte, e ao desmontar. */
  destroy(): void;
}
