import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'

import { AkunId } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { angsuran, pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as AngsuranModel from './model'

import { PembiayaanNotFoundError } from '../pembiayaan/errors'
import { PAYMENT_ACCOUNTS } from '../simpanan/constants'
import { InvalidAccountError, InvalidRejectionReasonError } from '../simpanan/errors'
import { approver, assertMember, assertPaymentAccount, creator, member } from '../simpanan/utils'
import {
  AngsuranAlreadyProcessedError,
  AngsuranExceedsRemainingError,
  AngsuranNotDeletedError,
  AngsuranNotFoundError,
  PembiayaanNotApprovedError,
} from './errors'
import { getApprovedTotals, roundProportion } from './utils'

export const AngsuranService = {
  async getPendingCount() {
    const total = await db.$count(angsuran, eq(angsuran.statusApproved, 'pending'))
    return { total } satisfies AngsuranModel.PendingCountGet['Response'][200]
  },

  async getAngsuran(actorId: number, query: AngsuranModel.Get['Query']) {
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
    if (query.pembiayaanId !== undefined) {
      conditions.push(eq(angsuran.pembiayaanId, query.pembiayaanId))
    }
    if (query.status !== 'all') {
      conditions.push(eq(angsuran.statusApproved, query.status))
    }
    if (query.search) {
      conditions.push(ilike(angsuran.kodeTransaksi, `%${query.search}%`))
    }

    const qb = db
      .select({
        id: angsuran.id,
        kodePembiayaan: pembiayaan.kodeTransaksi,
        userId: pembiayaan.userId,
        kodeTransaksi: angsuran.kodeTransaksi,
        tanggalTransaksi: angsuran.tanggalTransaksi,
        jumlahPembayaran: angsuran.jumlahPembayaran,
        akunId: angsuran.akunId,
        statusApproved: angsuran.statusApproved,
        alasanPenolakan: angsuran.alasanPenolakan,
        keterangan: angsuran.keterangan,
        createdBy: angsuran.createdBy,
        approvedAt: angsuran.approvedAt,
        createdAt: angsuran.createdAt,
        memberName: member.name,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(angsuran)
      .innerJoin(pembiayaan, eq(pembiayaan.id, angsuran.pembiayaanId))
      .innerJoin(member, eq(member.id, pembiayaan.userId))
      .innerJoin(creator, eq(creator.id, angsuran.createdBy))
      .leftJoin(approver, eq(approver.id, angsuran.approvedBy))
      .where(and(...conditions))
      .orderBy(desc(eq(angsuran.statusApproved, 'pending')), desc(angsuran.createdAt), desc(angsuran.id))

    const total = await db.$count(
      db
        .select({ id: angsuran.id })
        .from(angsuran)
        .innerJoin(pembiayaan, eq(pembiayaan.id, angsuran.pembiayaanId))
        .where(and(...conditions)),
    )
    const rows = await qb.limit(query.limit).offset((query.page - 1) * query.limit)
    const data: AngsuranModel.Get['Response'][200]['data'] = rows.map(({ akunId, ...row }) => ({
      ...row,
      metodePembayaran: akunId === AkunId.KAS ? 'Tunai' : 'Transfer',
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }))

    return { total, data } satisfies AngsuranModel.Get['Response'][200]
  },

  async createAngsuran(actorId: number, data: AngsuranModel.Post['Body']) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(pembiayaan).where(eq(pembiayaan.id, data.pembiayaanId)).for('update')
      if (!target) {
        throw new PembiayaanNotFoundError({ id: data.pembiayaanId })
      }
      await assertPenggunaAccess(tx, actorId, target.userId)
      await assertMember(tx, target.userId)
      if (target.statusApproved !== 'approved') {
        throw new PembiayaanNotApprovedError()
      }

      const { totalPembayaran } = await getApprovedTotals(tx, target.id)
      if (data.jumlahPembayaran > target.jumlahPokok + target.jumlahMargin - totalPembayaran) {
        throw new AngsuranExceedsRemainingError()
      }

      const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]
      await assertPaymentAccount(tx, akunId)
      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'angsuran', tanggalTransaksi)
      await tx.insert(angsuran).values({
        pembiayaanId: target.id,
        kodeTransaksi,
        tanggalTransaksi,
        jumlahPembayaran: data.jumlahPembayaran,
        akunId,
        statusApproved: 'pending',
        keterangan: data.keterangan?.trim() || null,
        createdBy: actorId,
      })
    })
  },

  async deleteAngsuran(actorId: number, ids: AngsuranModel.Delete['Body']['ids']) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx.select({ id: user.id }).from(user).where(accessCondition)
      const accessiblePembiayaan = tx
        .select({ id: pembiayaan.id })
        .from(pembiayaan)
        .where(inArray(pembiayaan.userId, accessibleUsers))
      const ownPembiayaan = tx.select({ id: pembiayaan.id }).from(pembiayaan).where(eq(pembiayaan.userId, actorId))

      const deleted = await tx
        .delete(angsuran)
        .where(
          and(
            inArray(angsuran.id, ids),
            inArray(angsuran.pembiayaanId, accessiblePembiayaan),
            or(inArray(angsuran.pembiayaanId, ownPembiayaan), eq(angsuran.createdBy, actorId)),
            eq(angsuran.statusApproved, 'pending'),
          ),
        )
        .returning({
          id: angsuran.id,
          kodeTransaksi: angsuran.kodeTransaksi,
          tanggalTransaksi: angsuran.tanggalTransaksi,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))
      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new AngsuranNotDeletedError({ ids: invalidIds })
      }
      await retainTransactionCodes(tx, 'angsuran', deleted)
    })
  },

  async approveAngsuran(id: AngsuranModel.ByIdApprovePatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [reference] = await tx
        .select({ pembiayaanId: angsuran.pembiayaanId })
        .from(angsuran)
        .where(eq(angsuran.id, id))
      if (!reference) {
        throw new AngsuranNotFoundError({ id })
      }

      // Always lock the financing before its installment, serializing approvals for the same receivable.
      const [targetPembiayaan] = await tx
        .select()
        .from(pembiayaan)
        .where(eq(pembiayaan.id, reference.pembiayaanId))
        .for('update')
      if (!targetPembiayaan) {
        throw new PembiayaanNotFoundError({ id: reference.pembiayaanId })
      }
      const [target] = await tx
        .select()
        .from(angsuran)
        .where(and(eq(angsuran.id, id), eq(angsuran.pembiayaanId, targetPembiayaan.id)))
        .for('update')
      if (!target) {
        throw new AngsuranNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new AngsuranAlreadyProcessedError({ id })
      }
      if (targetPembiayaan.statusApproved !== 'approved') {
        throw new PembiayaanNotApprovedError()
      }
      await assertMember(tx, targetPembiayaan.userId)

      const { totalPembayaran, totalMargin } = await getApprovedTotals(tx, targetPembiayaan.id)
      const totalTagihan = targetPembiayaan.jumlahPokok + targetPembiayaan.jumlahMargin
      if (target.jumlahPembayaran > totalTagihan - totalPembayaran) {
        throw new AngsuranExceedsRemainingError()
      }
      // Allocate the difference in cumulative margin so arbitrary payments settle both balances exactly.
      const jumlahMargin =
        roundProportion(totalPembayaran + target.jumlahPembayaran, targetPembiayaan.jumlahMargin, totalTagihan) -
        totalMargin
      const requiredAccountIds = [
        target.akunId,
        AkunId.PIUTANGMURABAHAH,
        ...(jumlahMargin > 0 ? [AkunId.PENDAPATANMURABAHAHDITANGGUHKAN, AkunId.PENDAPATANMURABAHAH] : []),
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
          tanggalTransaksi: target.tanggalTransaksi,
          keterangan: target.keterangan,
        })
        .returning({ id: jurnal.id })
      if (!createdJournal) {
        throw new Error('Jurnal gagal dibuat')
      }
      const details = [
        { akunId: target.akunId, debit: target.jumlahPembayaran, kredit: 0 },
        { akunId: AkunId.PIUTANGMURABAHAH, debit: 0, kredit: target.jumlahPembayaran },
      ]
      if (jumlahMargin > 0) {
        details.push(
          { akunId: AkunId.PENDAPATANMURABAHAHDITANGGUHKAN, debit: jumlahMargin, kredit: 0 },
          { akunId: AkunId.PENDAPATANMURABAHAH, debit: 0, kredit: jumlahMargin },
        )
      }
      await tx.insert(jurnalDetail).values(
        details.map((detail) => ({
          ...detail,
          jurnalId: createdJournal.id,
          userId: targetPembiayaan.userId,
        })),
      )
      await tx
        .update(angsuran)
        .set({
          jumlahMargin,
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(angsuran.id, id))
    })
  },

  async rejectAngsuran(
    id: AngsuranModel.ByIdRejectPatch['Params']['id'],
    adminId: number,
    reason: AngsuranModel.ByIdRejectPatch['Body']['alasanPenolakan'],
  ) {
    const alasanPenolakan = reason.trim()
    if (!alasanPenolakan) {
      throw new InvalidRejectionReasonError()
    }

    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ statusApproved: angsuran.statusApproved })
        .from(angsuran)
        .where(eq(angsuran.id, id))
        .for('update')
      if (!target) {
        throw new AngsuranNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new AngsuranAlreadyProcessedError({ id })
      }
      await tx
        .update(angsuran)
        .set({ statusApproved: 'rejected', alasanPenolakan, approvedBy: adminId, approvedAt: new Date() })
        .where(eq(angsuran.id, id))
    })
  },
}
