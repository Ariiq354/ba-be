import type { MasterSahamModel } from './model'
import { desc, eq } from 'drizzle-orm'
import { db } from '#/database'
import { user } from '#/database/schema/auth'
import { saham as hargaSaham } from '#/database/schema/master'
import { HARGA_NOMINAL_SAHAM } from '#/utils/saham'
import { HargaSahamNotFoundError } from './errors'

export const MasterSahamService = {
  async createHargaSaham(
    userId: number,
    data: MasterSahamModel['createHargaSahamSchema'],
  ) {
    await db.insert(hargaSaham).values({
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: data.hargaJual,
      updatedBy: userId,
    })
  },

  async getLatestHargaSaham() {
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
      throw new HargaSahamNotFoundError()
    }

    return {
      id: row.id,
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: row.hargaJual,
      updatedByName: row.updater?.name ?? '',
      createdAt: row.createdAt.toISOString(),
    }
  },

  async getPaginatedHargaSaham(
    query: MasterSahamModel['getHargaSahamQuerySchema'],
  ) {
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
      hargaNominal: HARGA_NOMINAL_SAHAM,
      updatedByName: row.updatedByName ?? '',
      createdAt: row.createdAt.toISOString(),
    }))

    return { total, data }
  },
}
