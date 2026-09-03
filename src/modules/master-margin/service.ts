import type { MasterMarginModel } from './model'
import { desc, eq, inArray } from 'drizzle-orm'
import { Effect } from 'effect'
import { db } from '#/database'
import { margin } from '#/database/schema/master'
import { DatabaseError, ItemNotFoundError, ItemsNotFoundError } from '#/utils/errors'

export const MasterMarginService = {
  createMargin: Effect.fn('MasterMarginService.createMargin')(function* (
    data: MasterMarginModel['createMarginSchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        await db.insert(margin).values(data)
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getPaginatedMargin: Effect.fn('MasterMarginService.getPaginatedMargin')(function* (
    query: MasterMarginModel['getMarginQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const qb = db
          .select({
            id: margin.id,
            minNominal: margin.minNominal,
            maxNominal: margin.maxNominal,
            persenMarginTahun: margin.persenMarginTahun,
            jaminan: margin.jaminan,
            biayaAkad: margin.biayaAkad,
            createdAt: margin.createdAt,
            updatedAt: margin.updatedAt,
          })
          .from(margin)
          .orderBy(desc(margin.createdAt), desc(margin.id))

        const offset = (query.page - 1) * query.limit
        const total = await db.$count(qb)
        const rows = await qb.limit(query.limit).offset(offset)
        const data = rows.map(row => ({
          ...row,
          createdAt: row.createdAt.toISOString(),
          updatedAt: row.updatedAt.toISOString(),
        }))

        return { total, data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  updateMargin: Effect.fn('MasterMarginService.updateMargin')(function* (
    id: number,
    data: MasterMarginModel['updateMarginSchema'],
  ) {
    const returning = yield* Effect.tryPromise({
      try: async () => {
        return await db.update(margin).set(data).where(eq(margin.id, id)).returning()
      },
      catch: error => new DatabaseError({ error }),
    })

    if (returning.length === 0) {
      return yield* new ItemNotFoundError({ id })
    }
  }),

  deleteMargin: Effect.fn('MasterMarginService.deleteMargin')(function* (ids: number[]) {
    const returning = yield* Effect.tryPromise({
      try: async () => {
        return await db.delete(margin).where(inArray(margin.id, ids)).returning()
      },
      catch: error => new DatabaseError({ error }),
    })

    if (returning.length === 0) {
      return yield* new ItemsNotFoundError({ ids })
    }
  }),
}
