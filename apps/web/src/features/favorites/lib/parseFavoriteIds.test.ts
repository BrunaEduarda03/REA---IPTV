import { describe, expect, test } from "vitest";
import { parseFavoriteIds } from "./parseFavoriteIds";

describe("parseFavoriteIds", () => {
  test("aceita um array de strings", () => {
    expect(parseFavoriteIds(["ch-01", "ch-02"])).toEqual(["ch-01", "ch-02"]);
  });

  test("aceita um array vazio", () => {
    expect(parseFavoriteIds([])).toEqual([]);
  });

  test.each([
    ["string solta", "ch-01"],
    ["número", 42],
    ["objeto", { ch: "01" }],
    ["null", null],
    ["undefined", undefined],
    ["array de números", [1, 2, 3]],
    ["array misto", ["ch-01", 2]],
  ])("cai para lista vazia quando o dado está corrompido: %s", (_label, corrupted) => {
    expect(parseFavoriteIds(corrupted)).toEqual([]);
  });
});
