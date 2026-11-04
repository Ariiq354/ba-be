import { asc, desc, eq, ilike, inArray } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { masterInputTransaksi } from '#/libs/database/schema/master'
import { ItemNotFoundError } from '#/libs/errors'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as JurnalModel from './model'

import {
  AkunNotFoundError,
  AutoJurnalsImmutableError,
  InactiveAkunError,
  InactiveTemplateError,
  InvalidJurnalError,
  InvalidJurnalIdsError,
  JurnalsNotFoundError,
  UnbalancedJurnalError,
} from './errors'
import {
  buildLaporanAkun,
  buildRingkasanLabaRugi,
  getMutasiBulanan,
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
      labaRugiTahunBerjalan.jumlahBulanan = labaRugi.labaRugiBulanan
      labaRugiTahunBerjalan.jumlah = labaRugi.totalLabaRugi
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
        .for('share')

      if (!template) {
        throw new ItemNotFoundError({
          id: data.masterInputTransaksiId,
          message: `Template transaksi dengan ID '${data.masterInputTransaksiId}' tidak ditemukan`,
        })
      }

      if (!template.isActive) {
        throw new InactiveTemplateError({ id: template.id })
      }

      await JurnalService.createJurnal(
        userId,
        {
          tanggalTransaksi: data.tanggalTransaksi,
          keterangan: data.keterangan,
          details: [
            { akunId: template.akunDebitId, debit: data.nominal, kredit: 0 },
            { akunId: template.akunKreditId, debit: 0, kredit: data.nominal },
          ],
        },
        tx,
      )
    })
  },

  async createJurnal(userId: number, data: JurnalModel.Post['Body'], transaction?: Transaction) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data.tanggalTransaksi)
    if (!match) {
      throw new InvalidJurnalError({ reason: 'invalid_date' })
    }

    const year = Number(match[1])
    const month = Number(match[2])
    const day = Number(match[3])
    const date = new Date(0)
    date.setUTCHours(0, 0, 0, 0)
    date.setUTCFullYear(year, month - 1, day)

    if (year === 0 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
      throw new InvalidJurnalError({ reason: 'invalid_date' })
    }

    if (
      data.details.length < 2 ||
      data.details.some(
        (detail) =>
          !Number.isInteger(detail.akunId) ||
          detail.akunId < 1 ||
          !Number.isInteger(detail.debit) ||
          detail.debit < 0 ||
          !Number.isInteger(detail.kredit) ||
          detail.kredit < 0,
      )
    ) {
      throw new InvalidJurnalError({ reason: 'invalid_details' })
    }

    const totalDebit = data.details.reduce((total, detail) => total + detail.debit, 0)
    const totalKredit = data.details.reduce((total, detail) => total + detail.kredit, 0)

    if (totalDebit <= 0 || totalKredit <= 0) {
      throw new InvalidJurnalError({ reason: 'non_positive_totals' })
    }

    if (totalDebit !== totalKredit) {
      throw new UnbalancedJurnalError({ totalDebit, totalKredit })
    }

    await (transaction ?? db).transaction(async (tx) => {
      const akunIds = [...new Set(data.details.map((detail) => detail.akunId))]
      const akunRows = await tx
        .select({
          id: akun.id,
          isActive: akun.isActive,
        })
        .from(akun)
        .where(inArray(akun.id, akunIds))
        .for('share')

      const akunById = new Map(akunRows.map((row) => [row.id, row]))
      const missingAkunIds = akunIds.filter((id) => !akunById.has(id))
      if (missingAkunIds.length > 0) {
        throw new AkunNotFoundError({ ids: missingAkunIds })
      }

      const inactiveAkunIds = akunIds.filter((id) => !akunById.get(id)?.isActive)
      if (inactiveAkunIds.length > 0) {
        throw new InactiveAkunError({ ids: inactiveAkunIds })
      }

      const kodeTransaksi = await allocateTransactionCode(tx, 'jurnal', data.tanggalTransaksi)
      const [header] = await tx
        .insert(jurnal)
        .values({
          kodeTransaksi,
          tanggalTransaksi: data.tanggalTransaksi,
          keterangan: data.keterangan ?? null,
        })
        .returning({ id: jurnal.id })

      if (!header) {
        throw new Error('Jurnal header insert returned no row')
      }

      await tx.insert(jurnalDetail).values(
        data.details.map((detail) => ({
          jurnalId: header.id,
          akunId: detail.akunId,
          userId,
          debit: detail.debit,
          kredit: detail.kredit,
        })),
      )
    })
  },

  async deleteJurnal(ids: JurnalModel.Delete['Body']['ids']) {
    const uniqueIds = [...new Set(ids)]

    if (uniqueIds.length === 0) {
      return new InvalidJurnalIdsError()
    }

    await db.transaction(async (tx) => {
      const existing = await tx
        .select({
          id: jurnal.id,
          kodeTransaksi: jurnal.kodeTransaksi,
          tanggalTransaksi: jurnal.tanggalTransaksi,
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

      await retainTransactionCodes(tx, 'jurnal', existing)
      await tx.delete(jurnal).where(inArray(jurnal.id, uniqueIds))
    })
  },
}
