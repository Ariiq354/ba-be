import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from 'drizzle-orm'

import { HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { saham } from '#/libs/database/schema/master'
import { getJakartaDate } from '#/libs/date'

import type * as DashboardModel from './model'

export const DashboardService = {
  async getDashboard() {
    const sekarang = new Date()
    const tanggal = getJakartaDate(sekarang)
    const tahun = Number(tanggal.slice(0, 4))
    const bulanSekarang = Number(tanggal.slice(5, 7))
    const awalTahun = `${tanggal.slice(0, 4)}-01-01`
    const awalGrafik = new Date(Date.UTC(tahun, bulanSekarang - 12, 1)).toISOString().slice(0, 10)
    const awalGrafikTimestamp = new Date(`${awalGrafik}T00:00:00+07:00`)

    return db.transaction(
      async (tx) => {
        const hargaTerakhir = await tx
          .select({ hargaJual: saham.hargaJual, createdAt: saham.createdAt })
          .from(saham)
          .where(lte(saham.createdAt, sekarang))
          .orderBy(desc(saham.createdAt), desc(saham.id))
          .limit(2)

        const [hargaAwal] = await tx
          .select({ hargaJual: saham.hargaJual })
          .from(saham)
          .where(lt(saham.createdAt, awalGrafikTimestamp))
          .orderBy(desc(saham.createdAt), desc(saham.id))
          .limit(1)

        const riwayatHarga = await tx
          .select({ hargaJual: saham.hargaJual, createdAt: saham.createdAt })
          .from(saham)
          .where(and(gte(saham.createdAt, awalGrafikTimestamp), lte(saham.createdAt, sekarang)))
          .orderBy(asc(saham.createdAt), asc(saham.id))

        const bulanTransaksi = sql`extract(month from ${jurnal.tanggalTransaksi})`
        const labaBulanan = await tx
          .select({
            bulan: bulanTransaksi.mapWith(Number),
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
              gte(jurnal.tanggalTransaksi, awalTahun),
              lte(jurnal.tanggalTransaksi, tanggal),
              inArray(akun.kategori, ['pendapatan', 'biaya']),
            ),
          )
          .groupBy(bulanTransaksi)
          .orderBy(bulanTransaksi)

        const hargaTerakhirPerBulan = new Map(
          riwayatHarga.map((row) => [getJakartaDate(row.createdAt).slice(0, 7), row.hargaJual]),
        )
        let hargaGrafik = hargaAwal?.hargaJual ?? null
        const grafikHargaSaham = Array.from({ length: 12 }, (_, index) => {
          const bulan = new Date(Date.UTC(tahun, bulanSekarang - 12 + index, 1)).toISOString().slice(0, 7)
          hargaGrafik = hargaTerakhirPerBulan.get(bulan) ?? hargaGrafik
          return { bulan, hargaJual: hargaGrafik }
        })

        const labaPerBulan = new Map(labaBulanan.map((row) => [row.bulan, row]))
        const grafikLabaBulanan = Array.from({ length: bulanSekarang }, (_, index) => {
          const row = labaPerBulan.get(index + 1)
          const pendapatan = row?.pendapatan ?? 0
          const biaya = row?.biaya ?? 0
          return {
            bulan: `${tahun}-${String(index + 1).padStart(2, '0')}`,
            pendapatan,
            biaya,
            laba: pendapatan - biaya,
          }
        })

        const [hargaTerkini, hargaSebelumnya] = hargaTerakhir
        const perubahanNominal =
          hargaTerkini && hargaSebelumnya ? hargaTerkini.hargaJual - hargaSebelumnya.hargaJual : null

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
          grafikHargaSaham: {
            periodeMulai: awalGrafik,
            periodeSelesai: tanggal,
            data: grafikHargaSaham,
          },
          labaBerjalan: {
            periodeMulai: awalTahun,
            periodeSelesai: tanggal,
            total: grafikLabaBulanan.reduce((total, row) => total + row.laba, 0),
          },
          grafikLabaBulanan,
        } satisfies DashboardModel.Get['Response'][200]
      },
      { isolationLevel: 'repeatable read' },
    )
  },
}
