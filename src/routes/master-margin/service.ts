import { desc, eq, inArray } from 'drizzle-orm'

import { db } from '#/libs/database'
import { margin } from '#/libs/database/schema/master'
import { ItemNotFoundError, ItemsNotFoundError } from '#/libs/errors'

import type * as MasterMarginModel from './model'

export const MasterMarginService = {
  async createMargin(data: MasterMarginModel.Post['Body']) {
    await db.insert(margin).values(data)
  },

  async getPaginatedMargin(query: MasterMarginModel.Get['Query']) {
    const marginQuery = db
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
    const total = await db.$count(marginQuery)
    const rows = await marginQuery.limit(query.limit).offset(offset)
    const data = rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data } satisfies MasterMarginModel.Get['Response'][200]
  },

  async updateMargin(id: MasterMarginModel.ByIdPatch['Params']['id'], data: MasterMarginModel.ByIdPatch['Body']) {
    const updatedRows = await db.update(margin).set(data).where(eq(margin.id, id)).returning()

    if (updatedRows.length === 0) {
      return new ItemNotFoundError({
        id,
        message: `Margin dengan ID '${id}' tidak ditemukan`,
      })
    }
  },

  async deleteMargin(ids: MasterMarginModel.Delete['Body']['ids']) {
    const deletedRows = await db.delete(margin).where(inArray(margin.id, ids)).returning()

    if (deletedRows.length === 0) {
      return new ItemsNotFoundError({
        ids,
        message: `Margin dengan ID '${ids.join(', ')}' tidak ditemukan`,
      })
    }
  },
}
