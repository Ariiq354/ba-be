import { and, asc, eq, ilike, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { masterInputTransaksi } from '#/libs/database/schema/master'
import { ItemNotFoundError, ItemsNotFoundError } from '#/libs/errors'

import type * as MasterInputTransaksiModel from './model'

import { InvalidNamaTemplateError } from './errors'
import { validateTemplateAkun } from './utils'

export const MasterInputTransaksiService = {
  async getPaginatedTemplate(query: MasterInputTransaksiModel.Get['Query']) {
    const conditions = []
    if (query.search) {
      conditions.push(ilike(masterInputTransaksi.nama, `%${query.search}%`))
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(masterInputTransaksi.isActive, query.isActive))
    }

    const condition = and(...conditions)
    const akunDebit = alias(akun, 'akun_debit')
    const akunKredit = alias(akun, 'akun_kredit')
    const [total, data] = await Promise.all([
      db.$count(masterInputTransaksi, condition),
      db
        .select({
          id: masterInputTransaksi.id,
          nama: masterInputTransaksi.nama,
          akunDebitId: masterInputTransaksi.akunDebitId,
          kodeAkunDebit: akunDebit.kodeAkun,
          namaAkunDebit: akunDebit.namaAkun,
          akunKreditId: masterInputTransaksi.akunKreditId,
          kodeAkunKredit: akunKredit.kodeAkun,
          namaAkunKredit: akunKredit.namaAkun,
          isActive: masterInputTransaksi.isActive,
        })
        .from(masterInputTransaksi)
        .innerJoin(akunDebit, eq(akunDebit.id, masterInputTransaksi.akunDebitId))
        .innerJoin(akunKredit, eq(akunKredit.id, masterInputTransaksi.akunKreditId))
        .where(condition)
        .orderBy(asc(masterInputTransaksi.nama), asc(masterInputTransaksi.id))
        .limit(query.limit)
        .offset((query.page - 1) * query.limit),
    ])

    return { total, data } satisfies MasterInputTransaksiModel.Get['Response'][200]
  },

  async createTemplate(data: MasterInputTransaksiModel.Post['Body']) {
    const nama = data.nama.trim()
    if (!nama) {
      throw new InvalidNamaTemplateError()
    }

    await db.transaction(async (tx) => {
      await validateTemplateAkun(tx, data.akunDebitId, data.akunKreditId)
      await tx.insert(masterInputTransaksi).values({ ...data, nama })
    })
  },

  async updateTemplate(
    id: MasterInputTransaksiModel.ByIdPatch['Params']['id'],
    data: MasterInputTransaksiModel.ByIdPatch['Body'],
  ) {
    const nama = data.nama?.trim()
    if (nama === '') {
      throw new InvalidNamaTemplateError()
    }

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(masterInputTransaksi)
        .where(eq(masterInputTransaksi.id, id))
        .for('update')

      if (!existing) {
        throw new ItemNotFoundError({ id, message: `Template transaksi dengan ID '${id}' tidak ditemukan` })
      }

      const akunDebitId = data.akunDebitId ?? existing.akunDebitId
      const akunKreditId = data.akunKreditId ?? existing.akunKreditId
      if (data.akunDebitId !== undefined || data.akunKreditId !== undefined || (data.isActive ?? existing.isActive)) {
        await validateTemplateAkun(tx, akunDebitId, akunKreditId)
      }

      await tx
        .update(masterInputTransaksi)
        .set({ ...data, nama })
        .where(eq(masterInputTransaksi.id, id))
    })
  },

  async deleteTemplate(ids: MasterInputTransaksiModel.Delete['Body']['ids']) {
    const uniqueIds = [...new Set(ids)]
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: masterInputTransaksi.id })
        .from(masterInputTransaksi)
        .where(inArray(masterInputTransaksi.id, uniqueIds))
        .orderBy(asc(masterInputTransaksi.id))
        .for('update')

      const existingIds = new Set(rows.map((row) => row.id))
      const missingIds = uniqueIds.filter((id) => !existingIds.has(id))
      if (missingIds.length > 0) {
        throw new ItemsNotFoundError({
          ids: missingIds,
          message: `Template transaksi dengan ID '${missingIds.join(', ')}' tidak ditemukan`,
        })
      }

      await tx.delete(masterInputTransaksi).where(inArray(masterInputTransaksi.id, uniqueIds))
    })
  },
}
