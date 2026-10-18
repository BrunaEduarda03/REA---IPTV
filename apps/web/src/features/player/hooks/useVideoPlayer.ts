import { useCallback, useEffect, useRef, useState } from "react";
import { createAdapter } from "../adapters/createAdapter";
import { describeMediaError } from "../lib/describeMediaError";
import { initialPlayerState, type MediaSourceAdapter, type PlayerState } from "../types/player";

/**
 * Orquestra um único `<video>`: cria o motor certo para `src` (via
 * `createAdapter`), traduz eventos nativos de mídia em `PlayerState`, e
 * garante limpeza — do motor anterior E dos listeners — toda vez que `src`
 * muda ou o componente desmonta.
 *
 * A flag `cancelled`, fechada sobre o escopo do efeito, é o mesmo padrão de
 * proteção contra condição de corrida aprendido observando o Saimo TV
 * (ver docs/reverse-engineering/learning.md, item 15): se `src` trocar de
 * novo antes do `attach()` assíncrono (hls.js) terminar, a tentativa antiga
 * nunca aplica seu resultado sobre o player do novo `src`.
 */
export function useVideoPlayer(src: string) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const adapterRef = useRef<MediaSourceAdapter | null>(null);
  const [state, setState] = useState<PlayerState>(initialPlayerState);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let cancelled = false;

    setState((previous) => ({ ...previous, status: "loading", errorMessage: null }));

    // Nunca dois motores ativos ao mesmo tempo: destrói o anterior ANTES
    // de criar o novo.
    adapterRef.current?.destroy();
    adapterRef.current = null;

    const onCanPlay = () => {
      if (cancelled) return;
      setState((previous) => (previous.status === "error" ? previous : { ...previous, status: "paused" }));
    };
    const onPlaying = () => {
      if (cancelled) return;
      setState((previous) => ({ ...previous, status: "playing", errorMessage: null }));
    };
    const onPause = () => {
      if (cancelled) return;
      setState((previous) =>
        previous.status === "ended" || previous.status === "error"
          ? previous
          : { ...previous, status: "paused" },
      );
    };
    const onWaiting = () => {
      if (cancelled) return;
      setState((previous) => ({ ...previous, status: "loading" }));
    };
    const onEnded = () => {
      if (cancelled) return;
      setState((previous) => ({ ...previous, status: "ended" }));
    };
    const onError = () => {
      if (cancelled) return;
      setState((previous) => ({ ...previous, status: "error", errorMessage: describeMediaError(video.error) }));
    };
    const onHlsFatalError = (event: Event) => {
      if (cancelled) return;
      const message = (event as ErrorEvent).message || "Falha ao carregar o stream.";
      setState((previous) => ({ ...previous, status: "error", errorMessage: message }));
    };
    const onVolumeChange = () => {
      if (cancelled) return;
      setState((previous) => ({ ...previous, isMuted: video.muted, volume: video.volume }));
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("playing", onPlaying);
    video.addEventListener("pause", onPause);
    video.addEventListener("waiting", onWaiting);
    video.addEventListener("ended", onEnded);
    video.addEventListener("error", onError);
    video.addEventListener("hlsFatalError", onHlsFatalError);
    video.addEventListener("volumechange", onVolumeChange);

    const adapter = createAdapter(video, src);
    adapterRef.current = adapter;

    Promise.resolve(adapter.attach(video, src)).catch((error: unknown) => {
      if (cancelled) return;
      const message = error instanceof Error ? error.message : "Não foi possível carregar este vídeo.";
      setState((previous) => ({ ...previous, status: "error", errorMessage: message }));
    });

    return () => {
      cancelled = true;
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("playing", onPlaying);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("waiting", onWaiting);
      video.removeEventListener("ended", onEnded);
      video.removeEventListener("error", onError);
      video.removeEventListener("hlsFatalError", onHlsFatalError);
      video.removeEventListener("volumechange", onVolumeChange);
      adapterRef.current?.destroy();
      adapterRef.current = null;
    };
  }, [src]);

  const play = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    // Mesma política de autoplay observada no Saimo TV (Fase 03): tenta
    // com som; se o navegador bloquear, tenta mudo antes de desistir.
    // `Promise.resolve(...)` por segurança: a spec garante que
    // `video.play()` sempre devolve uma Promise, mas isso não é
    // verdade em todo ambiente de teste (jsdom devolve `undefined`).
    Promise.resolve(video.play()).catch(() => {
      video.muted = true;
      Promise.resolve(video.play()).catch(() => {});
    });
  }, []);

  const pause = useCallback(() => {
    videoRef.current?.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (video) video.muted = !video.muted;
  }, []);

  const setVolume = useCallback((value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    if (value > 0) video.muted = false;
  }, []);

  return { videoRef, state, play, pause, toggleMute, setVolume };
}
