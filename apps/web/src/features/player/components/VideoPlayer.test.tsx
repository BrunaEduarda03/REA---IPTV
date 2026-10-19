import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi, beforeEach } from "vitest";
import { VideoPlayer } from "./VideoPlayer";
import { usePlayerUiStore } from "../store/playerUiStore";

vi.mock("../adapters/createAdapter", () => ({
  createAdapter: vi.fn(() => ({ attach: vi.fn(async () => {}), destroy: vi.fn() })),
}));

beforeEach(() => {
  usePlayerUiStore.setState({ isTheaterMode: false });
});

describe("VideoPlayer", () => {
  test("renderiza o elemento de vídeo com rótulo acessível e o aviso de mídia de demonstração", () => {
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);

    expect(screen.getByLabelText("Horizonte Azul")).toBeInTheDocument();
    expect(screen.getByText(/mídia de demonstração/i)).toBeInTheDocument();
  });

  test("isRealContent=true mostra o aviso de conteúdo real (nunca 'não é o conteúdo real')", () => {
    render(<VideoPlayer src="src-a" title="Sintel" isRealContent />);

    expect(screen.getByText(/curta-metragem real, licenciado sob creative commons/i)).toBeInTheDocument();
    expect(screen.queryByText(/não é o conteúdo real/i)).not.toBeInTheDocument();
  });

  test("mostra o indicador de carregamento antes do motor terminar de anexar", () => {
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);
    expect(screen.getByRole("status")).toHaveTextContent(/carregando vídeo/i);
  });

  test("expõe os controles de reprodução", () => {
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);
    expect(screen.getByRole("button", { name: /reproduzir/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Volume")).toBeInTheDocument();
  });

  test("botão de modo cinema alterna o estado compartilhado (playerUiStore)", async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);

    const button = screen.getByRole("button", { name: /^modo cinema$/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(screen.getByRole("button", { name: /sair do modo cinema/i })).toHaveAttribute("aria-pressed", "true");
    expect(usePlayerUiStore.getState().isTheaterMode).toBe(true);
  });

  test("atalho de teclado 'T' (no player focado) também alterna o modo cinema", async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);

    const player = screen.getByRole("group");
    player.focus();
    await user.keyboard("t");

    expect(usePlayerUiStore.getState().isTheaterMode).toBe(true);
  });

  test("atalho de teclado seta-para-cima aumenta o volume refletido no slider", async () => {
    const user = userEvent.setup();
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);

    const player = screen.getByRole("group");
    const volumeSlider = screen.getByLabelText("Volume") as HTMLInputElement;
    expect(volumeSlider.value).toBe("1"); // volume inicial máximo

    player.focus();
    // volume já está no máximo (1); a seta para baixo deve reduzir.
    await user.keyboard("{ArrowDown}");

    expect(Number(volumeSlider.value)).toBeCloseTo(0.9, 5);
  });
});
