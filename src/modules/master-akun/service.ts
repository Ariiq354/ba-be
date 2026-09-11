import type { MasterAkunModel } from './model'
import { and, asc, eq, ilike, inArray, ne, or } from 'drizzle-orm'
import { db } from '#/database'
import { akun } from '#/database/schema/akun'
import { ItemNotFoundError, ItemsNotFoundError } from '#/utils/errors'
import { DuplicateKodeAkunError } from './errors'

export const MasterAkunService = {
  async createAkun(
    data: MasterAkunModel['createAkunSchema'],
  ) {
    const [existing] = await db
      .select({ id: akun.id })
      .from(akun)
      .where(eq(akun.kodeAkun, data.kodeAkun))
      .limit(1)

    if (existing) {
      throw new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun })
    }

    await db.insert(akun).values(data)
  },

  async getPaginatedAkun(
    query: MasterAkunModel['getAkunQuerySchema'],
  ) {
    const conditions = []

    if (query.kategori && query.kategori !== 'all') {
      conditions.push(eq(akun.kategori, query.kategori))
    }

    if (query.search) {
      const searchPattern = `%${query.search}%`
      conditions.push(
        or(ilike(akun.kodeAkun, searchPattern), ilike(akun.namaAkun, searchPattern)),
      )
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
      .orderBy(asc(akun.kodeAkun))

    const offset = (query.page - 1) * query.limit
    const total = await db.$count(qb)
    const data = await qb.limit(query.limit).offset(offset)

    return { total, data }
  },

  async updateAkun(
    id: number,
    data: MasterAkunModel['updateAkunSchema'],
  ) {
    if (data.kodeAkun) {
      const [existing] = await db
        .select({ id: akun.id })
        .from(akun)
        .where(and(eq(akun.kodeAkun, data.kodeAkun), ne(akun.id, id)))
        .limit(1)

      if (existing) {
        throw new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun })
      }
    }

    const returning = await db.update(akun).set(data).where(eq(akun.id, id)).returning()

    if (returning.length === 0) {
      throw new ItemNotFoundError({
        id,
        message: `Akun dengan ID '${id}' tidak ditemukan`,
      })
    }
  },

  async deleteAkun(ids: number[]) {
    const returning = await db.delete(akun).where(inArray(akun.id, ids)).returning()

    if (returning.length === 0) {
      throw new ItemsNotFoundError({
        ids,
        message: `Akun dengan ID '${ids.join(', ')}' tidak ditemukan`,
      })
    }
  },
}
