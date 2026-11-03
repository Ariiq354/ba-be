import { and, desc, eq, gte, ilike, inArray, isNull, lte, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { margin } from '#/libs/database/schema/master'
import { pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'
import { ItemNotFoundError } from '#/libs/errors'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as PembiayaanModel from './model'

import { PAYMENT_ACCOUNTS } from '../simpanan/constants'
import { InvalidAccountError, InvalidRejectionReasonError } from '../simpanan/errors'
import { assertMember, assertPaymentAccount } from '../simpanan/utils'
import {
  InvalidPembiayaanError,
  MarginOverrideForbiddenError,
  MarginPembiayaanNotFoundError,
  PembiayaanAlreadyProcessedError,
  PembiayaanNotDeletedError,
  PembiayaanNotFoundError,
} from './errors'

const member = alias(user, 'member')
const creator = alias(user, 'creator')
const approver = alias(user, 'approver')

export const PembiayaanService = {
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
        tanggalPembiayaan: pembiayaan.tanggalPembiayaan,
        jurnalId: pembiayaan.jurnalId,
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
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data } satisfies PembiayaanModel.Get['Response'][200]
  },

  async createPembiayaan(actorId: number, data: PembiayaanModel.Post['Body']) {
    const userId = data.userId ?? actorId
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]
    const tujuan = data.tujuan.trim()
    if (!tujuan) {
      throw new InvalidPembiayaanError('Tujuan pembiayaan wajib diisi')
    }

    await db.transaction(async (tx) => {
      if (data.persenMarginTahun !== undefined) {
        const [actor] = await tx.select({ role: user.role }).from(user).where(eq(user.id, actorId)).for('share')
        if (!actor) {
          throw new ItemNotFoundError({ id: actorId, message: 'Pengguna tidak ditemukan' })
        }
        if (actor.role !== 'admin') {
          throw new MarginOverrideForbiddenError()
        }
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

      const tanggalPembiayaan = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'pembiayaan', tanggalPembiayaan)
      await tx.insert(pembiayaan).values({
        kodeTransaksi,
        userId,
        akunId,
        jumlahPokok: data.jumlahPokok,
        persenMarginTahun,
        jumlahMargin,
        biayaAkad,
        jangkaWaktuBulan: data.jangkaWaktuBulan,
        tujuan,
        tanggalPembiayaan,
        statusApproved: 'pending',
        createdBy: actorId,
      })
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
          ),
        )
        .returning({
          id: pembiayaan.id,
          kodeTransaksi: pembiayaan.kodeTransaksi,
          tanggalTransaksi: pembiayaan.tanggalPembiayaan,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))
      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new PembiayaanNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'pembiayaan', deleted)
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

      await assertMember(tx, target.userId)
      const requiredAccountIds = [
        target.akunId,
        AkunId.PIUTANGMURABAHAH,
        ...(target.jumlahMargin > 0 ? [AkunId.PENDAPATANMURABAHAHDITANGGUHKAN] : []),
        ...(target.biayaAkad > 0 ? [AkunId.PENDAPATANADMINISTRASIAKAD] : []),
      ]
      const accounts = await tx
        .select({ id: akun.id, isActive: akun.isActive })
        .from(akun)
        .where(inArray(akun.id, requiredAccountIds))
        .orderBy(akun.id)
        .for('share')
      const accountsById = new Map(accounts.map((account) => [account.id, account]))

      for (const requiredAccountId of requiredAccountIds) {
        if (!accountsById.get(requiredAccountId)?.isActive) {
          throw new InvalidAccountError({
            akunId: requiredAccountId,
            message: 'Akun jurnal yang diperlukan tidak tersedia',
          })
        }
      }

      const [createdJournal] = await tx
        .insert(jurnal)
        .values({
          kodeTransaksi: target.kodeTransaksi,
          tanggalTransaksi: target.tanggalPembiayaan,
          keterangan: `Pembiayaan ${target.kodeTransaksi}: ${target.tujuan}`,
        })
        .returning({ id: jurnal.id })
      if (!createdJournal) {
        throw new Error('Jurnal gagal dibuat')
      }

      const details = [
        { akunId: AkunId.PIUTANGMURABAHAH, debit: target.jumlahPokok + target.jumlahMargin, kredit: 0 },
        { akunId: target.akunId, debit: 0, kredit: target.jumlahPokok },
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
          jurnalId: createdJournal.id,
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt: new Date(),
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
        .select({ statusApproved: pembiayaan.statusApproved })
        .from(pembiayaan)
        .where(eq(pembiayaan.id, id))
        .for('update')
      if (!target) {
        throw new PembiayaanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PembiayaanAlreadyProcessedError({ id })
      }

      await tx
        .update(pembiayaan)
        .set({ statusApproved: 'rejected', alasanPenolakan, approvedBy: adminId, approvedAt: new Date() })
        .where(eq(pembiayaan.id, id))
    })
  },
}
