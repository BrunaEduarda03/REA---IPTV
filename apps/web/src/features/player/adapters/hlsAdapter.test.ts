import { describe, expect, test, vi, beforeEach } from "vitest";
import { createHlsAdapter } from "./hlsAdapter";

const mockInstance = {
  loadSource: vi.fn(),
  attachMedia: vi.fn(),
  destroy: vi.fn(),
  on: vi.fn(),
};

const MockHlsConstructor = vi.fn(() => mockInstance);

vi.mock("hls.js", () => ({
  default: Object.assign(MockHlsConstructor, {
    isSupported: vi.fn(() => true),
    Events: { ERROR: "hlsError" },
  }),
}));

function createVideoStub() {
  return { dispatchEvent: vi.fn() } as unknown as HTMLVideoElement;
}

describe("hlsAdapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("attach cria uma instância do Hls, carrega a fonte e anexa ao vídeo", async () => {
    const adapter = createHlsAdapter();
    const video = createVideoStub();

    await adapter.attach(video, "https://example.test/stream.m3u8");

    expect(MockHlsConstructor).toHaveBeenCalledTimes(1);
    expect(mockInstance.loadSource).toHaveBeenCalledWith("https://example.test/stream.m3u8");
    expect(mockInstance.attachMedia).toHaveBeenCalledWith(video);
  });

  test("destroy chama hls.destroy() na instância criada", async () => {
    const adapter = createHlsAdapter();
    const video = createVideoStub();
    await adapter.attach(video, "https://example.test/stream.m3u8");

    adapter.destroy();

    expect(mockInstance.destroy).toHaveBeenCalledOnce();
  });

  test("destroy sem attach anterior não lança erro", () => {
    const adapter = createHlsAdapter();
    expect(() => adapter.destroy()).not.toThrow();
  });
});
