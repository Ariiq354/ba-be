import { and, desc, eq, gte, ilike, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { margin } from '#/libs/database/schema/master'
import { angsuran, pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'
import { ItemNotFoundError } from '#/libs/errors'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as PembiayaanModel from './model'

import { roundProportion } from '../angsuran/utils'
import { PAYMENT_ACCOUNTS } from '../simpanan/constants'
import { InvalidRejectionReasonError } from '../simpanan/errors'
import { assertMember, assertPaymentAccount } from '../simpanan/utils'
import {
  InvalidPembiayaanError,
  MarginOverrideForbiddenError,
  MarginPembiayaanNotFoundError,
  PembiayaanAlreadyProcessedError,
  PembiayaanAlreadyTransferredError,
  PembiayaanNotDeletedError,
  PembiayaanNotFoundError,
  PembiayaanNotTransferredError,
  PembiayaanTransferredCancellationError,
} from './errors'
import { assertJournalAccounts, recordWakalahTransfer } from './utils'

const member = alias(user, 'member')
const creator = alias(user, 'creator')
const approver = alias(user, 'approver')

export const PembiayaanService = {
  async getPembiayaanOptions(actorId: number, query: PembiayaanModel.OptionsGet['Query']) {
    return db.transaction(
      async (tx) => {
        await assertPenggunaAccess(tx, actorId, query.userId)
        await assertMember(tx, query.userId)

        const rows = await tx
          .select({
            id: pembiayaan.id,
            kodeTransaksi: pembiayaan.kodeTransaksi,
            tujuan: pembiayaan.tujuan,
            jumlahPokok: pembiayaan.jumlahPokok,
            jumlahMargin: pembiayaan.jumlahMargin,
            tanggalPembiayaan: pembiayaan.tanggalPembiayaan,
            jangkaWaktuBulan: pembiayaan.jangkaWaktuBulan,
            totalPembayaran: sql<number>`coalesce(sum(${angsuran.jumlahPembayaran}), 0)`.mapWith(Number),
          })
          .from(pembiayaan)
          .leftJoin(angsuran, and(eq(angsuran.pembiayaanId, pembiayaan.id), eq(angsuran.statusApproved, 'approved')))
          .where(
            and(
              eq(pembiayaan.userId, query.userId),
              eq(pembiayaan.statusApproved, 'approved'),
              isNotNull(pembiayaan.tanggalPembiayaan),
            ),
          )
          .groupBy(pembiayaan.id)
          .orderBy(desc(pembiayaan.tanggalPembiayaan), desc(pembiayaan.id))

        const tanggalSekarang = getJakartaDate()
        const [currentYear, currentMonth] = tanggalSekarang.split('-').map(Number) as [number, number]
        const data: PembiayaanModel.OptionsGet['Response'][200]['data'] = []
        for (const row of rows) {
          const totalTagihan = row.jumlahPokok + row.jumlahMargin
          const sisaTagihan = Math.max(0, totalTagihan - row.totalPembayaran)
          if (sisaTagihan === 0 || row.tanggalPembiayaan === null) {
            continue
          }

          const [startYear, startMonth, startDay] = row.tanggalPembiayaan.split('-').map(Number) as [
            number,
            number,
            number,
          ]
          let monthsDue = Math.max(0, (currentYear - startYear) * 12 + currentMonth - startMonth)
          if (monthsDue > 0) {
            const targetDate = new Date(0)
            targetDate.setUTCFullYear(startYear, startMonth - 1 + monthsDue + 1, 0)
            targetDate.setUTCDate(Math.min(startDay, targetDate.getUTCDate()))
            if (tanggalSekarang < targetDate.toISOString().slice(0, 10)) {
              monthsDue--
            }
          }
          monthsDue = Math.min(monthsDue, row.jangkaWaktuBulan)

          const targetPembayaranKumulatif = roundProportion(totalTagihan, monthsDue, row.jangkaWaktuBulan)
          data.push({
            id: row.id,
            kodeTransaksi: row.kodeTransaksi,
            tujuan: row.tujuan,
            totalTagihan,
            sisaTagihan,
            angsuranBulanan: roundProportion(totalTagihan, 1, row.jangkaWaktuBulan),
            sisaPembayaranBulanIni: Math.max(0, targetPembayaranKumulatif - row.totalPembayaran),
          })
        }

        return { data } satisfies PembiayaanModel.OptionsGet['Response'][200]
      },
      { isolationLevel: 'repeatable read' },
    )
  },

  async getPembiayaan(actorId: number, query: PembiayaanModel.Get['Query']) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)
    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []
    if (accessCondition !== undefined) {
      const accessibleUsers = db.select({ id: user.id }).from(user).where(accessCondition)
      conditions.push(inArray(pembiayaan.userId, accessibleUsers))
    }
    if (query.userId !== undefined) {
      await assertPenggunaAccess(db, actorId, query.userId)
      conditions.push(eq(pembiayaan.userId, query.userId))
    }
    if (query.status !== 'all') {
      conditions.push(eq(pembiayaan.statusApproved, query.status))
    }
    if (query.statusTransfer !== 'all') {
      conditions.push(
        query.statusTransfer === 'sudah_transfer'
          ? isNotNull(pembiayaan.transferredAt)
          : isNull(pembiayaan.transferredAt),
      )
    }
    if (query.search) {
      conditions.push(ilike(pembiayaan.kodeTransaksi, `%${query.search}%`))
    }

    const qb = db
      .select({
        id: pembiayaan.id,
        kodeTransaksi: pembiayaan.kodeTransaksi,
        userId: pembiayaan.userId,
        akunId: pembiayaan.akunId,
        jumlahPokok: pembiayaan.jumlahPokok,
        persenMarginTahun: pembiayaan.persenMarginTahun,
        jumlahMargin: pembiayaan.jumlahMargin,
        biayaAkad: pembiayaan.biayaAkad,
        jangkaWaktuBulan: pembiayaan.jangkaWaktuBulan,
        tujuan: pembiayaan.tujuan,
        tanggalPengajuan: pembiayaan.tanggalPengajuan,
        tanggalTransfer: pembiayaan.tanggalTransfer,
        tanggalPembiayaan: pembiayaan.tanggalPembiayaan,
        transferredBy: pembiayaan.transferredBy,
        transferredAt: pembiayaan.transferredAt,
        statusApproved: pembiayaan.statusApproved,
        alasanPenolakan: pembiayaan.alasanPenolakan,
        createdBy: pembiayaan.createdBy,
        approvedBy: pembiayaan.approvedBy,
        approvedAt: pembiayaan.approvedAt,
        createdAt: pembiayaan.createdAt,
        updatedAt: pembiayaan.updatedAt,
        memberName: member.name,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(pembiayaan)
      .innerJoin(member, eq(member.id, pembiayaan.userId))
      .innerJoin(creator, eq(creator.id, pembiayaan.createdBy))
      .leftJoin(approver, eq(approver.id, pembiayaan.approvedBy))
      .where(and(...conditions))
      .orderBy(desc(eq(pembiayaan.statusApproved, 'pending')), desc(pembiayaan.createdAt), desc(pembiayaan.id))

    const total = await db.$count(qb)
    const rows = await qb.limit(query.limit).offset((query.page - 1) * query.limit)
    const data: PembiayaanModel.Get['Response'][200]['data'] = rows.map(({ akunId, ...row }) => ({
      ...row,
      metodePembayaran: akunId === AkunId.KAS ? 'Tunai' : 'Transfer',
      totalPembiayaan: row.jumlahPokok + row.jumlahMargin,
      statusTransfer: row.transferredAt === null ? 'belum_transfer' : 'sudah_transfer',
      transferredAt: row.transferredAt?.toISOString() ?? null,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data } satisfies PembiayaanModel.Get['Response'][200]
  },

  async simulasiMargin(data: PembiayaanModel.SimulasiMarginPost['Body']) {
    if (data.jumlahPokok === undefined) {
      return {} satisfies PembiayaanModel.SimulasiMarginPost['Response'][200]
    }

    let persenMarginTahun = data.persenMarginTahun
    if (persenMarginTahun === undefined) {
      const [selectedMargin] = await db
        .select({ persenMarginTahun: margin.persenMarginTahun })
        .from(margin)
        .where(
          and(
            lte(margin.minNominal, data.jumlahPokok),
            or(isNull(margin.maxNominal), gte(margin.maxNominal, data.jumlahPokok)),
          ),
        )
        .orderBy(desc(margin.minNominal), desc(margin.id))
        .limit(1)
      if (!selectedMargin) {
        throw new MarginPembiayaanNotFoundError()
      }
      persenMarginTahun = selectedMargin.persenMarginTahun
    }

    const jumlahMargin =
      data.jangkaWaktuBulan === undefined
        ? undefined
        : Math.round((data.jumlahPokok * persenMarginTahun * data.jangkaWaktuBulan) / (100 * 12))

    return { persenMarginTahun, jumlahMargin } satisfies PembiayaanModel.SimulasiMarginPost['Response'][200]
  },

  async createPembiayaan(actorId: number, data: PembiayaanModel.Post['Body']) {
    const userId = data.userId ?? actorId
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]
    const tujuan = data.tujuan.trim()
    if (!tujuan) {
      throw new InvalidPembiayaanError('Tujuan pembiayaan wajib diisi')
    }

    await db.transaction(async (tx) => {
      const [actor] = await tx.select({ role: user.role }).from(user).where(eq(user.id, actorId)).for('share')
      if (!actor) {
        throw new ItemNotFoundError({ id: actorId, message: 'Pengguna tidak ditemukan' })
      }
      if (data.persenMarginTahun !== undefined && actor.role !== 'admin') {
        throw new MarginOverrideForbiddenError()
      }

      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)
      await assertPaymentAccount(tx, akunId)

      const [selectedMargin] = await tx
        .select({ persenMarginTahun: margin.persenMarginTahun, biayaAkad: margin.biayaAkad })
        .from(margin)
        .where(
          and(
            lte(margin.minNominal, data.jumlahPokok),
            or(isNull(margin.maxNominal), gte(margin.maxNominal, data.jumlahPokok)),
          ),
        )
        .orderBy(desc(margin.minNominal), desc(margin.id))
        .limit(1)
        .for('share')
      if (!selectedMargin) {
        throw new MarginPembiayaanNotFoundError()
      }
      const persenMarginTahun = data.persenMarginTahun ?? selectedMargin.persenMarginTahun
      const jumlahMargin = Math.round((data.jumlahPokok * persenMarginTahun * data.jangkaWaktuBulan) / (100 * 12))
      const biayaAkad = selectedMargin.biayaAkad

      const tanggalPengajuan = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'pembiayaan', tanggalPengajuan)
      const [created] = await tx
        .insert(pembiayaan)
        .values({
          kodeTransaksi,
          userId,
          akunId,
          jumlahPokok: data.jumlahPokok,
          persenMarginTahun,
          jumlahMargin,
          biayaAkad,
          jangkaWaktuBulan: data.jangkaWaktuBulan,
          tujuan,
          tanggalPengajuan,
          statusApproved: 'pending',
          createdBy: actorId,
        })
        .returning()
      if (!created) {
        throw new Error('Pengajuan pembiayaan gagal dibuat')
      }
      if (actor.role === 'admin') {
        await recordWakalahTransfer(tx, created, actorId)
      }
    })
  },

  async deletePembiayaan(actorId: number, ids: PembiayaanModel.Delete['Body']['ids']) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx.select({ id: user.id }).from(user).where(accessCondition)
      const deleted = await tx
        .delete(pembiayaan)
        .where(
          and(
            inArray(pembiayaan.id, ids),
            or(eq(pembiayaan.userId, actorId), eq(pembiayaan.createdBy, actorId)),
            inArray(pembiayaan.userId, accessibleUsers),
            eq(pembiayaan.statusApproved, 'pending'),
            isNull(pembiayaan.transferredAt),
          ),
        )
        .returning({
          id: pembiayaan.id,
          kodeTransaksi: pembiayaan.kodeTransaksi,
          tanggalTransaksi: pembiayaan.tanggalPengajuan,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))
      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new PembiayaanNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'pembiayaan', deleted)
    })
  },

  async transferPembiayaan(id: PembiayaanModel.ByIdTransferPatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(pembiayaan).where(eq(pembiayaan.id, id)).for('update')
      if (!target) {
        throw new PembiayaanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PembiayaanAlreadyProcessedError({ id })
      }
      if (target.transferredAt !== null) {
        throw new PembiayaanAlreadyTransferredError()
      }

      await recordWakalahTransfer(tx, target, adminId)
    })
  },

  async approvePembiayaan(id: PembiayaanModel.ByIdApprovePatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(pembiayaan).where(eq(pembiayaan.id, id)).for('update')
      if (!target) {
        throw new PembiayaanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PembiayaanAlreadyProcessedError({ id })
      }
      if (target.transferredAt === null) {
        throw new PembiayaanNotTransferredError()
      }

      const approvedAt = new Date()
      const tanggalPembiayaan = getJakartaDate(approvedAt)

      await assertMember(tx, target.userId)
      const requiredAccountIds = [
        AkunId.UANGMUKAPEMBELIAN,
        AkunId.PIUTANGMURABAHAH,
        ...(target.jumlahMargin > 0 ? [AkunId.PENDAPATANMURABAHAHDITANGGUHKAN] : []),
        ...(target.biayaAkad > 0 ? [target.akunId, AkunId.PENDAPATANADMINISTRASIAKAD] : []),
      ]
      await assertJournalAccounts(tx, requiredAccountIds)

      const [createdJournal] = await tx
        .insert(jurnal)
        .values({
          kodeTransaksi: target.kodeTransaksi,
          tanggalTransaksi: tanggalPembiayaan,
          keterangan: target.tujuan,
        })
        .returning({ id: jurnal.id })
      if (!createdJournal) {
        throw new Error('Jurnal gagal dibuat')
      }

      const details = [
        { akunId: AkunId.PIUTANGMURABAHAH, debit: target.jumlahPokok + target.jumlahMargin, kredit: 0 },
        { akunId: AkunId.UANGMUKAPEMBELIAN, debit: 0, kredit: target.jumlahPokok },
      ]
      if (target.jumlahMargin > 0) {
        details.push({ akunId: AkunId.PENDAPATANMURABAHAHDITANGGUHKAN, debit: 0, kredit: target.jumlahMargin })
      }
      if (target.biayaAkad > 0) {
        // Record the real-world akad fee receipt, without reducing principal or increasing the receivable.
        details.push(
          { akunId: target.akunId, debit: target.biayaAkad, kredit: 0 },
          { akunId: AkunId.PENDAPATANADMINISTRASIAKAD, debit: 0, kredit: target.biayaAkad },
        )
      }

      await tx
        .insert(jurnalDetail)
        .values(details.map((detail) => ({ ...detail, jurnalId: createdJournal.id, userId: target.userId })))
      await tx
        .update(pembiayaan)
        .set({
          tanggalPembiayaan,
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt,
        })
        .where(eq(pembiayaan.id, id))
    })
  },

  async rejectPembiayaan(
    id: PembiayaanModel.ByIdRejectPatch['Params']['id'],
    adminId: number,
    reason: PembiayaanModel.ByIdRejectPatch['Body']['alasanPenolakan'],
  ) {
    const alasanPenolakan = reason.trim()
    if (!alasanPenolakan) {
      throw new InvalidRejectionReasonError()
    }

    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ statusApproved: pembiayaan.statusApproved, transferredAt: pembiayaan.transferredAt })
        .from(pembiayaan)
        .where(eq(pembiayaan.id, id))
        .for('update')
      if (!target) {
        throw new PembiayaanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PembiayaanAlreadyProcessedError({ id })
      }
      if (target.transferredAt !== null) {
        throw new PembiayaanTransferredCancellationError()
      }

      await tx
        .update(pembiayaan)
        .set({ statusApproved: 'rejected', alasanPenolakan, approvedBy: adminId, approvedAt: new Date() })
        .where(eq(pembiayaan.id, id))
    })
  },
}
