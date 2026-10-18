import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { useVideoPlayer } from "./useVideoPlayer";

const destroyCallOrder: string[] = [];

function makeFakeAdapter(id: string) {
  return {
    attach: vi.fn(async () => {}),
    destroy: vi.fn(() => destroyCallOrder.push(id)),
  };
}

let adapterA: ReturnType<typeof makeFakeAdapter>;
let adapterB: ReturnType<typeof makeFakeAdapter>;

vi.mock("../adapters/createAdapter", () => ({
  createAdapter: vi.fn((_video: HTMLVideoElement, src: string) => {
    if (src === "src-a") return adapterA;
    if (src === "src-b") return adapterB;
    throw new Error(`src inesperado no teste: ${src}`);
  }),
}));

/** `renderHook` sozinho não monta nenhum `<video>` real — e o hook exige
 * `videoRef.current` preenchido para fazer qualquer coisa (é assim que ele
 * evita trabalhar sobre um elemento que ainda não existe no DOM). Este
 * harness renderiza o `<video>` de verdade, do mesmo jeito que
 * `VideoPlayer.tsx` faz em produção. */
function Harness({ src }: { src: string }) {
  const { videoRef, state } = useVideoPlayer(src);
  return (
    <div>
      <video ref={videoRef} data-testid="video" />
      <span data-testid="status">{state.status}</span>
    </div>
  );
}

describe("useVideoPlayer", () => {
  beforeEach(() => {
    destroyCallOrder.length = 0;
    adapterA = makeFakeAdapter("A");
    adapterB = makeFakeAdapter("B");
  });

  test("anexa o motor correspondente à fonte inicial", async () => {
    render(<Harness src="src-a" />);
    await waitFor(() => expect(adapterA.attach).toHaveBeenCalledTimes(1));
  });

  test("trocar a fonte destrói o motor anterior ANTES de criar o novo (sem dois motores ativos ao mesmo tempo)", async () => {
    const { rerender } = render(<Harness src="src-a" />);
    await waitFor(() => expect(adapterA.attach).toHaveBeenCalledTimes(1));
    expect(adapterA.destroy).not.toHaveBeenCalled();

    rerender(<Harness src="src-b" />);

    await waitFor(() => expect(adapterB.attach).toHaveBeenCalledTimes(1));
    expect(adapterA.destroy).toHaveBeenCalledOnce();
    expect(adapterB.destroy).not.toHaveBeenCalled();
    // A ordem importa: destruir vem antes de anexar o novo motor.
    expect(destroyCallOrder).toEqual(["A"]);
  });

  test("desmontar o componente destrói o motor ativo", async () => {
    const { unmount } = render(<Harness src="src-a" />);
    await waitFor(() => expect(adapterA.attach).toHaveBeenCalledTimes(1));

    unmount();

    expect(adapterA.destroy).toHaveBeenCalledOnce();
  });

  test("evento nativo de erro no vídeo muda o status para 'error'", async () => {
    render(<Harness src="src-a" />);
    await waitFor(() => expect(adapterA.attach).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByTestId("video").dispatchEvent(new Event("error"));
    });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"));
  });

  test("evento 'playing' muda o status para 'playing'", async () => {
    render(<Harness src="src-a" />);
    await waitFor(() => expect(adapterA.attach).toHaveBeenCalledTimes(1));

    act(() => {
      screen.getByTestId("video").dispatchEvent(new Event("playing"));
    });

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("playing"));
  });
});
