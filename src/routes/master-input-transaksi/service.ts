import { and, asc, eq, ilike, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { db } from '#/libs/database'
import { akunKeuangan } from '#/libs/database/schema/akun'
import { templateTransaksi } from '#/libs/database/schema/master'
import { ItemNotFoundError, ItemsNotFoundError } from '#/libs/errors'

import type * as MasterInputTransaksiModel from './model'

import { InvalidNamaTemplateError } from './errors'
import { validateTemplateAkun } from './utils'

export const MasterInputTransaksiService = {
  async getTemplateOptions() {
    const data = await db
      .select({
        id: templateTransaksi.id,
        nama: templateTransaksi.nama,
      })
      .from(templateTransaksi)
      .where(eq(templateTransaksi.isActive, true))
      .orderBy(asc(templateTransaksi.nama), asc(templateTransaksi.id))

    return { data } satisfies MasterInputTransaksiModel.OptionsGet['Response'][200]
  },

  async getPaginatedTemplate(query: MasterInputTransaksiModel.Get['Query']) {
    const conditions = []
    if (query.search) {
      conditions.push(ilike(templateTransaksi.nama, `%${query.search}%`))
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(templateTransaksi.isActive, query.isActive))
    }

    const condition = and(...conditions)
    const akunDebit = alias(akunKeuangan, 'akun_debit')
    const akunKredit = alias(akunKeuangan, 'akun_kredit')
    const [total, data] = await Promise.all([
      db.$count(templateTransaksi, condition),
      db
        .select({
          id: templateTransaksi.id,
          nama: templateTransaksi.nama,
          akunDebitId: templateTransaksi.akunDebitId,
          kodeAkunDebit: akunDebit.kodeAkun,
          namaAkunDebit: akunDebit.namaAkun,
          akunKreditId: templateTransaksi.akunKreditId,
          kodeAkunKredit: akunKredit.kodeAkun,
          namaAkunKredit: akunKredit.namaAkun,
          isActive: templateTransaksi.isActive,
        })
        .from(templateTransaksi)
        .innerJoin(akunDebit, eq(akunDebit.id, templateTransaksi.akunDebitId))
        .innerJoin(akunKredit, eq(akunKredit.id, templateTransaksi.akunKreditId))
        .where(condition)
        .orderBy(asc(templateTransaksi.nama), asc(templateTransaksi.id))
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
      await tx.insert(templateTransaksi).values({ ...data, nama })
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
      const [existing] = await tx.select().from(templateTransaksi).where(eq(templateTransaksi.id, id)).for('update')

      if (!existing) {
        throw new ItemNotFoundError({ id, message: `Template transaksi dengan ID '${id}' tidak ditemukan` })
      }

      const akunDebitId = data.akunDebitId ?? existing.akunDebitId
      const akunKreditId = data.akunKreditId ?? existing.akunKreditId
      if (data.akunDebitId !== undefined || data.akunKreditId !== undefined || (data.isActive ?? existing.isActive)) {
        await validateTemplateAkun(tx, akunDebitId, akunKreditId)
      }

      await tx
        .update(templateTransaksi)
        .set({ ...data, nama })
        .where(eq(templateTransaksi.id, id))
    })
  },

  async deleteTemplate(ids: MasterInputTransaksiModel.Delete['Body']['ids']) {
    const uniqueIds = [...new Set(ids)]
    await db.transaction(async (tx) => {
      const rows = await tx
        .select({ id: templateTransaksi.id })
        .from(templateTransaksi)
        .where(inArray(templateTransaksi.id, uniqueIds))
        .orderBy(asc(templateTransaksi.id))
        .for('update')

      const existingIds = new Set(rows.map((row) => row.id))
      const missingIds = uniqueIds.filter((id) => !existingIds.has(id))
      if (missingIds.length > 0) {
        throw new ItemsNotFoundError({
          ids: missingIds,
          message: `Template transaksi dengan ID '${missingIds.join(', ')}' tidak ditemukan`,
        })
      }

      await tx.delete(templateTransaksi).where(inArray(templateTransaksi.id, uniqueIds))
    })
  },
}
