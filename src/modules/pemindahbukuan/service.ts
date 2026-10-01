import type { PemindahbukuanModel } from './model'
import { and, asc, desc, eq, ilike, inArray, or } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/database'
import { akun } from '#/database/schema/akun'
import { user } from '#/database/schema/auth'
import { jurnal, jurnalDetail } from '#/database/schema/jurnal'
import { saham as hargaSaham } from '#/database/schema/master'
import { pemindahbukuan, saldoSimpanan } from '#/database/schema/simpanan'
import { userProfile } from '#/database/schema/users'
import { AkunId } from '#/utils/akunId'
import { assertInputInteger, toPostgresInteger } from '#/utils/amount'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/utils/penggunaAccess'
import { calculateSahamAmounts, HARGA_NOMINAL_SAHAM } from '#/utils/saham'
import { getPendingSimpanan } from '#/utils/simpananBalance'
import { allocateTransactionCode, getJakartaDate, retainTransactionCodes } from '#/utils/transaction'
import {
  HargaSahamNotFoundError,
  InsufficientBalanceError,
  InvalidAccountError,
  InvalidRejectionReasonError,
  NotMemberError,
} from '../simpanan/errors'
import {
  InsufficientSharesError,
  InvalidConversionDestinationError,
  InvalidTransferDestinationError,
  PemindahbukuanAlreadyProcessedError,
  PemindahbukuanNotDeletedError,
  PemindahbukuanNotFoundError,
} from './errors'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Transfer = typeof pemindahbukuan.$inferSelect

const sourceMember = alias(user, 'source_member')
const destinationMember = alias(user, 'destination_member')
const creator = alias(user, 'creator')
const approver = alias(user, 'approver')
const sourceAccount = alias(akun, 'source_account')
const destinationAccount = alias(akun, 'destination_account')

function assertTransferDestination(target: Pick<Transfer, 'idUserSumber' | 'idUserTujuan' | 'tipePemindahbukuan'>) {
  const sameMember = target.idUserSumber === target.idUserTujuan
  if (target.tipePemindahbukuan === 'tabungan_ke_saham') {
    if (!sameMember) {
      throw new InvalidConversionDestinationError()
    }
  }
  else if (sameMember) {
    throw new InvalidTransferDestinationError()
  }
}

async function assertMember(connection: typeof db | Transaction, userId: number) {
  const [profile] = await connection
    .select({ noAnggota: userProfile.noAnggota })
    .from(userProfile)
    .where(eq(userProfile.idUser, userId))
    .for('share')

  if (!profile?.noAnggota?.trim()) {
    throw new NotMemberError({ userId })
  }
}

async function assertAccounts(tx: Transaction, accountIds: number[]) {
  const ids = [...new Set(accountIds)].sort((a, b) => a - b)
  const accounts = await tx
    .select({ id: akun.id, isActive: akun.isActive })
    .from(akun)
    .where(inArray(akun.id, ids))
    .orderBy(asc(akun.id))
    .for('share')
  const accountsById = new Map(accounts.map(account => [account.id, account]))
  const invalidId = ids.find(id => !accountsById.get(id)?.isActive)

  if (invalidId !== undefined) {
    throw new InvalidAccountError({
      akunId: invalidId,
      message: 'Akun jurnal yang diperlukan tidak tersedia',
    })
  }
}

async function lockBalances(tx: Transaction, userIds: number[]) {
  // Consistent ordering also covers opposite-direction transfers and new balances.
  const ids = [...new Set(userIds)].sort((a, b) => a - b)
  for (const userId of ids) {
    await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
  }

  const balances = await tx
    .select()
    .from(saldoSimpanan)
    .where(inArray(saldoSimpanan.userId, ids))
    .orderBy(asc(saldoSimpanan.userId))
    .for('update')

  return new Map(balances.map(balance => [balance.userId, balance]))
}

async function assertAvailableBalance(
  tx: Transaction,
  target: Pick<Transfer, 'idUserSumber' | 'tipePemindahbukuan' | 'nominal' | 'jumlahSaham'>,
  balance: typeof saldoSimpanan.$inferSelect,
  excludeId?: number,
) {
  const pending = await getPendingSimpanan(tx, target.idUserSumber, { pemindahbukuanId: excludeId })

  if (target.tipePemindahbukuan === 'saham_ke_saham') {
    const available = BigInt(balance.jumlahSaham) - pending.pemindahbukuanSaham
    if (available < BigInt(target.jumlahSaham)) {
      throw new InsufficientSharesError()
    }
  }
  else {
    const available = BigInt(balance.saldoTabungan)
      - pending.penarikan - pending.pemindahbukuanTabungan
    if (available < BigInt(target.nominal)) {
      throw new InsufficientBalanceError()
    }
  }
}

function getRequiredAccountIds(target: Pick<Transfer, 'akunIdSumber' | 'akunIdTujuan' | 'tipePemindahbukuan' | 'agioSaham'>) {
  return [
    target.akunIdSumber,
    target.akunIdTujuan,
    ...(target.tipePemindahbukuan === 'tabungan_ke_saham' && target.agioSaham > 0
      ? [AkunId.AGIOSAHAM]
      : []),
  ]
}

export const PemindahbukuanService = {
  async getPemindahbukuan(
    actorId: number,
    query: PemindahbukuanModel['getPemindahbukuanQuerySchema'],
  ) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)
    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []
    if (accessCondition !== undefined) {
      const accessibleUsers = db.select({ id: user.id }).from(user).where(accessCondition)
      conditions.push(or(
        inArray(pemindahbukuan.idUserSumber, accessibleUsers),
        inArray(pemindahbukuan.idUserTujuan, accessibleUsers),
      ))
    }

    if (query.userId !== undefined) {
      await assertPenggunaAccess(db, actorId, query.userId)
      conditions.push(or(
        eq(pemindahbukuan.idUserSumber, query.userId),
        eq(pemindahbukuan.idUserTujuan, query.userId),
      ))
    }

    if (query.status !== 'all') {
      conditions.push(eq(pemindahbukuan.statusApproved, query.status))
    }
    if (query.tipePemindahbukuan !== 'all') {
      conditions.push(eq(pemindahbukuan.tipePemindahbukuan, query.tipePemindahbukuan))
    }
    if (query.search) {
      conditions.push(ilike(pemindahbukuan.kodeTransaksi, `%${query.search}%`))
    }

    const qb = db
      .select({
        id: pemindahbukuan.id,
        kodeTransaksi: pemindahbukuan.kodeTransaksi,
        idUserSumber: pemindahbukuan.idUserSumber,
        akunIdSumber: pemindahbukuan.akunIdSumber,
        idUserTujuan: pemindahbukuan.idUserTujuan,
        akunIdTujuan: pemindahbukuan.akunIdTujuan,
        nominal: pemindahbukuan.nominal,
        jumlahSaham: pemindahbukuan.jumlahSaham,
        hargaPerSaham: pemindahbukuan.hargaPerSaham,
        hargaNominalPerSaham: pemindahbukuan.hargaNominalPerSaham,
        agioSaham: pemindahbukuan.agioSaham,
        jurnalId: pemindahbukuan.jurnalId,
        tipePemindahbukuan: pemindahbukuan.tipePemindahbukuan,
        tanggalTransaksi: pemindahbukuan.tanggalTransaksi,
        statusApproved: pemindahbukuan.statusApproved,
        alasanPenolakan: pemindahbukuan.alasanPenolakan,
        keterangan: pemindahbukuan.keterangan,
        createdBy: pemindahbukuan.createdBy,
        approvedBy: pemindahbukuan.approvedBy,
        approvedAt: pemindahbukuan.approvedAt,
        createdAt: pemindahbukuan.createdAt,
        updatedAt: pemindahbukuan.updatedAt,
        sourceMemberName: sourceMember.name,
        destinationMemberName: destinationMember.name,
        sourceAccountName: sourceAccount.namaAkun,
        destinationAccountName: destinationAccount.namaAkun,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(pemindahbukuan)
      .innerJoin(sourceMember, eq(sourceMember.id, pemindahbukuan.idUserSumber))
      .innerJoin(destinationMember, eq(destinationMember.id, pemindahbukuan.idUserTujuan))
      .innerJoin(sourceAccount, eq(sourceAccount.id, pemindahbukuan.akunIdSumber))
      .innerJoin(destinationAccount, eq(destinationAccount.id, pemindahbukuan.akunIdTujuan))
      .innerJoin(creator, eq(creator.id, pemindahbukuan.createdBy))
      .leftJoin(approver, eq(approver.id, pemindahbukuan.approvedBy))
      .where(and(...conditions))
      .orderBy(desc(pemindahbukuan.createdAt), desc(pemindahbukuan.id))

    const total = await db.$count(qb)
    const rows = await qb.limit(query.limit).offset((query.page - 1) * query.limit)
    const data = rows.map(row => ({
      ...row,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data }
  },

  async createPemindahbukuan(
    actorId: number,
    data: PemindahbukuanModel['createPemindahbukuanSchema'],
  ) {
    const idUserSumber = data.idUserSumber ?? actorId
    assertTransferDestination({ ...data, idUserSumber })

    await db.transaction(async (tx) => {
      await assertPenggunaAccess(tx, actorId, idUserSumber)
      for (const userId of [...new Set([idUserSumber, data.idUserTujuan])].sort((a, b) => a - b)) {
        await assertMember(tx, userId)
      }

      const balances = await lockBalances(tx, [idUserSumber])
      const balance = balances.get(idUserSumber)!
      let nominal: number
      let jumlahSaham = 0
      let hargaPerSaham = 0
      let hargaNominalPerSaham = 0
      let agioSaham = 0

      if (data.tipePemindahbukuan === 'tabungan_ke_tabungan') {
        nominal = assertInputInteger(data.nominal)
      }
      else {
        jumlahSaham = assertInputInteger(data.jumlahSaham)
        hargaNominalPerSaham = HARGA_NOMINAL_SAHAM
        hargaPerSaham = HARGA_NOMINAL_SAHAM

        if (data.tipePemindahbukuan === 'tabungan_ke_saham') {
          const [latestPrice] = await tx
            .select({ hargaJual: hargaSaham.hargaJual })
            .from(hargaSaham)
            .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))
            .limit(1)

          if (!latestPrice) {
            throw new HargaSahamNotFoundError()
          }
          hargaPerSaham = assertInputInteger(latestPrice.hargaJual)
        }

        const amounts = calculateSahamAmounts(jumlahSaham, hargaPerSaham, hargaNominalPerSaham)
        nominal = toPostgresInteger(amounts.nilaiTransaksi)
        toPostgresInteger(amounts.nilaiNominal)
        agioSaham = toPostgresInteger(amounts.agioSaham)
      }

      const target = {
        idUserSumber,
        idUserTujuan: data.idUserTujuan,
        akunIdSumber: data.tipePemindahbukuan === 'saham_ke_saham' ? AkunId.SAHAM50 : AkunId.SIMPANANBERJANGKA,
        akunIdTujuan: data.tipePemindahbukuan === 'tabungan_ke_tabungan' ? AkunId.SIMPANANBERJANGKA : AkunId.SAHAM50,
        tipePemindahbukuan: data.tipePemindahbukuan,
        nominal,
        jumlahSaham,
        hargaPerSaham,
        hargaNominalPerSaham,
        agioSaham,
      }

      await assertAccounts(tx, getRequiredAccountIds(target))
      await assertAvailableBalance(tx, target, balance)

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'pemindahbukuan', tanggalTransaksi)
      await tx.insert(pemindahbukuan).values({
        ...target,
        kodeTransaksi,
        tanggalTransaksi,
        statusApproved: 'pending',
        keterangan: data.keterangan?.trim() || null,
        createdBy: actorId,
      })
    })
  },

  async deletePemindahbukuan(actorId: number, ids: number[]) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx.select({ id: user.id }).from(user).where(accessCondition)
      const deleted = await tx
        .delete(pemindahbukuan)
        .where(and(
          inArray(pemindahbukuan.id, ids),
          or(eq(pemindahbukuan.idUserSumber, actorId), eq(pemindahbukuan.createdBy, actorId)),
          inArray(pemindahbukuan.idUserSumber, accessibleUsers),
          eq(pemindahbukuan.statusApproved, 'pending'),
        ))
        .returning({
          id: pemindahbukuan.id,
          kodeTransaksi: pemindahbukuan.kodeTransaksi,
          tanggalTransaksi: pemindahbukuan.tanggalTransaksi,
        })

      const deletedIds = new Set(deleted.map(item => item.id))
      const invalidIds = ids.filter(id => !deletedIds.has(id))
      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new PemindahbukuanNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'pemindahbukuan', deleted)
    })
  },

  async approvePemindahbukuan(id: number, adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(pemindahbukuan).where(eq(pemindahbukuan.id, id)).for('update')
      if (!target) {
        throw new PemindahbukuanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PemindahbukuanAlreadyProcessedError({ id })
      }

      assertTransferDestination(target)
      for (const userId of [...new Set([target.idUserSumber, target.idUserTujuan])].sort((a, b) => a - b)) {
        await assertMember(tx, userId)
      }
      const balances = await lockBalances(tx, [target.idUserSumber, target.idUserTujuan])
      const source = balances.get(target.idUserSumber)!
      const destination = balances.get(target.idUserTujuan)!

      await assertAvailableBalance(tx, target, source, target.id)
      await assertAccounts(tx, getRequiredAccountIds(target))

      if (target.tipePemindahbukuan === 'saham_ke_saham') {
        await tx.update(saldoSimpanan)
          .set({ jumlahSaham: toPostgresInteger(BigInt(source.jumlahSaham) - BigInt(target.jumlahSaham)) })
          .where(eq(saldoSimpanan.userId, target.idUserSumber))
      }
      else {
        await tx.update(saldoSimpanan)
          .set({ saldoTabungan: toPostgresInteger(BigInt(source.saldoTabungan) - BigInt(target.nominal)) })
          .where(eq(saldoSimpanan.userId, target.idUserSumber))
      }

      if (target.tipePemindahbukuan === 'tabungan_ke_tabungan') {
        await tx.update(saldoSimpanan)
          .set({ saldoTabungan: toPostgresInteger(BigInt(destination.saldoTabungan) + BigInt(target.nominal)) })
          .where(eq(saldoSimpanan.userId, target.idUserTujuan))
      }
      else {
        await tx.update(saldoSimpanan)
          .set({ jumlahSaham: toPostgresInteger(BigInt(destination.jumlahSaham) + BigInt(target.jumlahSaham)) })
          .where(eq(saldoSimpanan.userId, target.idUserTujuan))
      }

      const kodeJurnal = await allocateTransactionCode(tx, 'jurnal', target.tanggalTransaksi)
      const [createdJournal] = await tx.insert(jurnal).values({
        kodeTransaksi: kodeJurnal,
        tanggalTransaksi: target.tanggalTransaksi,
        keterangan: target.keterangan,
      }).returning({ id: jurnal.id })

      if (!createdJournal) {
        throw new Error('Jurnal gagal dibuat')
      }

      const nominalTujuan = target.tipePemindahbukuan === 'tabungan_ke_saham'
        ? toPostgresInteger(BigInt(target.jumlahSaham) * BigInt(target.hargaNominalPerSaham))
        : target.nominal
      const details = [
        { jurnalId: createdJournal.id, akunId: target.akunIdSumber, userId: target.idUserSumber, debit: target.nominal, kredit: 0 },
        { jurnalId: createdJournal.id, akunId: target.akunIdTujuan, userId: target.idUserTujuan, debit: 0, kredit: nominalTujuan },
      ]

      if (target.tipePemindahbukuan === 'tabungan_ke_saham' && target.agioSaham > 0) {
        const isPremium = target.hargaPerSaham > target.hargaNominalPerSaham
        details.push({
          jurnalId: createdJournal.id,
          akunId: AkunId.AGIOSAHAM,
          userId: target.idUserTujuan,
          debit: isPremium ? 0 : target.agioSaham,
          kredit: isPremium ? target.agioSaham : 0,
        })
      }
      await tx.insert(jurnalDetail).values(details)
      await tx.update(pemindahbukuan).set({
        jurnalId: createdJournal.id,
        statusApproved: 'approved',
        alasanPenolakan: null,
        approvedBy: adminId,
        approvedAt: new Date(),
      }).where(eq(pemindahbukuan.id, id))
    })
  },

  async rejectPemindahbukuan(id: number, adminId: number, reason: string) {
    const rejectionReason = reason.trim()
    if (!rejectionReason) {
      throw new InvalidRejectionReasonError()
    }

    await db.transaction(async (tx) => {
      const [target] = await tx
        .select({ statusApproved: pemindahbukuan.statusApproved })
        .from(pemindahbukuan)
        .where(eq(pemindahbukuan.id, id))
        .for('update')
      if (!target) {
        throw new PemindahbukuanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PemindahbukuanAlreadyProcessedError({ id })
      }

      await tx.update(pemindahbukuan).set({
        statusApproved: 'rejected',
        alasanPenolakan: rejectionReason,
        approvedBy: adminId,
        approvedAt: new Date(),
      }).where(eq(pemindahbukuan.id, id))
    })
  },
}
