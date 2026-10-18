import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { VideoPlayer } from "./VideoPlayer";

vi.mock("../adapters/createAdapter", () => ({
  createAdapter: vi.fn(() => ({ attach: vi.fn(async () => {}), destroy: vi.fn() })),
}));

describe("VideoPlayer", () => {
  test("renderiza o elemento de vídeo com rótulo acessível e o aviso de mídia de demonstração", () => {
    render(<VideoPlayer src="src-a" title="Horizonte Azul" />);

    expect(screen.getByLabelText("Horizonte Azul")).toBeInTheDocument();
    expect(screen.getByText(/mídia de demonstração/i)).toBeInTheDocument();
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
});
