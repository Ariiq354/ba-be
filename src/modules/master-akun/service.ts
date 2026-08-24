import { Effect } from "effect";
import { DatabaseError, ItemNotFoundError, ItemsNotFoundError } from "#/utils/errors";
import { DuplicateKodeAkunError } from "./errors";
import { db } from "#/database";
import { akun } from "#/database/schema/akun";
import { isUniqueViolation } from "#/utils/pgcode";
import { eq, ilike, and, or, asc, inArray } from "drizzle-orm";
import type { MasterAkunModel } from "./model";

export const MasterAkunService = {
  createAkun: Effect.fn("MasterAkunService.createAkun")(function* (
    data: MasterAkunModel["createAkunSchema"],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        await db.insert(akun).values(data);
      },
      catch: (error) => {
        if (isUniqueViolation(error)) {
          return new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun });
        }
        return new DatabaseError({ error });
      },
    });
  }),

  getPaginatedAkun: Effect.fn("MasterAkunService.getPaginatedAkun")(function* (
    query: MasterAkunModel["getAkunQuerySchema"],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const conditions = [];

        if (query.kategori && query.kategori !== "all") {
          conditions.push(eq(akun.kategori, query.kategori));
        }

        if (query.search) {
          const searchPattern = `%${query.search}%`;
          conditions.push(
            or(ilike(akun.kodeAkun, searchPattern), ilike(akun.namaAkun, searchPattern)),
          );
        }

        const qb = db
          .select({
            id: akun.id,
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            kategori: akun.kategori,
            normalBalance: akun.normalBalance,
            isActive: akun.isActive,
          })
          .from(akun)
          .where(and(...conditions))
          .orderBy(asc(akun.kodeAkun));

        const offset = (query.page - 1) * query.limit;
        const total = await db.$count(qb);
        const data = await qb.limit(query.limit).offset(offset);

        return { total, data };
      },
      catch: (error) => new DatabaseError({ error }),
    });
  }),

  updateAkun: Effect.fn("MasterAkunService.updateAkun")(function* (
    id: number,
    data: MasterAkunModel["updateAkunSchema"],
  ) {
    const returning = yield* Effect.tryPromise({
      try: async () => {
        const rows = await db.update(akun).set(data).where(eq(akun.id, id)).returning();
        return rows;
      },
      catch: (error) => {
        if (isUniqueViolation(error)) {
          return new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun! });
        }
        return new DatabaseError({ error });
      },
    });

    if (returning.length === 0) {
      return yield* new ItemNotFoundError({ id });
    }
  }),

  deleteAkun: Effect.fn("MasterAkunService.deleteAkun")(function* (ids: number[]) {
    const returning = yield* Effect.tryPromise({
      try: async () => {
        return await db.delete(akun).where(inArray(akun.id, ids)).returning();
      },
      catch: (error) => new DatabaseError({ error }),
    });

    if (returning.length === 0) {
      return yield* new ItemsNotFoundError({ ids });
    }
  }),
};
