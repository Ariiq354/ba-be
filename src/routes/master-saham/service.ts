import { desc, eq, lte, sql } from 'drizzle-orm'

import { AkunId, HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { saham as hargaSaham } from '#/libs/database/schema/master'
import { saldoSimpanan } from '#/libs/database/schema/simpanan'
import { getJakartaDate } from '#/libs/date'

import type * as MasterSahamModel from './model'

import { HargaSahamNotFoundError } from './errors'

export const MasterSahamService = {
  async createHargaSaham(userId: number, data: MasterSahamModel.Post['Body']) {
    await db.insert(hargaSaham).values({
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: data.hargaJual,
      updatedBy: userId,
    })
  },

  async getLatestHargaSaham() {
    const [row] = await db
      .select({ hargaJual: hargaSaham.hargaJual })
      .from(hargaSaham)
      .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))
      .limit(1)

    if (!row) {
      return new HargaSahamNotFoundError()
    }

    return {
      hargaNominal: HARGA_NOMINAL_SAHAM,
      hargaJual: row.hargaJual,
    } satisfies MasterSahamModel.LatestGet['Response'][200]
  },

  async getRealtimeHargaSaham() {
    const tanggal = getJakartaDate()
    const awalTahun = `${tanggal.slice(0, 4)}-01-01`

    const [saldo] = await db
      .select({ jumlahSaham: sql`coalesce(sum(${saldoSimpanan.jumlahSaham}), 0)`.mapWith(Number) })
      .from(saldoSimpanan)

    const jumlahSaham = saldo?.jumlahSaham ?? 0
    if (jumlahSaham === 0) {
      return { hargaRealtime: null } satisfies MasterSahamModel.RealtimeGet['Response'][200]
    }

    const [ringkasan] = await db
      .select({
        agioSaham:
          sql`coalesce(sum(case when ${jurnalDetail.akunId} = ${AkunId.AGIOSAHAM} then ${jurnalDetail.kredit}::bigint - ${jurnalDetail.debit}::bigint else 0 end), 0)`.mapWith(
            Number,
          ),
        labaDitahan:
          sql`coalesce(sum(case when ${jurnalDetail.akunId} = ${AkunId.LABADITAHAN} then ${jurnalDetail.kredit}::bigint - ${jurnalDetail.debit}::bigint else 0 end), 0)`.mapWith(
            Number,
          ),
        labaBerjalan:
          sql`coalesce(sum(case when ${akun.kategori} in ('pendapatan', 'biaya') and ${jurnal.tanggalTransaksi} >= ${awalTahun} then ${jurnalDetail.kredit}::bigint - ${jurnalDetail.debit}::bigint else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(jurnalDetail)
      .innerJoin(jurnal, eq(jurnal.id, jurnalDetail.jurnalId))
      .innerJoin(akun, eq(akun.id, jurnalDetail.akunId))
      .where(lte(jurnal.tanggalTransaksi, tanggal))

    const modalNominal = jumlahSaham * HARGA_NOMINAL_SAHAM
    // Keep the legacy formula's 10% share of current-year profit for this estimate only.
    const hargaRealtime =
      (modalNominal +
        (ringkasan?.agioSaham ?? 0) +
        (ringkasan?.labaDitahan ?? 0) +
        (ringkasan?.labaBerjalan ?? 0) / 10) /
      jumlahSaham

    return { hargaRealtime } satisfies MasterSahamModel.RealtimeGet['Response'][200]
  },

  async getPaginatedHargaSaham(query: MasterSahamModel.Get['Query']) {
    const hargaSahamQuery = db
      .select({
        id: hargaSaham.id,
        hargaJual: hargaSaham.hargaJual,
        updatedByName: user.name,
        createdAt: hargaSaham.createdAt,
      })
      .from(hargaSaham)
      .leftJoin(user, eq(user.id, hargaSaham.updatedBy))
      .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))

    const offset = (query.page - 1) * query.limit
    const total = await db.$count(hargaSaham)
    const rows = await hargaSahamQuery.limit(query.limit).offset(offset)
    const data = rows.map((row) => ({
      ...row,
      hargaNominal: HARGA_NOMINAL_SAHAM,
      updatedByName: row.updatedByName ?? '',
      createdAt: row.createdAt.toISOString(),
    }))

    return { total, data } satisfies MasterSahamModel.Get['Response'][200]
  },
}
