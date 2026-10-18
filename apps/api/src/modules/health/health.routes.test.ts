import { describe, expect, test } from "bun:test";
import { createApp } from "../../app";
import { healthResponseSchema } from "@saimotv/shared";

describe("GET /api/health", () => {
  test("responde 200 com JSON válido contra o schema compartilhado", async () => {
    const app = createApp();
    const res = await app.request("/api/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");

    const body = await res.json();
    const parsed = healthResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
    expect(body).toEqual({ status: "ok", service: "saimotv-lab-api" });
  });
});
