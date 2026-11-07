import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { angsuranEksternal, pembiayaanEksternal } from '#/libs/database/schema/pembiayaan-eksternal'
import { allocateTransactionCode } from '#/libs/transaction'

import type * as AngsuranEksternalModel from './model'

import { PembiayaanEksternalNotFoundError } from '../pembiayaan-eksternal/errors'
import { assertExternalAccounts, getTransactionDate, recordExternalJournal } from '../pembiayaan-eksternal/utils'
import { PAYMENT_ACCOUNTS } from '../simpanan/constants'
import { AngsuranEksternalExceedsRemainingError, InvalidAngsuranEksternalError } from './errors'

const creator = alias(user, 'external_payment_creator')

export const AngsuranEksternalService = {
  async getAngsuran(query: AngsuranEksternalModel.Get['Query']) {
    const conditions = []
    if (query.pembiayaanEksternalId !== undefined) {
      conditions.push(eq(angsuranEksternal.pembiayaanEksternalId, query.pembiayaanEksternalId))
    }
    if (query.search) {
      conditions.push(
        or(
          ilike(angsuranEksternal.kodeTransaksi, `%${query.search}%`),
          ilike(pembiayaanEksternal.kodeTransaksi, `%${query.search}%`),
          ilike(pembiayaanEksternal.pemberiPembiayaan, `%${query.search}%`),
        ),
      )
    }
    const condition = and(...conditions)
    const total = await db.$count(
      db
        .select({ id: angsuranEksternal.id })
        .from(angsuranEksternal)
        .innerJoin(pembiayaanEksternal, eq(pembiayaanEksternal.id, angsuranEksternal.pembiayaanEksternalId))
        .where(condition),
    )
    const rows = await db
      .select({
        id: angsuranEksternal.id,
        pembiayaanEksternalId: angsuranEksternal.pembiayaanEksternalId,
        kodePembiayaan: pembiayaanEksternal.kodeTransaksi,
        pemberiPembiayaan: pembiayaanEksternal.pemberiPembiayaan,
        kodeTransaksi: angsuranEksternal.kodeTransaksi,
        tanggalTransaksi: angsuranEksternal.tanggalTransaksi,
        jumlahPembayaran: angsuranEksternal.jumlahPembayaran,
        jumlahMargin: angsuranEksternal.jumlahMargin,
        akunId: angsuranEksternal.akunId,
        keterangan: angsuranEksternal.keterangan,
        createdBy: angsuranEksternal.createdBy,
        creatorName: creator.name,
        createdAt: angsuranEksternal.createdAt,
      })
      .from(angsuranEksternal)
      .innerJoin(pembiayaanEksternal, eq(pembiayaanEksternal.id, angsuranEksternal.pembiayaanEksternalId))
      .innerJoin(creator, eq(creator.id, angsuranEksternal.createdBy))
      .where(condition)
      .orderBy(desc(angsuranEksternal.tanggalTransaksi), desc(angsuranEksternal.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
    const data: AngsuranEksternalModel.Get['Response'][200]['data'] = rows.map(({ akunId, ...row }) => ({
      ...row,
      jumlahPokok: row.jumlahPembayaran - row.jumlahMargin,
      metodePembayaran: akunId === AkunId.KAS ? 'Tunai' : 'Transfer',
      createdAt: row.createdAt.toISOString(),
    }))
    return { total, data } satisfies AngsuranEksternalModel.Get['Response'][200]
  },

  async createAngsuran(adminId: number, data: AngsuranEksternalModel.Post['Body']) {
    if (data.jumlahMargin > data.jumlahPembayaran) {
      throw new InvalidAngsuranEksternalError('Bagian margin tidak boleh melebihi total pembayaran')
    }
    const jumlahPokok = data.jumlahPembayaran - data.jumlahMargin
    const tanggalTransaksi = getTransactionDate(data.tanggalTransaksi)
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]
    await db.transaction(async (tx) => {
      // Lock the contract before checking balances so concurrent payments cannot overpay it.
      const [target] = await tx
        .select()
        .from(pembiayaanEksternal)
        .where(eq(pembiayaanEksternal.id, data.pembiayaanEksternalId))
        .for('update')
      if (!target) {
        throw new PembiayaanEksternalNotFoundError({ id: data.pembiayaanEksternalId })
      }
      if (tanggalTransaksi < target.tanggalPembiayaan) {
        throw new InvalidAngsuranEksternalError('Tanggal pembayaran tidak boleh sebelum tanggal pembiayaan')
      }
      const [totals] = await tx
        .select({
          totalPokok:
            sql<number>`coalesce(sum(${angsuranEksternal.jumlahPembayaran} - ${angsuranEksternal.jumlahMargin}), 0)`.mapWith(
              Number,
            ),
          totalMargin: sql<number>`coalesce(sum(${angsuranEksternal.jumlahMargin}), 0)`.mapWith(Number),
        })
        .from(angsuranEksternal)
        .where(eq(angsuranEksternal.pembiayaanEksternalId, target.id))
      if (
        jumlahPokok > target.jumlahPokok - (totals?.totalPokok ?? 0) ||
        data.jumlahMargin > target.jumlahMargin - (totals?.totalMargin ?? 0)
      ) {
        throw new AngsuranEksternalExceedsRemainingError()
      }
      await assertExternalAccounts(tx, akunId, data.jumlahMargin)
      const kodeTransaksi = await allocateTransactionCode(tx, 'angsuranEksternal', tanggalTransaksi)
      const keterangan = data.keterangan?.trim() || null
      await tx.insert(angsuranEksternal).values({
        pembiayaanEksternalId: target.id,
        kodeTransaksi,
        tanggalTransaksi,
        jumlahPembayaran: data.jumlahPembayaran,
        jumlahMargin: data.jumlahMargin,
        akunId,
        keterangan,
        createdBy: adminId,
      })
      const details: Array<{ akunId: number; debit: number; kredit: number }> = [
        { akunId, debit: 0, kredit: data.jumlahPembayaran },
      ]
      if (jumlahPokok > 0) {
        details.push({ akunId: AkunId.HUTANGPEMBIAYAAN, debit: jumlahPokok, kredit: 0 })
      }
      if (data.jumlahMargin > 0) {
        details.push({ akunId: AkunId.BIAYAMARGINPEMBIAYAAN, debit: data.jumlahMargin, kredit: 0 })
      }
      await recordExternalJournal(tx, adminId, { kodeTransaksi, tanggalTransaksi, keterangan }, details)
    })
  },
}
