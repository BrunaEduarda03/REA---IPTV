import { useVideoPlayer } from "../hooks/useVideoPlayer";
import { PlayerControls } from "./PlayerControls";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title: string;
}

/**
 * Componente "burro" de orquestração mínima: toda a lógica mora em
 * `useVideoPlayer` (testável sem renderizar nada); este componente só
 * decide O QUE mostrar para cada `state.status` — loading, erro, ou os
 * controles normais.
 */
export function VideoPlayer({ src, poster, title }: VideoPlayerProps) {
  const { videoRef, state, play, pause, toggleMute, setVolume } = useVideoPlayer(src);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video overflow-hidden rounded-token bg-black">
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
      />

      <p className="text-xs text-text-muted">
        Mídia de demonstração pública (não é o conteúdo real deste título fictício).
      </p>
    </div>
  );
}
