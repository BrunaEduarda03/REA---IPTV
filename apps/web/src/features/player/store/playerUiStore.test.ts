import { beforeEach, describe, expect, test } from "vitest";
import { usePlayerUiStore } from "./playerUiStore";

beforeEach(() => {
  usePlayerUiStore.setState({ isTheaterMode: false });
});

describe("usePlayerUiStore", () => {
  test("começa com theater mode desligado", () => {
    expect(usePlayerUiStore.getState().isTheaterMode).toBe(false);
  });

  test("toggleTheaterMode alterna o estado", () => {
    usePlayerUiStore.getState().toggleTheaterMode();
    expect(usePlayerUiStore.getState().isTheaterMode).toBe(true);

    usePlayerUiStore.getState().toggleTheaterMode();
    expect(usePlayerUiStore.getState().isTheaterMode).toBe(false);
  });
});
