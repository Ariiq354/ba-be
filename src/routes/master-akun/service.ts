import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm'

import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { ItemNotFoundError, ItemsNotFoundError } from '#/libs/errors'
import { isUniqueViolation } from '#/libs/pgcode'

import type * as MasterAkunModel from './model'

import { DuplicateKodeAkunError } from './errors'

export const MasterAkunService = {
  async createAkun(data: MasterAkunModel.Post['Body']) {
    try {
      await db.insert(akun).values(data)
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
      conditions.push(eq(akun.kategori, query.kategori))
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`
      conditions.push(or(ilike(akun.kodeAkun, searchPattern), ilike(akun.namaAkun, searchPattern)))
    }

    const akunQuery = db
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
      .orderBy(asc(akun.kodeAkun))

    const offset = (query.page - 1) * query.limit
    const total = await db.$count(akunQuery)
    const data = await akunQuery.limit(query.limit).offset(offset)

    return { total, data } satisfies MasterAkunModel.Get['Response'][200]
  },

  async updateAkun(id: MasterAkunModel.ByIdPatch['Params']['id'], data: MasterAkunModel.ByIdPatch['Body']) {
    try {
      const updatedRows = await db.update(akun).set(data).where(eq(akun.id, id)).returning()

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
    const deletedRows = await db.delete(akun).where(inArray(akun.id, ids)).returning()

    if (deletedRows.length === 0) {
      return new ItemsNotFoundError({
        ids,
        message: `Akun dengan ID '${ids.join(', ')}' tidak ditemukan`,
      })
    }
  },
}
