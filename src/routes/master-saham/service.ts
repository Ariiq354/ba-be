import { desc, eq } from 'drizzle-orm'

import { HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { saham as hargaSaham } from '#/libs/database/schema/master'

import type * as MasterSahamModel from './model'

import { HargaSahamNotFoundError } from './errors'

export const MasterSahamService = {
  async createHargaSaham(userId: number, data: MasterSahamModel.Post['Body']) {
    await db.insert(hargaSaham).values({
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: data.hargaJual,
      updatedBy: userId,
    })
  },

  async getLatestHargaSaham() {
    const [row] = await db
      .select({ hargaJual: hargaSaham.hargaJual })
      .from(hargaSaham)
      .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))
      .limit(1)

    if (!row) {
      return new HargaSahamNotFoundError()
    }

    return {
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: row.hargaJual,
    } satisfies MasterSahamModel.LatestGet['Response'][200]
  },

  async getPaginatedHargaSaham(query: MasterSahamModel.Get['Query']) {
    const hargaSahamQuery = db
      .select({
        id: hargaSaham.id,
        hargaJual: hargaSaham.hargaJual,
        updatedByName: user.name,
        createdAt: hargaSaham.createdAt,
      })
      .from(hargaSaham)
      .leftJoin(user, eq(user.id, hargaSaham.updatedBy))
      .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))

    const offset = (query.page - 1) * query.limit
    const total = await db.$count(hargaSaham)
    const rows = await hargaSahamQuery.limit(query.limit).offset(offset)
    const data = rows.map((row) => ({
      ...row,
      hargaNominal: HARGA_NOMINAL_SAHAM,
      updatedByName: row.updatedByName ?? '',
      createdAt: row.createdAt.toISOString(),
    }))

    return { total, data } satisfies MasterSahamModel.Get['Response'][200]
  },
}
