import { describe, expect, test, beforeEach, vi } from "vitest";

const STORAGE_KEY = "saimotv-lab:favorites";

beforeEach(() => {
  localStorage.clear();
  vi.resetModules();
});

describe("useFavoritesStore", () => {
  test("toggleFavorite adiciona e remove um id", async () => {
    const { useFavoritesStore } = await import("./favoritesStore");

    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);

    useFavoritesStore.getState().toggleFavorite("ch-01");
    expect(useFavoritesStore.getState().favoriteIds).toEqual(["ch-01"]);

    useFavoritesStore.getState().toggleFavorite("ch-01");
    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });

  test("persiste a escolha em localStorage, sob a chave documentada", async () => {
    const { useFavoritesStore } = await import("./favoritesStore");

    useFavoritesStore.getState().toggleFavorite("ch-05");

    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).state.favoriteIds).toEqual(["ch-05"]);
  });

  test("ao recarregar (nova instância do módulo), lê o que foi persistido antes", async () => {
    const first = await import("./favoritesStore");
    first.useFavoritesStore.getState().toggleFavorite("ch-07");

    vi.resetModules();
    const second = await import("./favoritesStore");

    expect(second.useFavoritesStore.getState().favoriteIds).toEqual(["ch-07"]);
  });

  test("localStorage corrompido (JSON inválido) não quebra a store — cai para lista vazia", async () => {
    localStorage.setItem(STORAGE_KEY, "isto não é JSON {{{");

    const { useFavoritesStore } = await import("./favoritesStore");

    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });

  test("localStorage com shape inesperado (favoriteIds não é array de strings) cai para lista vazia", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { favoriteIds: "ch-01,ch-02" }, version: 0 }),
    );

    const { useFavoritesStore } = await import("./favoritesStore");

    expect(useFavoritesStore.getState().favoriteIds).toEqual([]);
  });
});
