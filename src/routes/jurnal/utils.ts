import { and, asc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'

export const jurnalHeaderSelection = {
  id: jurnal.id,
  kodeTransaksi: jurnal.kodeTransaksi,
  tanggalTransaksi: jurnal.tanggalTransaksi,
  keterangan: jurnal.keterangan,
}

export const jurnalDetailSelection = {
  jurnalId: jurnalDetail.jurnalId,
  kodeAkun: akun.kodeAkun,
  namaAkun: akun.namaAkun,
  userId: jurnalDetail.userId,
  userName: user.name,
  debit: jurnalDetail.debit,
  kredit: jurnalDetail.kredit,
}

export async function getMutasiBulanan(tahun: number, kategori: Array<typeof akun.$inferSelect.kategori>) {
  const year = String(tahun).padStart(4, '0')
  const bulan = sql<number>`extract(month from ${jurnal.tanggalTransaksi})`
  const mutasiBulanan = db
    .select({
      akunId: jurnalDetail.akunId,
      bulan: bulan.mapWith(Number).as('bulan'),
      jumlah: sql<number>`sum(${jurnalDetail.debit}::bigint - ${jurnalDetail.kredit}::bigint)`
        .mapWith(Number)
        .as('jumlah'),
    })
    .from(jurnalDetail)
    .innerJoin(jurnal, eq(jurnal.id, jurnalDetail.jurnalId))
    .where(and(gte(jurnal.tanggalTransaksi, `${year}-01-01`), lte(jurnal.tanggalTransaksi, `${year}-12-31`)))
    .groupBy(jurnalDetail.akunId, bulan)
    .as('mutasi_bulanan')

  // Keep active accounts even when they have no transactions in the selected year.
  return db
    .select({
      id: akun.id,
      namaAkun: akun.namaAkun,
      kategori: akun.kategori,
      bulan: mutasiBulanan.bulan,
      jumlah: mutasiBulanan.jumlah,
    })
    .from(akun)
    .leftJoin(mutasiBulanan, eq(mutasiBulanan.akunId, akun.id))
    .where(and(inArray(akun.kategori, kategori), eq(akun.isActive, true)))
    .orderBy(asc(akun.kodeAkun), asc(mutasiBulanan.bulan))
}

type KategoriAkun = 'aktiva' | 'pasiva' | 'pendapatan' | 'biaya'

export interface MutasiBulananRow {
  id: number
  namaAkun: string
  kategori: KategoriAkun
  bulan: number | null
  jumlah: number | null
}

interface LaporanAkun<Kategori extends KategoriAkun> {
  id: number
  namaAkun: string
  kategori: Kategori
  jumlahBulanan: number[]
  jumlah: number
}

export function buildLaporanAkun<Kategori extends KategoriAkun>(
  rows: MutasiBulananRow[],
  kategori: readonly Kategori[],
) {
  const akunById = new Map<number, LaporanAkun<Kategori>>()

  for (const row of rows) {
    const kategoriAkun = kategori.find((value) => value === row.kategori)
    if (!kategoriAkun) continue

    let account = akunById.get(row.id)
    if (!account) {
      account = {
        id: row.id,
        namaAkun: row.namaAkun,
        kategori: kategoriAkun,
        jumlahBulanan: Array.from({ length: 12 }, () => 0),
        jumlah: 0,
      }
      akunById.set(row.id, account)
    }

    if (row.bulan !== null && row.jumlah !== null) {
      // SQL returns debit - kredit. Pasiva and pendapatan use the opposite sign.
      const jumlah = row.kategori === 'aktiva' || row.kategori === 'biaya' ? row.jumlah : -row.jumlah
      const index = row.bulan - 1
      account.jumlahBulanan[index] = (account.jumlahBulanan[index] ?? 0) + jumlah
      account.jumlah += jumlah
    }
  }

  return [...akunById.values()]
}

export function sumKategori(data: Array<LaporanAkun<KategoriAkun>>, kategori: KategoriAkun) {
  return Array.from({ length: 12 }, (_, index) =>
    data.reduce(
      (total, account) => total + (account.kategori === kategori ? (account.jumlahBulanan[index] ?? 0) : 0),
      0,
    ),
  )
}

export function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

export function buildRingkasanLabaRugi(data: Array<LaporanAkun<'pendapatan' | 'biaya'>>) {
  const pendapatanBulanan = sumKategori(data, 'pendapatan')
  const biayaBulanan = sumKategori(data, 'biaya')
  const labaRugiBulanan = pendapatanBulanan.map((jumlah, index) => jumlah - (biayaBulanan[index] ?? 0))

  return {
    pendapatanBulanan,
    biayaBulanan,
    labaRugiBulanan,
    totalPendapatan: sum(pendapatanBulanan),
    totalBiaya: sum(biayaBulanan),
    totalLabaRugi: sum(labaRugiBulanan),
  }
}
