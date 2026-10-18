import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, beforeEach } from "vitest";
import { MemoryRouter, Link, useLocation } from "react-router-dom";
import { FavoriteButton } from "./FavoriteButton";
import { useFavoritesStore } from "../store/favoritesStore";

beforeEach(() => {
  localStorage.clear();
  useFavoritesStore.setState({ favoriteIds: [] });
});

describe("FavoriteButton", () => {
  test("começa não marcado e alterna para marcado ao clicar", async () => {
    const user = userEvent.setup();
    render(<FavoriteButton channelId="ch-01" channelName="Horizonte Azul" />);

    const button = screen.getByRole("button", { name: /favoritar horizonte azul/i });
    expect(button).toHaveAttribute("aria-pressed", "false");

    await user.click(button);

    expect(screen.getByRole("button", { name: /remover horizonte azul dos favoritos/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("clicar atualiza a store compartilhada (useFavoritesStore)", async () => {
    const user = userEvent.setup();
    render(<FavoriteButton channelId="ch-01" channelName="Horizonte Azul" />);

    await user.click(screen.getByRole("button"));

    expect(useFavoritesStore.getState().favoriteIds).toContain("ch-01");
  });

  test("clicar dentro de um Link não navega (stopPropagation/preventDefault)", async () => {
    function CurrentPath() {
      return <span data-testid="current-path">{useLocation().pathname}</span>;
    }

    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={["/catalogo"]}>
        <CurrentPath />
        <Link to="/catalogo/ch-01">
          <FavoriteButton channelId="ch-01" channelName="Horizonte Azul" />
        </Link>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("current-path")).toHaveTextContent("/catalogo");

    await user.click(screen.getByRole("button"));

    // A prova real de que a navegação foi bloqueada: a rota continua
    // "/catalogo" (não virou "/catalogo/ch-01"), mesmo o botão estando
    // dentro do <Link> que levaria para lá.
    expect(screen.getByTestId("current-path")).toHaveTextContent("/catalogo");
    expect(useFavoritesStore.getState().favoriteIds).toContain("ch-01");
  });
});
