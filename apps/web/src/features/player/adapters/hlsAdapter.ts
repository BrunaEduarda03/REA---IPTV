import type { MediaSourceAdapter } from "../types/player";

/**
 * `hls.js` só é importado (import dinâmico) quando este adapter é de fato
 * usado — ninguém que nunca abre um vídeo HLS paga o custo de bundle dessa
 * biblioteca. É o mesmo raciocínio de lazy-loading observado no Saimo TV
 * para o Shaka Player (Fase 03 da engenharia reversa), aplicado aqui ao
 * hls.js.
 */
export function createHlsAdapter(): MediaSourceAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hls: any = null;

  return {
    async attach(video, src) {
      const { default: Hls } = await import("hls.js");

      if (!Hls.isSupported()) {
        throw new Error("Este navegador não suporta reprodução de HLS via hls.js.");
      }

      hls = new Hls({ enableWorker: true });
      hls.on(Hls.Events.ERROR, (_event: string, data: { fatal: boolean; details: string }) => {
        if (data.fatal) {
          // O hook (useVideoPlayer) escuta o evento nativo `error` do
          // <video> para erros do motor nativo; para hls.js, erros fatais
          // não necessariamente disparam esse evento — por isso disparamos
          // um evento de erro sintético no próprio elemento, mantendo UM
          // único lugar (o hook) tratando "o player deu erro".
          video.dispatchEvent(new ErrorEvent("hlsFatalError", { message: data.details }));
        }
      });

      hls.loadSource(src);
      hls.attachMedia(video);
    },

    destroy() {
      hls?.destroy();
      hls = null;
    },
  };
}
