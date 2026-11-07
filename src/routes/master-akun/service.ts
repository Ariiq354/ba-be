import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm'

import { db } from '#/libs/database'
import { akunKeuangan } from '#/libs/database/schema/akun'
import { templateTransaksi } from '#/libs/database/schema/master'
import { ItemNotFoundError, ItemsNotFoundError } from '#/libs/errors'
import { isUniqueViolation } from '#/libs/pgcode'

import type * as MasterAkunModel from './model'

import { AkunUsedByTemplateError, DuplicateKodeAkunError } from './errors'

export const MasterAkunService = {
  async createAkun(data: MasterAkunModel.Post['Body']) {
    try {
      await db.insert(akunKeuangan).values(data)
    } catch (error) {
      if (isUniqueViolation(error)) {
        return new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun })
      }
      throw error
    }
  },

  async getPaginatedAkun(query: MasterAkunModel.Get['Query']) {
    const conditions = []

    if (query.kategori && query.kategori !== 'all') {
      conditions.push(eq(akunKeuangan.kategori, query.kategori))
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`
      conditions.push(or(ilike(akunKeuangan.kodeAkun, searchPattern), ilike(akunKeuangan.namaAkun, searchPattern)))
    }

    const akunQuery = db
      .select({
        id: akunKeuangan.id,
        kodeAkun: akunKeuangan.kodeAkun,
        namaAkun: akunKeuangan.namaAkun,
        kategori: akunKeuangan.kategori,
        normalBalance: akunKeuangan.normalBalance,
        isActive: akunKeuangan.isActive,
      })
      .from(akunKeuangan)
      .where(and(...conditions))
      .orderBy(asc(akunKeuangan.kodeAkun))

    const offset = (query.page - 1) * query.limit
    const total = await db.$count(akunQuery)
    const data = await akunQuery.limit(query.limit).offset(offset)

    return { total, data } satisfies MasterAkunModel.Get['Response'][200]
  },

  async updateAkun(id: MasterAkunModel.ByIdPatch['Params']['id'], data: MasterAkunModel.ByIdPatch['Body']) {
    try {
      const updatedRows = await db.update(akunKeuangan).set(data).where(eq(akunKeuangan.id, id)).returning()

      if (updatedRows.length === 0) {
        return new ItemNotFoundError({
          id,
          message: `Akun dengan ID '${id}' tidak ditemukan`,
        })
      }
    } catch (error) {
      if (data.kodeAkun !== undefined && isUniqueViolation(error)) {
        return new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun })
      }
      throw error
    }
  },

  async deleteAkun(ids: MasterAkunModel.Delete['Body']['ids']) {
    return db.transaction(async (tx) => {
      await tx
        .select({ id: akunKeuangan.id })
        .from(akunKeuangan)
        .where(inArray(akunKeuangan.id, ids))
        .orderBy(asc(akunKeuangan.id))
        .for('update')

      const templates = await tx
        .select({ akunDebitId: templateTransaksi.akunDebitId, akunKreditId: templateTransaksi.akunKreditId })
        .from(templateTransaksi)
        .where(or(inArray(templateTransaksi.akunDebitId, ids), inArray(templateTransaksi.akunKreditId, ids)))

      if (templates.length > 0) {
        const referencedIds = new Set(templates.flatMap((template) => [template.akunDebitId, template.akunKreditId]))
        throw new AkunUsedByTemplateError({ ids: [...new Set(ids)].filter((id) => referencedIds.has(id)) })
      }

      const deletedRows = await tx.delete(akunKeuangan).where(inArray(akunKeuangan.id, ids)).returning()
      if (deletedRows.length === 0) {
        return new ItemsNotFoundError({
          ids,
          message: `Akun dengan ID '${ids.join(', ')}' tidak ditemukan`,
        })
      }
    })
  },
}
