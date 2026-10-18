import { describe, expect, test } from "bun:test";
import { createApp } from "../../app";

const app = createApp();

/**
 * `res.json()` é tipado como `unknown` pelo DOM lib (o runtime não sabe o
 * shape da resposta) — único lugar deste pacote onde aceitamos `any` de
 * propósito: é um helper de teste, nunca código de produção, e tipar cada
 * resposta individualmente aqui não traria segurança real (os testes já
 * fazem as asserções que validam o shape na prática).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function get(path: string): Promise<{ status: number; body: any }> {
  const res = await app.request(path);
  const body = await res.json();
  return { status: res.status, body };
}

describe("GET /api/categories", () => {
  test("lista todas as categorias", async () => {
    const { status, body } = await get("/api/categories");
    expect(status).toBe(200);
    expect(body.items).toHaveLength(5);
    expect(body.items[0]).toHaveProperty("slug");
  });
});

describe("GET /api/channels", () => {
  test("lista a primeira página com o tamanho padrão", async () => {
    const { status, body } = await get("/api/channels");
    expect(status).toBe(200);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(12);
    expect(body.total).toBe(20);
    expect(body.totalPages).toBe(2);
    expect(body.items).toHaveLength(12);
  });

  test("pagina determinísticamente: página 2 não repete itens da página 1", async () => {
    const page1 = await get("/api/channels?page=1&pageSize=12");
    const page2 = await get("/api/channels?page=2&pageSize=12");

    const idsPage1 = page1.body.items.map((c: { id: string }) => c.id);
    const idsPage2 = page2.body.items.map((c: { id: string }) => c.id);

    expect(page2.body.items).toHaveLength(8);
    expect(idsPage1.some((id: string) => idsPage2.includes(id))).toBe(false);
  });

  test("filtra por categoria", async () => {
    const { status, body } = await get("/api/channels?categoryId=cat-02");
    expect(status).toBe(200);
    expect(body.total).toBe(4);
    expect(body.items.every((c: { categoryId: string }) => c.categoryId === "cat-02")).toBe(true);
  });

  test("busca por texto, ignorando acentuação e caixa", async () => {
    const { status, body } = await get("/api/channels?search=HORIZONTE");
    expect(status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.items[0].id).toBe("ch-01");
  });

  test("busca também encontra por trecho da descrição", async () => {
    const { body } = await get("/api/channels?search=ambiente");
    expect(body.total).toBeGreaterThanOrEqual(1);
  });

  test("busca sem resultado devolve lista vazia, não erro", async () => {
    const { status, body } = await get("/api/channels?search=inexistente-xyz");
    expect(status).toBe(200);
    expect(body.items).toHaveLength(0);
    expect(body.total).toBe(0);
  });

  test("ordena por nome ascendente de forma estável", async () => {
    const { body } = await get("/api/channels?sort=name_asc&pageSize=50");
    const names = body.items.map((c: { name: string }) => c.name);
    const sorted = [...names].sort((a, b) => a.localeCompare(b, "pt-BR"));
    expect(names).toEqual(sorted);
  });

  test("featured_first (padrão) traz os destacados primeiro", async () => {
    const { body } = await get("/api/channels?pageSize=50");
    const firstNonFeaturedIndex = body.items.findIndex((c: { isFeatured: boolean }) => !c.isFeatured);
    const lastFeaturedIndex = body.items.map((c: { isFeatured: boolean }) => c.isFeatured).lastIndexOf(true);
    expect(lastFeaturedIndex).toBeLessThan(firstNonFeaturedIndex);
  });

  test("rejeita pageSize inválido com 400 e contrato de erro consistente", async () => {
    const { status, body } = await get("/api/channels?pageSize=9999");
    expect(status).toBe(400);
    expect(body.error).toBe("Parâmetros inválidos");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  test("rejeita busca em branco com 400", async () => {
    const { status } = await get("/api/channels?search=%20%20");
    expect(status).toBe(400);
  });
});

describe("GET /api/channels/:id", () => {
  test("devolve os detalhes de um conteúdo existente", async () => {
    const { status, body } = await get("/api/channels/ch-05");
    expect(status).toBe(200);
    expect(body.name).toBe("Pulso Esportivo");
  });

  test("devolve 404 com contrato de erro para id inexistente", async () => {
    const { status, body } = await get("/api/channels/nao-existe");
    expect(status).toBe(404);
    expect(body.error).toContain("não encontrado");
  });
});
