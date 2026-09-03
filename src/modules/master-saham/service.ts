import type { MasterSahamModel } from './model'
import { desc, eq } from 'drizzle-orm'
import { Effect } from 'effect'
import { db } from '#/database'
import { user } from '#/database/schema/auth'
import { saham as hargaSaham } from '#/database/schema/master'
import { DatabaseError } from '#/utils/errors'
import { HargaSahamNotFoundError } from './errors'

export const MasterSahamService = {
  createHargaSaham: Effect.fn('MasterSahamService.createHargaSaham')(function* (
    userId: number,
    data: MasterSahamModel['createHargaSahamSchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        await db.insert(hargaSaham).values({
          hargaNominal: data.hargaNominal,
          hargaJual: data.hargaJual,
          updatedBy: userId,
        })
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getLatestHargaSaham: Effect.fn('MasterSahamService.getLatestHargaSaham')(function* () {
    const data = yield* Effect.tryPromise({
      try: async () => {
        const row = await db.query.saham.findFirst({
          orderBy: {
            createdAt: 'desc',
            id: 'desc',
          },
          with: {
            updater: {
              columns: {
                name: true,
              },
            },
          },
        })

        if (!row) {
          return undefined
        }

        return {
          id: row.id,
          hargaNominal: row.hargaNominal,
          hargaJual: row.hargaJual,
          updatedByName: row.updater?.name ?? '',
          createdAt: row.createdAt.toISOString(),
        }
      },
      catch: error => new DatabaseError({ error }),
    })

    if (!data) {
      return yield* new HargaSahamNotFoundError()
    }

    return data
  }),

  getPaginatedHargaSaham: Effect.fn('MasterSahamService.getPaginatedHargaSaham')(function* (
    query: MasterSahamModel['getHargaSahamQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const qb = db
          .select({
            id: hargaSaham.id,
            hargaNominal: hargaSaham.hargaNominal,
            hargaJual: hargaSaham.hargaJual,
            updatedByName: user.name,
            createdAt: hargaSaham.createdAt,
          })
          .from(hargaSaham)
          .leftJoin(user, eq(user.id, hargaSaham.updatedBy))
          .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))

        const offset = (query.page - 1) * query.limit
        const total = await db.$count(qb)
        const rows = await qb.limit(query.limit).offset(offset)
        const data = rows.map(row => ({
          ...row,
          updatedByName: row.updatedByName ?? '',
          createdAt: row.createdAt.toISOString(),
        }))

        return { total, data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),
}
