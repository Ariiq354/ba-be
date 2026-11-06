import { asc, desc, eq, ilike, inArray } from 'drizzle-orm'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { masterInputTransaksi } from '#/libs/database/schema/master'
import { ItemNotFoundError } from '#/libs/errors'

import type * as JurnalModel from './model'

import {
  AutoJurnalsImmutableError,
  InactiveTemplateError,
  InvalidJurnalError,
  JurnalsNotFoundError,
  UnbalancedJurnalError,
} from './errors'
import {
  buildLaporanAkun,
  buildRingkasanLabaRugi,
  getMutasiBulanan,
  insertJurnal,
  jurnalDetailSelection,
  jurnalHeaderSelection,
  sum,
  sumKategori,
} from './utils'

export const JurnalService = {
  async getNeraca(query: JurnalModel.NeracaGet['Query']) {
    const rows = await getMutasiBulanan(query.tahun, ['aktiva', 'pasiva', 'pendapatan', 'biaya'])
    const data = buildLaporanAkun(rows, ['aktiva', 'pasiva'])
    const labaRugi = buildRingkasanLabaRugi(buildLaporanAkun(rows, ['pendapatan', 'biaya']))
    const labaRugiTahunBerjalan = data.find(
      (account) => account.id === AkunId.LABARUGITAHUNBERJALAN && account.kategori === 'pasiva',
    )

    if (labaRugiTahunBerjalan) {
      labaRugiTahunBerjalan.jumlahBulanan = labaRugiTahunBerjalan.jumlahBulanan.map(
        (jumlah, index) => jumlah + (labaRugi.labaRugiBulanan[index] ?? 0),
      )
      labaRugiTahunBerjalan.jumlah += labaRugi.totalLabaRugi
    }

    const aktivaBulanan = sumKategori(data, 'aktiva')
    const pasivaBulanan = sumKategori(data, 'pasiva')

    return {
      data,
      ringkasan: {
        aktivaBulanan,
        pasivaBulanan,
        totalAktiva: sum(aktivaBulanan),
        totalPasiva: sum(pasivaBulanan),
      },
    } satisfies JurnalModel.NeracaGet['Response'][200]
  },

  async getLabaRugi(query: JurnalModel.LabaRugiGet['Query']) {
    const rows = await getMutasiBulanan(query.tahun, ['pendapatan', 'biaya'])
    const data = buildLaporanAkun(rows, ['pendapatan', 'biaya'])

    return {
      data,
      ringkasan: buildRingkasanLabaRugi(data),
    } satisfies JurnalModel.LabaRugiGet['Response'][200]
  },

  async getPaginatedJurnal(query: JurnalModel.Get['Query']) {
    const condition = query.search ? ilike(jurnal.kodeTransaksi, `%${query.search}%`) : undefined
    const offset = (query.page - 1) * query.limit

    const [total, headers] = await Promise.all([
      db.$count(jurnal, condition),
      db
        .select(jurnalHeaderSelection)
        .from(jurnal)
        .where(condition)
        .orderBy(desc(jurnal.tanggalTransaksi), desc(jurnal.id))
        .limit(query.limit)
        .offset(offset),
    ])

    if (headers.length === 0) {
      return { total, data: [] } satisfies JurnalModel.Get['Response'][200]
    }

    const details = await db
      .select(jurnalDetailSelection)
      .from(jurnalDetail)
      .innerJoin(akun, eq(akun.id, jurnalDetail.akunId))
      .innerJoin(user, eq(user.id, jurnalDetail.userId))
      .where(
        inArray(
          jurnalDetail.jurnalId,
          headers.map((header) => header.id),
        ),
      )
      .orderBy(asc(jurnalDetail.id))

    const detailsByJurnal = new Map<number, JurnalModel.Get['Response'][200]['data'][number]['details']>()
    for (const { jurnalId, ...detail } of details) {
      const headerDetails = detailsByJurnal.get(jurnalId)
      if (headerDetails) {
        headerDetails.push(detail)
      } else {
        detailsByJurnal.set(jurnalId, [detail])
      }
    }

    const data = headers.map((header) => ({
      ...header,
      details: detailsByJurnal.get(header.id) ?? [],
    }))

    return { total, data } satisfies JurnalModel.Get['Response'][200]
  },

  async createJurnalFromTemplate(userId: number, data: JurnalModel.TemplatePost['Body']) {
    await db.transaction(async (tx) => {
      const [template] = await tx
        .select()
        .from(masterInputTransaksi)
        .where(eq(masterInputTransaksi.id, data.masterInputTransaksiId))

      if (!template) {
        throw new ItemNotFoundError({
          id: data.masterInputTransaksiId,
          message: `Template transaksi dengan ID '${data.masterInputTransaksiId}' tidak ditemukan`,
        })
      }

      if (!template.isActive) {
        throw new InactiveTemplateError({ id: template.id })
      }

      await insertJurnal(tx, userId, {
        tanggalTransaksi: data.tanggalTransaksi,
        keterangan: data.keterangan,
        details: [
          { akunId: template.akunDebitId, debit: data.nominal, kredit: 0 },
          { akunId: template.akunKreditId, debit: 0, kredit: data.nominal },
        ],
      })
    })
  },

  async createJurnal(userId: number, data: JurnalModel.Post['Body']) {
    const totalDebit = data.details.reduce((total, detail) => total + detail.debit, 0)
    const totalKredit = data.details.reduce((total, detail) => total + detail.kredit, 0)

    if (totalDebit <= 0 || totalKredit <= 0) {
      throw new InvalidJurnalError({ reason: 'non_positive_totals' })
    }

    if (totalDebit !== totalKredit) {
      throw new UnbalancedJurnalError({ totalDebit, totalKredit })
    }

    await db.transaction((tx) => insertJurnal(tx, userId, data))
  },

  async deleteJurnal(ids: JurnalModel.Delete['Body']['ids']) {
    const uniqueIds = [...new Set(ids)]

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: jurnal.id,
          kodeTransaksi: jurnal.kodeTransaksi,
        })
        .from(jurnal)
        .where(inArray(jurnal.id, uniqueIds))
        .for('update')

      const existingIds = new Set(existing.map((item) => item.id))
      const missingIds = uniqueIds.filter((id) => !existingIds.has(id))
      if (missingIds.length > 0) {
        throw new JurnalsNotFoundError({ ids: missingIds })
      }

      const protectedIds = existing
        .filter((header) => !header.kodeTransaksi.startsWith('TRX-'))
        .map((header) => header.id)
      if (protectedIds.length > 0) {
        throw new AutoJurnalsImmutableError({ ids: protectedIds })
      }

      await tx.delete(jurnal).where(inArray(jurnal.id, uniqueIds))
    })
  },
}
