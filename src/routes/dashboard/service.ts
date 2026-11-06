import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { saham } from '#/libs/database/schema/master'
import { pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'

import type * as DashboardModel from './model'

export const DashboardService = {
  async getDashboard() {
    const sekarang = new Date()
    const tanggal = getJakartaDate(sekarang)
    const tahun = Number(tanggal.slice(0, 4))
    const awalTahun = `${tanggal.slice(0, 4)}-01-01`
    const tahunAwalGrafik = 2018
    const awalGrafik = `${tahunAwalGrafik}-01-01`

    const hargaTerakhir = await db
      .select({ hargaJual: saham.hargaJual, createdAt: saham.createdAt })
      .from(saham)
      .where(lte(saham.createdAt, sekarang))
      .orderBy(desc(saham.createdAt), desc(saham.id))
      .limit(2)

    const [totalPembiayaan] = await db
      .select({
        total: sql`coalesce(sum(${pembiayaan.jumlahPokok}::bigint + ${pembiayaan.jumlahMargin}::bigint), 0)`.mapWith(
          Number,
        ),
      })
      .from(pembiayaan)
      .where(eq(pembiayaan.statusApproved, 'approved'))

    const tahunPembiayaan = sql`extract(year from ${pembiayaan.tanggalPembiayaan})`
    const pembiayaanTahunan = await db
      .select({
        tahun: tahunPembiayaan.mapWith(Number),
        total: sql`coalesce(sum(${pembiayaan.jumlahPokok}::bigint + ${pembiayaan.jumlahMargin}::bigint), 0)`.mapWith(
          Number,
        ),
      })
      .from(pembiayaan)
      .where(
        and(
          eq(pembiayaan.statusApproved, 'approved'),
          gte(pembiayaan.tanggalPembiayaan, awalGrafik),
          lte(pembiayaan.tanggalPembiayaan, tanggal),
        ),
      )
      .groupBy(tahunPembiayaan)
      .orderBy(tahunPembiayaan)

    const tahunTransaksi = sql`extract(year from ${jurnal.tanggalTransaksi})`
    const labaTahunan = await db
      .select({
        tahun: tahunTransaksi.mapWith(Number),
        pendapatan:
          sql`coalesce(sum(case when ${akun.kategori} = 'pendapatan' then ${jurnalDetail.kredit}::bigint - ${jurnalDetail.debit}::bigint else 0 end), 0)`.mapWith(
            Number,
          ),
        biaya:
          sql`coalesce(sum(case when ${akun.kategori} = 'biaya' then ${jurnalDetail.debit}::bigint - ${jurnalDetail.kredit}::bigint else 0 end), 0)`.mapWith(
            Number,
          ),
      })
      .from(jurnalDetail)
      .innerJoin(jurnal, eq(jurnal.id, jurnalDetail.jurnalId))
      .innerJoin(akun, eq(akun.id, jurnalDetail.akunId))
      .where(
        and(
          gte(jurnal.tanggalTransaksi, awalGrafik),
          lte(jurnal.tanggalTransaksi, tanggal),
          inArray(akun.kategori, ['pendapatan', 'biaya']),
        ),
      )
      .groupBy(tahunTransaksi)
      .orderBy(tahunTransaksi)

    const pembiayaanPerTahun = new Map(pembiayaanTahunan.map((row) => [row.tahun, row.total]))
    const grafikPembiayaanTahunan = Array.from({ length: tahun - tahunAwalGrafik + 1 }, (_, index) => {
      const tahunGrafik = tahunAwalGrafik + index
      return { tahun: tahunGrafik, total: pembiayaanPerTahun.get(tahunGrafik) ?? 0 }
    })

    const labaPerTahun = new Map(labaTahunan.map((row) => [row.tahun, row]))
    const grafikLabaTahunan = Array.from({ length: tahun - tahunAwalGrafik + 1 }, (_, index) => {
      const tahunGrafik = tahunAwalGrafik + index
      const row = labaPerTahun.get(tahunGrafik)
      const pendapatan = row?.pendapatan ?? 0
      const biaya = row?.biaya ?? 0
      return {
        tahun: tahunGrafik,
        pendapatan,
        biaya,
        laba: pendapatan - biaya,
      }
    })

    const [hargaTerkini, hargaSebelumnya] = hargaTerakhir
    const perubahanNominal = hargaTerkini && hargaSebelumnya ? hargaTerkini.hargaJual - hargaSebelumnya.hargaJual : null

    return {
      hargaSaham: {
        hargaNominal: HARGA_NOMINAL_SAHAM,
        hargaJual: hargaTerkini?.hargaJual ?? null,
        diperbaruiPada: hargaTerkini?.createdAt.toISOString() ?? null,
        hargaSebelumnya: hargaSebelumnya?.hargaJual ?? null,
        perubahanNominal,
        perubahanPersen:
          perubahanNominal !== null && hargaSebelumnya && hargaSebelumnya.hargaJual !== 0
            ? (perubahanNominal / hargaSebelumnya.hargaJual) * 100
            : null,
      },
      grafikPembiayaanTahunan: {
        periodeMulai: awalGrafik,
        periodeSelesai: tanggal,
        data: grafikPembiayaanTahunan,
      },
      pembiayaanBerjalan: {
        total: totalPembiayaan?.total ?? 0,
      },
      labaBerjalan: {
        periodeMulai: awalTahun,
        periodeSelesai: tanggal,
        total: grafikLabaTahunan.find((row) => row.tahun === tahun)?.laba ?? 0,
      },
      grafikLabaTahunan,
    } satisfies DashboardModel.Get['Response'][200]
  },
}
