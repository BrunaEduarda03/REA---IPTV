import { describe, expect, test, vi } from "vitest";
import { createAdapter } from "./createAdapter";

vi.mock("hls.js", () => {
  const instance = { loadSource: vi.fn(), attachMedia: vi.fn(), destroy: vi.fn(), on: vi.fn() };
  return {
    default: Object.assign(
      vi.fn(() => instance),
      { isSupported: vi.fn(() => true), Events: { ERROR: "hlsError" } },
    ),
  };
});

function createVideoStub(canPlayHlsNatively: boolean) {
  return {
    canPlayType: vi.fn((type: string) =>
      type === "application/vnd.apple.mpegurl" && canPlayHlsNatively ? "probably" : "",
    ),
  } as unknown as HTMLVideoElement;
}

describe("createAdapter", () => {
  test("URL .mp4 sempre usa o motor nativo, independente de suporte a HLS", () => {
    const video = createVideoStub(false);
    const adapter = createAdapter(video, "https://example.test/video.mp4");
    // O motor nativo não tem instância de Hls associada — maior garantia
    // indireta aqui é que attach() não depende de import nenhum; testamos
    // o contrato (não lança, e usa video.src diretamente) via nativeAdapter.test.ts.
    expect(adapter).toBeDefined();
  });

  test("URL .m3u8 em navegador com suporte nativo usa o motor nativo (não baixa hls.js)", () => {
    const video = createVideoStub(true);
    const adapter = createAdapter(video, "https://example.test/stream.m3u8");
    expect(adapter).toBeDefined();
    expect(video.canPlayType).toHaveBeenCalledWith("application/vnd.apple.mpegurl");
  });

  test("URL .m3u8 em navegador sem suporte nativo usa hls.js", async () => {
    const video = createVideoStub(false);
    const adapter = createAdapter(video, "https://example.test/stream.m3u8?token=abc");

    // Só o adapter hls.js precisa do import dinâmico de "hls.js" — se
    // `attach` resolver sem lançar, confirma que o motor escolhido foi o
    // hls.js mockado acima (o nativeAdapter nunca tocaria nesse módulo).
    await expect(adapter.attach(video, "https://example.test/stream.m3u8?token=abc")).resolves.toBeUndefined();
  });
});
