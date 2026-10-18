import { describe, expect, test } from "vitest";
import { mapKeyToAction } from "./mapKeyToAction";

describe("mapKeyToAction", () => {
  test("espaço mapeia para toggle-play", () => {
    expect(mapKeyToAction(" ")).toBe("toggle-play");
  });

  test("m e M mapeiam para toggle-mute", () => {
    expect(mapKeyToAction("m")).toBe("toggle-mute");
    expect(mapKeyToAction("M")).toBe("toggle-mute");
  });

  test("ArrowUp e ArrowDown mapeiam para volume-up e volume-down", () => {
    expect(mapKeyToAction("ArrowUp")).toBe("volume-up");
    expect(mapKeyToAction("ArrowDown")).toBe("volume-down");
  });

  test("t e T mapeiam para toggle-theater", () => {
    expect(mapKeyToAction("t")).toBe("toggle-theater");
    expect(mapKeyToAction("T")).toBe("toggle-theater");
  });

  test("qualquer outra tecla não mapeia para nenhuma ação", () => {
    expect(mapKeyToAction("a")).toBeNull();
    expect(mapKeyToAction("Enter")).toBeNull();
    expect(mapKeyToAction("Tab")).toBeNull();
  });
});
