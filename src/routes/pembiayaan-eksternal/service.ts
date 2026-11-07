import { and, desc, eq, gt, ilike, or, sql } from 'drizzle-orm'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { pembiayaanEksternal } from '#/libs/database/schema/pembiayaan-eksternal'
import { allocateTransactionCode } from '#/libs/transaction'

import type * as PembiayaanEksternalModel from './model'

import { InvalidPembiayaanEksternalError } from './errors'
import {
  assertExternalAccounts,
  getPembiayaanQuery,
  getTransactionDate,
  recordExternalJournal,
  serializePembiayaan,
  sisaPembiayaanExpression,
} from './utils'

export const PembiayaanEksternalService = {
  async getPembiayaan(query: PembiayaanEksternalModel.Get['Query']) {
    const conditions = []
    if (query.search) {
      conditions.push(
        or(
          ilike(pembiayaanEksternal.kodeTransaksi, `%${query.search}%`),
          ilike(pembiayaanEksternal.pemberiPembiayaan, `%${query.search}%`),
          ilike(pembiayaanEksternal.nomorAkad, `%${query.search}%`),
          ilike(pembiayaanEksternal.tujuan, `%${query.search}%`),
        ),
      )
    }
    if (query.statusPelunasan !== 'all') {
      conditions.push(
        query.statusPelunasan === 'lunas' ? eq(sisaPembiayaanExpression, 0) : gt(sisaPembiayaanExpression, 0),
      )
    }
    const condition = and(...conditions)
    const [count] = await db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(getPembiayaanQuery().where(condition).as('filtered_pembiayaan_eksternal'))
    const rows = await getPembiayaanQuery()
      .where(condition)
      .orderBy(desc(pembiayaanEksternal.tanggalPembiayaan), desc(pembiayaanEksternal.id))
      .limit(query.limit)
      .offset((query.page - 1) * query.limit)
    return {
      total: count?.total ?? 0,
      data: rows.map(serializePembiayaan),
    } satisfies PembiayaanEksternalModel.Get['Response'][200]
  },

  async getOptions() {
    const rows = await getPembiayaanQuery()
      .where(gt(sisaPembiayaanExpression, 0))
      .orderBy(desc(pembiayaanEksternal.tanggalPembiayaan), desc(pembiayaanEksternal.id))
    return {
      data: rows.map((row) => {
        const { id, kodeTransaksi, pemberiPembiayaan, tujuan, sisaPokok, sisaMargin, sisaPembiayaan } =
          serializePembiayaan(row)
        return { id, kodeTransaksi, pemberiPembiayaan, tujuan, sisaPokok, sisaMargin, sisaPembiayaan }
      }),
    } satisfies PembiayaanEksternalModel.OptionsGet['Response'][200]
  },

  async createPembiayaan(adminId: number, data: PembiayaanEksternalModel.Post['Body']) {
    const pemberiPembiayaan = data.pemberiPembiayaan.trim()
    const tujuan = data.tujuan.trim()
    if (!pemberiPembiayaan || !tujuan) {
      throw new InvalidPembiayaanEksternalError('Pemberi pembiayaan dan tujuan wajib diisi')
    }
    const tanggalPembiayaan = getTransactionDate(data.tanggalPembiayaan)
    await db.transaction(async (tx) => {
      await assertExternalAccounts(tx, data.akunId, 0)
      const kodeTransaksi = await allocateTransactionCode(tx, 'pembiayaanEksternal', tanggalPembiayaan)
      await tx.insert(pembiayaanEksternal).values({
        kodeTransaksi,
        pemberiPembiayaan,
        nomorAkad: data.nomorAkad?.trim() || null,
        jumlahPokok: data.jumlahPokok,
        jumlahMargin: data.jumlahMargin,
        akunId: data.akunId,
        tanggalPembiayaan,
        jangkaWaktuBulan: data.jangkaWaktuBulan,
        tujuan,
        createdBy: adminId,
      })
      await recordExternalJournal(
        tx,
        adminId,
        { kodeTransaksi, tanggalTransaksi: tanggalPembiayaan, keterangan: tujuan },
        [
          { akunId: data.akunId, debit: data.jumlahPokok, kredit: 0 },
          { akunId: AkunId.HUTANGPEMBIAYAAN, debit: 0, kredit: data.jumlahPokok },
        ],
      )
    })
  },
}
