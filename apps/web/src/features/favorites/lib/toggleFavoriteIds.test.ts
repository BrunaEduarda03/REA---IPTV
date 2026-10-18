import { describe, expect, test } from "vitest";
import { toggleFavoriteIds } from "./toggleFavoriteIds";

describe("toggleFavoriteIds", () => {
  test("adiciona um id que ainda não está na lista", () => {
    expect(toggleFavoriteIds([], "ch-01")).toEqual(["ch-01"]);
    expect(toggleFavoriteIds(["ch-02"], "ch-01")).toEqual(["ch-02", "ch-01"]);
  });

  test("remove um id que já está na lista", () => {
    expect(toggleFavoriteIds(["ch-01"], "ch-01")).toEqual([]);
    expect(toggleFavoriteIds(["ch-01", "ch-02"], "ch-01")).toEqual(["ch-02"]);
  });

  test("não muta o array recebido", () => {
    const original = ["ch-01"];
    toggleFavoriteIds(original, "ch-02");
    expect(original).toEqual(["ch-01"]);
  });

  test("alternar duas vezes seguidas volta ao estado original", () => {
    const once = toggleFavoriteIds(["ch-01"], "ch-02");
    const twice = toggleFavoriteIds(once, "ch-02");
    expect(twice).toEqual(["ch-01"]);
  });
});
