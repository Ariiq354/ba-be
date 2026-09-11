import type { MasterMarginModel } from './model'
import { desc, eq, inArray } from 'drizzle-orm'
import { db } from '#/database'
import { margin } from '#/database/schema/master'
import { ItemNotFoundError, ItemsNotFoundError } from '#/utils/errors'

export const MasterMarginService = {
  async createMargin(
    data: MasterMarginModel['createMarginSchema'],
  ) {
    await db.insert(margin).values(data)
  },

  async getPaginatedMargin(
    query: MasterMarginModel['getMarginQuerySchema'],
  ) {
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

  async updateMargin(
    id: number,
    data: MasterMarginModel['updateMarginSchema'],
  ) {
    const returning = await db.update(margin).set(data).where(eq(margin.id, id)).returning()

    if (returning.length === 0) {
      throw new ItemNotFoundError({
        id,
        message: `Margin dengan ID '${id}' tidak ditemukan`,
      })
    }
  },

  async deleteMargin(ids: number[]) {
    const returning = await db.delete(margin).where(inArray(margin.id, ids)).returning()

    if (returning.length === 0) {
      throw new ItemsNotFoundError({
        ids,
        message: `Margin dengan ID '${ids.join(', ')}' tidak ditemukan`,
      })
    }
  },
}
