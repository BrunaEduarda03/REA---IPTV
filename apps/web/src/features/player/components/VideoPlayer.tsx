import type { KeyboardEvent } from "react";
import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { mapKeyToAction } from "../lib/mapKeyToAction";
import { usePlayerUiStore } from "../store/playerUiStore";
import { PlayerControls } from "./PlayerControls";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
}

const VOLUME_STEP = 0.1;

/**
 * Componente "burro" de orquestração mínima: toda a lógica de reprodução
 * mora em `useVideoPlayer` (testável sem renderizar nada); este componente
 * decide O QUE mostrar para cada `state.status` — loading, erro, ou os
 * controles normais — e traduz teclas (via `mapKeyToAction`, função pura)
 * em chamadas às ações já expostas pelo hook.
 */
export function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const { videoRef, state, play, pause, toggleMute, setVolume } = useVideoPlayer(src);
  const isTheaterMode = usePlayerUiStore((playerUi) => playerUi.isTheaterMode);
  const toggleTheaterMode = usePlayerUiStore((playerUi) => playerUi.toggleTheaterMode);

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const action = mapKeyToAction(event.key);
    if (!action) return;
    event.preventDefault(); // evita, ex., a página rolar com espaço/setas enquanto o player está focado

    switch (action) {
      case "toggle-play":
        if (state.status === "playing") pause();
        else play();
        break;
      case "toggle-mute":
        toggleMute();
        break;
      case "volume-up":
        setVolume(Math.min(1, state.volume + VOLUME_STEP));
        break;
      case "volume-down":
        setVolume(Math.max(0, state.volume - VOLUME_STEP));
        break;
      case "toggle-theater":
        toggleTheaterMode();
        break;
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={`Player de ${title}. Atalhos: espaço (play/pause), setas (volume), M (mudo), T (modo cinema)`}
        data-testid="video-player-shortcuts"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative aspect-video overflow-hidden rounded-token bg-black focus:outline focus:outline-2 focus:outline-accent"
      >
        <video
          ref={videoRef}
          poster={poster}
          aria-label={title}
          playsInline
          className="h-full w-full"
        />

        {state.status === "loading" && (
          <div
            role="status"
            aria-live="polite"
            className="absolute inset-0 flex items-center justify-center bg-black/70 text-sm text-text-secondary"
          >
            Carregando vídeo…
          </div>
        )}

        {state.status === "error" && (
          <div
            role="alert"
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/90 px-4 text-center"
          >
            <p className="text-sm font-semibold text-danger">{state.errorMessage}</p>
          </div>
        )}
      </div>

      <PlayerControls
        state={state}
        onPlay={play}
        onPause={pause}
        onToggleMute={toggleMute}
        onVolumeChange={setVolume}
        isTheaterMode={isTheaterMode}
        onToggleTheaterMode={toggleTheaterMode}
      />

      <p className="text-xs text-text-muted">
        Mídia de demonstração pública (não é o conteúdo real deste título fictício). Atalhos de teclado: clique no
        vídeo e use espaço (play/pause), setas para cima/baixo (volume), M (mudo) e T (modo cinema).
      </p>
    </div>
  );
}
