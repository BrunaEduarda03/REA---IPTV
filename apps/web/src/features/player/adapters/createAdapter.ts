import type { MediaSourceAdapter } from "../types/player";
import { createNativeAdapter } from "./nativeAdapter";
import { createHlsAdapter } from "./hlsAdapter";

function isHlsUrl(src: string): boolean {
  return src.toLowerCase().split("?")[0]!.endsWith(".m3u8");
}

/**
 * Escolhe o motor pelo mesmo princípio aprendido na Fase 03 da engenharia
 * reversa (testar a URL, não confiar em metadado externo) — mas a REGRA em
 * si é original e mais simples, proporcional ao que esta sprint precisa:
 *
 * 1. Não é `.m3u8` → motor nativo (MP4/WebM progressivo).
 * 2. É `.m3u8` e o navegador sabe tocar HLS sozinho (Safari) → motor
 *    nativo também, sem baixar hls.js à toa.
 * 3. É `.m3u8` e o navegador NÃO sabe tocar HLS sozinho → hls.js.
 */
export function createAdapter(video: HTMLVideoElement, src: string): MediaSourceAdapter {
  if (!isHlsUrl(src)) return createNativeAdapter();

  const supportsNativeHls = video.canPlayType("application/vnd.apple.mpegurl") !== "";
  if (supportsNativeHls) return createNativeAdapter();

  return createHlsAdapter();
}
