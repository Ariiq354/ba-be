import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { Transaction } from '#/libs/database'

import { AkunId, HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { saham as hargaSaham } from '#/libs/database/schema/master'
import { mutasiSimpanan, saldoSimpanan } from '#/libs/database/schema/simpanan'
import { userProfile } from '#/libs/database/schema/users'
import { getJakartaDate } from '#/libs/date'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { calculateSahamAmounts } from '#/libs/saham'
import { getPendingSimpanan } from '#/libs/simpananBalance'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as SimpananModel from './model'

import { PemindahbukuanService } from '../pemindahbukuan/service'
import { PAYMENT_ACCOUNTS } from './constants'
import {
  HargaSahamNotFoundError,
  InsufficientBalanceError,
  InvalidAccountError,
  InvalidRejectionReasonError,
  MutasiSimpananAlreadyProcessedError,
  MutasiSimpananNotDeletedError,
  MutasiSimpananNotFoundError,
  NotMemberError,
} from './errors'

async function assertMember(connection: typeof db | Transaction, userId: number) {
  const [profile] = await connection
    .select({ noAnggota: userProfile.noAnggota })
    .from(userProfile)
    .where(eq(userProfile.idUser, userId))

  if (!profile?.noAnggota?.trim()) {
    throw new NotMemberError({ userId })
  }
}

const member = alias(user, 'member')
const creator = alias(user, 'creator')
const approver = alias(user, 'approver')

async function assertPaymentAccount(tx: Transaction, akunId: number) {
  const [paymentAccount] = await tx
    .select({ id: akun.id, isActive: akun.isActive })
    .from(akun)
    .where(eq(akun.id, akunId))
    .for('share')

  if (!paymentAccount?.isActive) {
    throw new InvalidAccountError({ akunId })
  }
}

export const SimpananService = {
  async getSaldo(actorId: number, userId: SimpananModel.SaldoGet['Query']['userId'] = actorId) {
    // Read balances and reservations from the same snapshot during approvals.
    return db.transaction(
      async (tx) => {
        await assertPenggunaAccess(tx, actorId, userId)

        const [result] = await tx
          .select({
            noAnggota: userProfile.noAnggota,
            saldoTabungan: saldoSimpanan.saldoTabungan,
            jumlahSaham: saldoSimpanan.jumlahSaham,
          })
          .from(userProfile)
          .leftJoin(saldoSimpanan, eq(saldoSimpanan.userId, userProfile.idUser))
          .where(eq(userProfile.idUser, userId))

        if (!result?.noAnggota?.trim()) {
          throw new NotMemberError({ userId })
        }

        const saldoTabungan = result.saldoTabungan ?? 0
        const jumlahSaham = result.jumlahSaham ?? 0
        const pending = await getPendingSimpanan(tx, userId)
        const totalPenarikanPending = pending.penarikan
        const totalPemindahbukuanPending = pending.pemindahbukuanTabungan
        const totalSahamPending = pending.pemindahbukuanSaham

        return {
          saldoTabungan,
          jumlahSaham,
          totalPenarikanPending,
          totalPemindahbukuanPending,
          totalSahamPending,
          saldoEfektif: Math.max(0, saldoTabungan - totalPenarikanPending - totalPemindahbukuanPending),
          jumlahSahamEfektif: Math.max(0, jumlahSaham - totalSahamPending),
        } satisfies SimpananModel.SaldoGet['Response'][200]
      },
      { isolationLevel: 'repeatable read' },
    )
  },

  async getMutasi(actorId: number, query: SimpananModel.MutasiGet['Query']) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)

    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []

    if (accessCondition !== undefined) {
      const accessibleUsers = db.select({ id: user.id }).from(user).where(accessCondition)

      conditions.push(inArray(mutasiSimpanan.userId, accessibleUsers))
    }

    if (query.userId !== undefined) {
      await assertPenggunaAccess(db, actorId, query.userId)
      conditions.push(eq(mutasiSimpanan.userId, query.userId))
    }

    if (query.status !== 'all') {
      conditions.push(eq(mutasiSimpanan.statusApproved, query.status))
    }

    if (query.jenisTransaksi !== 'all') {
      conditions.push(eq(mutasiSimpanan.jenisTransaksi, query.jenisTransaksi))
    }

    if (query.jenisSimpanan !== 'all') {
      conditions.push(eq(mutasiSimpanan.jenisSimpanan, query.jenisSimpanan))
    }

    if (query.search) {
      conditions.push(ilike(mutasiSimpanan.kodeTransaksi, `%${query.search}%`))
    }

    const qb = db
      .select({
        id: mutasiSimpanan.id,
        kodeTransaksi: mutasiSimpanan.kodeTransaksi,
        userId: mutasiSimpanan.userId,
        akunId: mutasiSimpanan.akunId,
        jenisSimpanan: mutasiSimpanan.jenisSimpanan,
        jenisTransaksi: mutasiSimpanan.jenisTransaksi,
        nilaiTransaksi: mutasiSimpanan.nilaiTransaksi,
        jumlahSaham: mutasiSimpanan.jumlahSaham,
        hargaPerSaham: mutasiSimpanan.hargaPerSaham,
        hargaNominalPerSaham: mutasiSimpanan.hargaNominalPerSaham,
        agioSaham: mutasiSimpanan.agioSaham,
        saldoSetelahTransaksi: mutasiSimpanan.saldoSetelahTransaksi,
        jumlahSahamSetelahTransaksi: mutasiSimpanan.jumlahSahamSetelahTransaksi,
        jurnalId: mutasiSimpanan.jurnalId,
        tanggalTransaksi: mutasiSimpanan.tanggalTransaksi,
        statusApproved: mutasiSimpanan.statusApproved,
        alasanPenolakan: mutasiSimpanan.alasanPenolakan,
        keterangan: mutasiSimpanan.keterangan,
        createdBy: mutasiSimpanan.createdBy,
        approvedBy: mutasiSimpanan.approvedBy,
        approvedAt: mutasiSimpanan.approvedAt,
        createdAt: mutasiSimpanan.createdAt,
        updatedAt: mutasiSimpanan.updatedAt,
        memberName: member.name,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(mutasiSimpanan)
      .innerJoin(member, eq(member.id, mutasiSimpanan.userId))
      .innerJoin(creator, eq(creator.id, mutasiSimpanan.createdBy))
      .leftJoin(approver, eq(approver.id, mutasiSimpanan.approvedBy))
      .where(and(...conditions))
      .orderBy(desc(mutasiSimpanan.createdAt), desc(mutasiSimpanan.id))

    const total = await db.$count(qb)
    const rows = await qb.limit(query.limit).offset((query.page - 1) * query.limit)
    const data: SimpananModel.MutasiGet['Response'][200]['data'] = rows.map(({ akunId, ...row }) => ({
      ...row,
      metodePembayaran: akunId === AkunId.KAS ? 'Tunai' : 'Transfer',
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data } satisfies SimpananModel.MutasiGet['Response'][200]
  },

  async createSetoranTabungan(actorId: number, data: SimpananModel.MutasiSetoranTabunganPost['Body']) {
    const userId = data.userId ?? actorId
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]

    await db.transaction(async (tx) => {
      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)
      await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
      await assertPaymentAccount(tx, akunId)

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(mutasiSimpanan).values({
        kodeTransaksi,
        userId,
        akunId,
        jenisSimpanan: 'tabungan',
        jenisTransaksi: 'setoran',
        nilaiTransaksi: data.nilaiTransaksi,
        tanggalTransaksi,
        statusApproved: 'pending',
        keterangan: data.keterangan?.trim() || null,
        createdBy: actorId,
      })
    })
  },

  async createSetoranSaham(actorId: number, data: SimpananModel.MutasiSetoranSahamPost['Body']) {
    const userId = data.userId ?? actorId

    if (data.metodePembayaran === 'Tabungan') {
      return PemindahbukuanService.createPemindahbukuan(actorId, {
        tipePemindahbukuan: 'tabungan_ke_saham',
        idUserSumber: userId,
        idUserTujuan: userId,
        jumlahSaham: data.jumlahSaham,
        keterangan: data.keterangan,
      })
    }

    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]

    await db.transaction(async (tx) => {
      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)
      await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
      await assertPaymentAccount(tx, akunId)

      const [latestPrice] = await tx
        .select({ hargaJual: hargaSaham.hargaJual })
        .from(hargaSaham)
        .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))
        .limit(1)

      if (!latestPrice) {
        throw new HargaSahamNotFoundError()
      }

      const jumlahSaham = data.jumlahSaham
      const hargaPerSaham = latestPrice.hargaJual
      const hargaNominalPerSaham = HARGA_NOMINAL_SAHAM
      const { nilaiTransaksi, agioSaham } = calculateSahamAmounts(jumlahSaham, hargaPerSaham, hargaNominalPerSaham)
      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(mutasiSimpanan).values({
        kodeTransaksi,
        userId,
        akunId,
        jenisSimpanan: 'saham',
        jenisTransaksi: 'setoran',
        nilaiTransaksi,
        jumlahSaham,
        hargaPerSaham,
        hargaNominalPerSaham,
        agioSaham,
        saldoSetelahTransaksi: null,
        jumlahSahamSetelahTransaksi: null,
        tanggalTransaksi,
        statusApproved: 'pending',
        keterangan: data.keterangan?.trim() || null,
        createdBy: actorId,
      })
    })
  },

  async createPenarikan(actorId: number, data: SimpananModel.MutasiPenarikanPost['Body']) {
    const userId = data.userId ?? actorId
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]

    await db.transaction(async (tx) => {
      const nilaiTransaksi = data.nilaiTransaksi

      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)

      await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
      const [balance] = await tx
        .select({ saldoTabungan: saldoSimpanan.saldoTabungan })
        .from(saldoSimpanan)
        .where(eq(saldoSimpanan.userId, userId))
        .for('update')

      await assertPaymentAccount(tx, akunId)

      const pending = await getPendingSimpanan(tx, userId)
      const available = (balance?.saldoTabungan ?? 0) - pending.penarikan - pending.pemindahbukuanTabungan

      if (available < nilaiTransaksi) {
        throw new InsufficientBalanceError()
      }

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(mutasiSimpanan).values({
        kodeTransaksi,
        userId,
        akunId,
        jenisSimpanan: 'tabungan',
        jenisTransaksi: 'penarikan',
        nilaiTransaksi,
        jumlahSaham: 0,
        hargaPerSaham: 0,
        hargaNominalPerSaham: 0,
        agioSaham: 0,
        saldoSetelahTransaksi: null,
        jumlahSahamSetelahTransaksi: null,
        tanggalTransaksi,
        statusApproved: 'pending',
        keterangan: data.keterangan?.trim() || null,
        createdBy: actorId,
      })
    })
  },

  async deleteMutasi(actorId: number, ids: SimpananModel.MutasiDelete['Body']['ids']) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx.select({ id: user.id }).from(user).where(accessCondition)

      const deleted = await tx
        .delete(mutasiSimpanan)
        .where(
          and(
            inArray(mutasiSimpanan.id, ids),
            or(eq(mutasiSimpanan.userId, actorId), eq(mutasiSimpanan.createdBy, actorId)),
            inArray(mutasiSimpanan.userId, accessibleUsers),
            eq(mutasiSimpanan.statusApproved, 'pending'),
          ),
        )
        .returning({
          id: mutasiSimpanan.id,
          kodeTransaksi: mutasiSimpanan.kodeTransaksi,
          tanggalTransaksi: mutasiSimpanan.tanggalTransaksi,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))

      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new MutasiSimpananNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'simpanan', deleted)
    })
  },

  async approveMutasi(id: SimpananModel.MutasiByIdApprovePatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(mutasiSimpanan).where(eq(mutasiSimpanan.id, id)).for('update')

      if (!target) {
        throw new MutasiSimpananNotFoundError({ id })
      }

      if (target.statusApproved !== 'pending') {
        throw new MutasiSimpananAlreadyProcessedError({ id })
      }

      await tx.insert(saldoSimpanan).values({ userId: target.userId }).onConflictDoNothing()
      const [balance] = await tx
        .select({
          saldoTabungan: saldoSimpanan.saldoTabungan,
          jumlahSaham: saldoSimpanan.jumlahSaham,
        })
        .from(saldoSimpanan)
        .where(eq(saldoSimpanan.userId, target.userId))
        .for('update')

      let saldoSetelahTransaksi: number | null = null
      let jumlahSahamSetelahTransaksi: number | null = null

      if (target.jenisSimpanan === 'tabungan') {
        let nextSaldo: number

        if (target.jenisTransaksi === 'penarikan') {
          const otherPending = await getPendingSimpanan(tx, target.userId, { mutasiId: target.id })
          const available = (balance?.saldoTabungan ?? 0) - otherPending.penarikan - otherPending.pemindahbukuanTabungan

          if (available < target.nilaiTransaksi) {
            throw new InsufficientBalanceError()
          }

          nextSaldo = (balance?.saldoTabungan ?? 0) - target.nilaiTransaksi
        } else {
          nextSaldo = (balance?.saldoTabungan ?? 0) + target.nilaiTransaksi
        }
        saldoSetelahTransaksi = nextSaldo

        await tx.update(saldoSimpanan).set({ saldoTabungan: nextSaldo }).where(eq(saldoSimpanan.userId, target.userId))
      } else {
        const nextJumlahSaham = (balance?.jumlahSaham ?? 0) + target.jumlahSaham
        jumlahSahamSetelahTransaksi = nextJumlahSaham

        await tx
          .update(saldoSimpanan)
          .set({ jumlahSaham: nextJumlahSaham })
          .where(eq(saldoSimpanan.userId, target.userId))
      }

      const tanggalJurnal = target.tanggalTransaksi
      const kodeJurnal = await allocateTransactionCode(tx, 'jurnal', tanggalJurnal)

      const requiredAccountIds =
        target.jenisSimpanan === 'tabungan'
          ? [target.akunId, AkunId.SIMPANANBERJANGKA]
          : [
              target.akunId,
              AkunId.SAHAM50,
              ...(target.hargaPerSaham === target.hargaNominalPerSaham ? [] : [AkunId.AGIOSAHAM]),
            ]
      const availableAccounts = await tx
        .select({ id: akun.id, isActive: akun.isActive })
        .from(akun)
        .where(inArray(akun.id, requiredAccountIds))
        .for('share')
      const availableAccountsById = new Map(availableAccounts.map((item) => [item.id, item]))
      const invalidAccountId = requiredAccountIds.find((akunId) => !availableAccountsById.get(akunId)?.isActive)

      if (invalidAccountId !== undefined) {
        throw new InvalidAccountError({
          akunId: invalidAccountId,
          message: 'Akun jurnal yang diperlukan tidak tersedia',
        })
      }

      const [createdJournal] = await tx
        .insert(jurnal)
        .values({
          kodeTransaksi: kodeJurnal,
          tanggalTransaksi: tanggalJurnal,
          keterangan: target.keterangan,
        })
        .returning({ id: jurnal.id })

      if (!createdJournal) {
        throw new Error('Jurnal gagal dibuat')
      }

      if (target.jenisSimpanan === 'tabungan') {
        const isSetoran = target.jenisTransaksi === 'setoran'

        await tx.insert(jurnalDetail).values([
          {
            jurnalId: createdJournal.id,
            akunId: target.akunId,
            userId: target.userId,
            debit: isSetoran ? target.nilaiTransaksi : 0,
            kredit: isSetoran ? 0 : target.nilaiTransaksi,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.SIMPANANBERJANGKA,
            userId: target.userId,
            debit: isSetoran ? 0 : target.nilaiTransaksi,
            kredit: isSetoran ? target.nilaiTransaksi : 0,
          },
        ])
      } else {
        const amounts = calculateSahamAmounts(target.jumlahSaham, target.hargaPerSaham, target.hargaNominalPerSaham)
        const nominalTotal = amounts.nilaiNominal
        const details = [
          {
            jurnalId: createdJournal.id,
            akunId: target.akunId,
            userId: target.userId,
            debit: target.nilaiTransaksi,
            kredit: 0,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.SAHAM50,
            userId: target.userId,
            debit: 0,
            kredit: nominalTotal,
          },
        ]

        if (target.hargaPerSaham > target.hargaNominalPerSaham) {
          details.push({
            jurnalId: createdJournal.id,
            akunId: AkunId.AGIOSAHAM,
            userId: target.userId,
            debit: 0,
            kredit: target.agioSaham,
          })
        } else if (target.hargaPerSaham < target.hargaNominalPerSaham) {
          details.push({
            jurnalId: createdJournal.id,
            akunId: AkunId.AGIOSAHAM,
            userId: target.userId,
            debit: target.agioSaham,
            kredit: 0,
          })
        }

        await tx.insert(jurnalDetail).values(details)
      }

      await tx
        .update(mutasiSimpanan)
        .set({
          jurnalId: createdJournal.id,
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt: new Date(),
          saldoSetelahTransaksi,
          jumlahSahamSetelahTransaksi,
        })
        .where(eq(mutasiSimpanan.id, id))
    })
  },

  async rejectMutasi(
    id: SimpananModel.MutasiByIdRejectPatch['Params']['id'],
    adminId: number,
    reason: SimpananModel.MutasiByIdRejectPatch['Body']['alasanPenolakan'],
  ) {
    const rejectionReason = reason.trim()

    if (!rejectionReason) {
      return new InvalidRejectionReasonError()
    }

    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ statusApproved: mutasiSimpanan.statusApproved })
        .from(mutasiSimpanan)
        .where(eq(mutasiSimpanan.id, id))
        .for('update')

      if (!target) {
        throw new MutasiSimpananNotFoundError({ id })
      }

      if (target.statusApproved !== 'pending') {
        throw new MutasiSimpananAlreadyProcessedError({ id })
      }

      await tx
        .update(mutasiSimpanan)
        .set({
          statusApproved: 'rejected',
          alasanPenolakan: rejectionReason,
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(mutasiSimpanan.id, id))
    })
  },
}
