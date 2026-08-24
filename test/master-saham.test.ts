import { describe, expect, it } from "bun:test";
import Elysia from "elysia";
import { MasterSahamModel } from "#/modules/master-saham/model";

const app = new Elysia().post("/", ({ body }) => body, {
  body: MasterSahamModel.createHargaSahamSchema,
});

const createHargaSaham = (body: unknown) =>
  app.handle(
    new Request("http://localhost/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("Master Saham request validation", () => {
  it("accepts a sale price below the nominal price", async () => {
    const response = await createHargaSaham({ hargaNominal: 100_000, hargaJual: 90_000 });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ hargaNominal: 100_000, hargaJual: 90_000 });
  });

  it("rejects negative and fractional prices", async () => {
    const negativeResponse = await createHargaSaham({ hargaNominal: -1, hargaJual: 90_000 });
    const fractionalResponse = await createHargaSaham({
      hargaNominal: 100_000.5,
      hargaJual: 90_000,
    });

    expect(negativeResponse.status).toBe(422);
    expect(fractionalResponse.status).toBe(422);
  });
});
