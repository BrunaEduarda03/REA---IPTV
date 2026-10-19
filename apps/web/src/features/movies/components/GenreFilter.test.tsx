import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { GenreFilter } from "./GenreFilter";

describe("GenreFilter", () => {
  test("'Todos' começa marcado quando nenhum gênero está ativo", () => {
    render(<GenreFilter genres={["Animação", "Fantasia"]} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true");
  });

  test("clicar num gênero chama onSelect com o nome dele", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<GenreFilter genres={["Animação", "Fantasia"]} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Fantasia" }));

    expect(onSelect).toHaveBeenCalledWith("Fantasia");
  });

  test("clicar em 'Todos' chama onSelect com undefined (remove o filtro)", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<GenreFilter genres={["Animação"]} activeGenre="Animação" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Todos" }));

    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
