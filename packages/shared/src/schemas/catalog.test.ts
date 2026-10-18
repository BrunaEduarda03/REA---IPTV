import { describe, expect, test } from "bun:test";
import { categorySchema, channelSchema, channelListQuerySchema } from "./catalog";

describe("categorySchema", () => {
  test("aceita uma categoria válida", () => {
    const result = categorySchema.safeParse({
      id: "cat-01",
      name: "Documentários",
      slug: "documentarios",
      description: "Produções originais sobre natureza, ciência e história.",
    });
    expect(result.success).toBe(true);
  });

  test("rejeita categoria sem slug", () => {
    const result = categorySchema.safeParse({
      id: "cat-01",
      name: "Documentários",
      description: "...",
    });
    expect(result.success).toBe(false);
  });
});

describe("channelSchema", () => {
  const valid = {
    id: "ch-01",
    name: "Horizonte Azul",
    description: "Expedições e natureza ao redor do mundo.",
    categoryId: "cat-01",
    thumbnail: "/thumbnails/documentarios.svg",
    isFeatured: true,
    status: "available",
  };

  test("aceita um canal válido", () => {
    expect(channelSchema.safeParse(valid).success).toBe(true);
  });

  test("rejeita status fora do enum permitido", () => {
    const result = channelSchema.safeParse({ ...valid, status: "offline" });
    expect(result.success).toBe(false);
  });

  test("rejeita isFeatured que não seja booleano", () => {
    const result = channelSchema.safeParse({ ...valid, isFeatured: "sim" });
    expect(result.success).toBe(false);
  });
});

describe("channelListQuerySchema", () => {
  test("aplica os padrões quando nada é informado", () => {
    const result = channelListQuerySchema.parse({});
    expect(result).toEqual({ page: 1, pageSize: 12, sort: "featured_first" });
  });

  test("converte page e pageSize vindos como string (query string real)", () => {
    const result = channelListQuerySchema.parse({ page: "2", pageSize: "5" });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(5);
  });

  test("rejeita pageSize acima do limite máximo", () => {
    const result = channelListQuerySchema.safeParse({ pageSize: "999" });
    expect(result.success).toBe(false);
  });

  test("rejeita busca vazia (string em branco)", () => {
    const result = channelListQuerySchema.safeParse({ search: "   " });
    expect(result.success).toBe(false);
  });
});
