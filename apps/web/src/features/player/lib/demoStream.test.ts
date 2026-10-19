import { describe, expect, test } from "vitest";
import { getDemoStreamUrl } from "./demoStream";

describe("getDemoStreamUrl", () => {
  test("categorias diferentes recebem streams diferentes", () => {
    const documentarios = getDemoStreamUrl("cat-01");
    const esportes = getDemoStreamUrl("cat-02");
    const ficcao = getDemoStreamUrl("cat-05");

    expect(documentarios).not.toBe(esportes);
    expect(esportes).not.toBe(ficcao);
    expect(documentarios).not.toBe(ficcao);
  });

  test("a mesma categoria sempre devolve a mesma stream (determinístico)", () => {
    expect(getDemoStreamUrl("cat-01")).toBe(getDemoStreamUrl("cat-01"));
  });

  test("categoria desconhecida cai para a stream padrão, em vez de devolver undefined", () => {
    expect(getDemoStreamUrl("categoria-que-nao-existe")).toBe(getDemoStreamUrl("cat-01"));
  });
});
