import { describe, expect, test, vi } from "vitest";
import { createNativeAdapter } from "./nativeAdapter";

function createVideoStub() {
  return {
    src: "",
    removeAttribute: vi.fn(function (this: { src: string }, name: string) {
      if (name === "src") this.src = "";
    }),
    load: vi.fn(),
  } as unknown as HTMLVideoElement;
}

describe("nativeAdapter", () => {
  test("attach define video.src diretamente", () => {
    const adapter = createNativeAdapter();
    const video = createVideoStub();

    adapter.attach(video, "https://example.test/video.mp4");

    expect(video.src).toBe("https://example.test/video.mp4");
  });

  test("destroy remove o atributo src e chama load() para zerar o estado do elemento", () => {
    const adapter = createNativeAdapter();
    const video = createVideoStub();
    adapter.attach(video, "https://example.test/video.mp4");

    adapter.destroy();

    expect(video.removeAttribute).toHaveBeenCalledWith("src");
    expect(video.load).toHaveBeenCalledOnce();
  });

  test("destroy chamado sem attach anterior não lança erro", () => {
    const adapter = createNativeAdapter();
    expect(() => adapter.destroy()).not.toThrow();
  });
});
