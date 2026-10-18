import type { MediaSourceAdapter } from "../types/player";

/** O caso mais simples: deixa o próprio `<video>` do navegador resolver a
 * fonte. Usado para MP4 progressivo, e para HLS em navegadores que o
 * suportam nativamente (Safari/iOS) — nesse caso, `hls.js` nem é
 * carregado (ver `createAdapter.ts`). */
export function createNativeAdapter(): MediaSourceAdapter {
  let currentVideo: HTMLVideoElement | null = null;

  return {
    attach(video, src) {
      currentVideo = video;
      video.src = src;
    },
    destroy() {
      // `removeAttribute` + `load()` é o jeito correto de zerar o estado
      // de carregamento do elemento nativo — só setar `src = ""` ainda
      // deixa o navegador "lembrando" a última fonte em alguns browsers.
      if (currentVideo) {
        currentVideo.removeAttribute("src");
        currentVideo.load();
        currentVideo = null;
      }
    },
  };
}
