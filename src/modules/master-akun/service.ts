import type { MasterAkunModel } from './model'
import { and, asc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { db } from '#/database'
import { akun } from '#/database/schema/akun'
import { ItemNotFoundError, ItemsNotFoundError } from '#/utils/errors'
import { isUniqueViolation } from '#/utils/pgcode'
import { DuplicateKodeAkunError } from './errors'

export const MasterAkunService = {
  async createAkun(
    data: MasterAkunModel['createAkunSchema'],
  ) {
    try {
      await db.insert(akun).values(data)
    }
    catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateKodeAkunError({ kodeAkun: data.kodeAkun })
      }
      throw error
    }
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
    if (!data.kodeAkun) {
      const returning = await db.update(akun).set(data).where(eq(akun.id, id)).returning()

      if (returning.length === 0) {
        throw new ItemNotFoundError({
          id,
          message: `Akun dengan ID '${id}' tidak ditemukan`,
        })
      }

      return
    }

    const kodeAkun = data.kodeAkun

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        select pg_advisory_xact_lock(
          hashtextextended(${`master-akun:${kodeAkun}`}, 0)
        )
      `)

      const [existing] = await tx
        .select({ id: akun.id })
        .from(akun)
        .where(and(eq(akun.kodeAkun, kodeAkun), ne(akun.id, id)))
        .limit(1)

      if (existing) {
        throw new DuplicateKodeAkunError({ kodeAkun })
      }

      const returning = await tx.update(akun).set(data).where(eq(akun.id, id)).returning()

      if (returning.length === 0) {
        throw new ItemNotFoundError({
          id,
          message: `Akun dengan ID '${id}' tidak ditemukan`,
        })
      }
    })
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
