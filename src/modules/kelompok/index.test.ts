import { expect, mock, test } from "bun:test";

const kelompokOptions = [
  {
    id: 1,
    kodeKelompok: "KLM-A",
    namaKelompok: "Kelompok A",
  },
  {
    id: 2,
    kodeKelompok: "KLM-B",
    namaKelompok: "Kelompok B",
  },
];

test("returns kelompok options without authentication", async () => {
  await mock.module("#/database", () => ({
    db: {
      select: () => ({
        from: () => ({
          orderBy: async () => kelompokOptions,
        }),
      }),
    },
  }));

  const { KelompokModules } = await import("./index");

  const response = await KelompokModules.handle(new Request("http://localhost/kelompok/options"));

  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({
    data: [
      {
        id: 1,
        kodeKelompok: "KLM-A",
        namaKelompok: "Kelompok A",
      },
      {
        id: 2,
        kodeKelompok: "KLM-B",
        namaKelompok: "Kelompok B",
      },
    ],
  });
});
