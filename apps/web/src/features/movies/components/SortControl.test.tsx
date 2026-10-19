import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import { SortControl } from "./SortControl";

describe("SortControl", () => {
  test("marca a opção ativa", () => {
    render(<SortControl sort="title_asc" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "A-Z" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Mais recentes" })).toHaveAttribute("aria-pressed", "false");
  });

  test("clicar numa opção chama onChange com o valor certo", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SortControl sort="recent" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "A-Z" }));

    expect(onChange).toHaveBeenCalledWith("title_asc");
  });
});
