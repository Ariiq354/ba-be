import { describe, expect, it } from "bun:test";
import Elysia from "elysia";
import { MasterMarginModel } from "#/modules/master-margin/model";

const app = new Elysia()
  .post("/", ({ body }) => body, {
    body: MasterMarginModel.createMarginSchema,
  })
  .patch("/", ({ body }) => body, {
    body: MasterMarginModel.updateMarginSchema,
  });

const requestMargin = (method: "POST" | "PATCH", body: unknown) =>
  app.handle(
    new Request("http://localhost/", {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("Master Margin request validation", () => {
  it("accepts a nominal range without cross-field validation", async () => {
    const response = await requestMargin("POST", {
      minNominal: 2_000_000,
      maxNominal: 1_000_000,
      persenMarginTahun: 15,
      jaminan: "ADA",
      biayaAkad: 100_000,
    });

    expect(response.status).toBe(200);
  });

  it("rejects negative and fractional values", async () => {
    const negativeResponse = await requestMargin("POST", {
      minNominal: -1,
      maxNominal: 1_000_000,
      persenMarginTahun: 15,
      jaminan: "ADA",
      biayaAkad: 100_000,
    });
    const fractionalResponse = await requestMargin("POST", {
      minNominal: 0,
      maxNominal: 1_000_000,
      persenMarginTahun: 12.5,
      jaminan: "TIDAK_ADA",
      biayaAkad: 100_000,
    });

    expect(negativeResponse.status).toBe(422);
    expect(fractionalResponse.status).toBe(422);
  });

  it("accepts an empty partial update like Master Akun", async () => {
    const response = await requestMargin("PATCH", {});

    expect(response.status).toBe(200);
  });
});
