import { describe, expect, test } from "bun:test";
import { healthResponseSchema } from "./health";

describe("healthResponseSchema", () => {
  test("aceita o formato esperado", () => {
    const result = healthResponseSchema.safeParse({
      status: "ok",
      service: "saimotv-lab-api",
    });
    expect(result.success).toBe(true);
  });

  test("rejeita status diferente de 'ok'", () => {
    const result = healthResponseSchema.safeParse({
      status: "degraded",
      service: "saimotv-lab-api",
    });
    expect(result.success).toBe(false);
  });

  test("rejeita payload sem o campo service", () => {
    const result = healthResponseSchema.safeParse({ status: "ok" });
    expect(result.success).toBe(false);
  });
});
