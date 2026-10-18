import { Button } from "@/components/ui/Button";
import type { PlayerState } from "../types/player";

interface PlayerControlsProps {
  state: PlayerState;
  onPlay: () => void;
  onPause: () => void;
  onToggleMute: () => void;
  onVolumeChange: (value: number) => void;
  isTheaterMode: boolean;
  onToggleTheaterMode: () => void;
}

export function PlayerControls({
  state,
  onPlay,
  onPause,
  onToggleMute,
  onVolumeChange,
  isTheaterMode,
  onToggleTheaterMode,
}: PlayerControlsProps) {
  const isPlaying = state.status === "playing";

  return (
    <div className="flex items-center gap-3 rounded-token bg-surface-overlay px-3 py-2">
      <Button
        type="button"
        variant="ghost"
        className="px-3"
        onClick={isPlaying ? onPause : onPlay}
        aria-label={isPlaying ? "Pausar" : "Reproduzir"}
      >
        {isPlaying ? "Pausar" : "Reproduzir"}
      </Button>

      <Button
        type="button"
        variant="ghost"
        className="px-3"
        onClick={onToggleMute}
        aria-label={state.isMuted ? "Ativar som" : "Mudo"}
        aria-pressed={state.isMuted}
      >
        {state.isMuted ? "Mudo" : "Som"}
      </Button>

      <label className="flex items-center gap-2 text-xs text-text-secondary">
        Volume
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={state.isMuted ? 0 : state.volume}
          onChange={(event) => onVolumeChange(Number(event.target.value))}
          aria-label="Volume"
          className="accent-accent"
        />
      </label>

      <Button
        type="button"
        variant="ghost"
        className="ml-auto px-3"
        onClick={onToggleTheaterMode}
        aria-label={isTheaterMode ? "Sair do modo cinema" : "Modo cinema"}
        aria-pressed={isTheaterMode}
      >
        {isTheaterMode ? "Sair do modo cinema" : "Modo cinema"}
      </Button>
    </div>
  );
}
