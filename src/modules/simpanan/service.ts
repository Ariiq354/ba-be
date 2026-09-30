import type { SimpananModel } from './model'
import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { db } from '#/database'
import { akun } from '#/database/schema/akun'
import { user } from '#/database/schema/auth'
import { jurnal, jurnalDetail } from '#/database/schema/jurnal'
import { saham as hargaSaham } from '#/database/schema/master'
import { mutasiSimpanan, saldoSimpanan } from '#/database/schema/simpanan'
import { userProfile } from '#/database/schema/users'
import { AkunId } from '#/utils/akunId'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/utils/penggunaAccess'
import { calculateSahamAmounts, HARGA_NOMINAL_SAHAM } from '#/utils/saham'
import { allocateTransactionCode, getJakartaDate, retainTransactionCodes } from '#/utils/transaction'
import { PAYMENT_ACCOUNT_IDS } from './constants'
import {
  AmountOverflowError,
  HargaSahamNotFoundError,
  InsufficientBalanceError,
  InvalidAccountError,
  InvalidPaymentAccountError,
  InvalidRejectionReasonError,
  MutasiSimpananAlreadyProcessedError,
  MutasiSimpananNotDeletedError,
  MutasiSimpananNotFoundError,
  NotMemberError,
} from './errors'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

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

const POSTGRES_INTEGER_MIN = -2_147_483_648n
const POSTGRES_INTEGER_MAX = 2_147_483_647n

function assertInputInteger(value: number) {
  if (
    !Number.isSafeInteger(value)
    || BigInt(value) < 0n
    || BigInt(value) > POSTGRES_INTEGER_MAX
  ) {
    throw new AmountOverflowError()
  }

  return value
}

function toPostgresInteger(
  value: number | bigint,
  message = 'Nilai transaksi melebihi batas yang diizinkan',
) {
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    throw new AmountOverflowError(message)
  }

  const integer = BigInt(value)
  if (integer < POSTGRES_INTEGER_MIN || integer > POSTGRES_INTEGER_MAX) {
    throw new AmountOverflowError(message)
  }

  return Number(integer)
}

function assertPaymentAccount(akunId: number) {
  if (!(PAYMENT_ACCOUNT_IDS as readonly number[]).includes(akunId)) {
    throw new InvalidPaymentAccountError({ akunId })
  }
}

export const SimpananService = {
  async getPaymentAccountOptions() {
    const data = await db
      .select({
        id: akun.id,
        kodeAkun: akun.kodeAkun,
        namaAkun: akun.namaAkun,
      })
      .from(akun)
      .where(and(inArray(akun.id, PAYMENT_ACCOUNT_IDS), eq(akun.isActive, true)))
      .orderBy(asc(akun.namaAkun), asc(akun.id))

    return { data }
  },

  async getSaldo(actorId: number, userId = actorId) {
    await assertPenggunaAccess(db, actorId, userId)

    const [result] = await db
      .select({
        noAnggota: userProfile.noAnggota,
        saldoTabungan: saldoSimpanan.saldoTabungan,
        jumlahSaham: saldoSimpanan.jumlahSaham,
        totalPenarikanPending:
              sql<string>`coalesce(sum(${mutasiSimpanan.nilaiTransaksi}), 0)::text`,
      })
      .from(userProfile)
      .leftJoin(saldoSimpanan, eq(saldoSimpanan.userId, userProfile.idUser))
      .leftJoin(
        mutasiSimpanan,
        and(
          eq(mutasiSimpanan.userId, userProfile.idUser),
          eq(mutasiSimpanan.jenisSimpanan, 'tabungan'),
          eq(mutasiSimpanan.jenisTransaksi, 'penarikan'),
          eq(mutasiSimpanan.statusApproved, 'pending'),
        ),
      )
      .where(eq(userProfile.idUser, userId))
      .groupBy(
        userProfile.noAnggota,
        saldoSimpanan.saldoTabungan,
        saldoSimpanan.jumlahSaham,
      )

    if (!result?.noAnggota?.trim()) {
      throw new NotMemberError({ userId })
    }

    const saldoTabungan = result.saldoTabungan ?? 0
    const jumlahSaham = result.jumlahSaham ?? 0
    const totalPenarikanPending = Number(BigInt(result.totalPenarikanPending))

    return {
      saldoTabungan,
      jumlahSaham,
      totalPenarikanPending,
      saldoEfektif: Math.max(0, saldoTabungan - totalPenarikanPending),
    }
  },

  async getMutasi(
    actorId: number,
    query: SimpananModel['getMutasiQuerySchema'],
  ) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)

    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []

    if (accessCondition !== undefined) {
      const accessibleUsers = db
        .select({ id: user.id })
        .from(user)
        .where(accessCondition)

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
        accountName: akun.namaAkun,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(mutasiSimpanan)
      .innerJoin(member, eq(member.id, mutasiSimpanan.userId))
      .innerJoin(akun, eq(akun.id, mutasiSimpanan.akunId))
      .innerJoin(creator, eq(creator.id, mutasiSimpanan.createdBy))
      .leftJoin(approver, eq(approver.id, mutasiSimpanan.approvedBy))
      .where(and(...conditions))
      .orderBy(desc(mutasiSimpanan.createdAt), desc(mutasiSimpanan.id))

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

  async createSetoran(
    actorId: number,
    data: SimpananModel['createSetoranSchema'],
  ) {
    const userId = data.userId ?? actorId

    await db.transaction(async (tx) => {
      assertPaymentAccount(data.akunId)

      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)

      await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
      await tx
        .select({ id: saldoSimpanan.id })
        .from(saldoSimpanan)
        .where(eq(saldoSimpanan.userId, userId))
        .for('update')

      const [paymentAccount] = await tx
        .select({ id: akun.id, isActive: akun.isActive })
        .from(akun)
        .where(eq(akun.id, data.akunId))
        .for('share')

      if (!paymentAccount?.isActive) {
        throw new InvalidAccountError({ akunId: data.akunId })
      }

      let nilaiTransaksi: number
      let jumlahSaham = 0
      let hargaPerSaham = 0
      let hargaNominalPerSaham = 0
      let agioSaham = 0

      if (data.jenisSimpanan === 'tabungan') {
        nilaiTransaksi = assertInputInteger(data.nilaiTransaksi)
      }
      else {
        jumlahSaham = assertInputInteger(data.jumlahSaham)

        const [latestPrice] = await tx
          .select({ hargaJual: hargaSaham.hargaJual })
          .from(hargaSaham)
          .orderBy(desc(hargaSaham.createdAt), desc(hargaSaham.id))
          .limit(1)

        if (!latestPrice) {
          throw new HargaSahamNotFoundError()
        }

        hargaPerSaham = latestPrice.hargaJual
        hargaNominalPerSaham = HARGA_NOMINAL_SAHAM
        const amounts = calculateSahamAmounts(
          jumlahSaham,
          hargaPerSaham,
          hargaNominalPerSaham,
        )
        nilaiTransaksi = toPostgresInteger(amounts.nilaiTransaksi)
        toPostgresInteger(amounts.nilaiNominal)
        agioSaham = toPostgresInteger(amounts.agioSaham)
      }

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(mutasiSimpanan).values({
        kodeTransaksi,
        userId,
        akunId: data.akunId,
        jenisSimpanan: data.jenisSimpanan,
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

  async createPenarikan(
    actorId: number,
    data: SimpananModel['createPenarikanSchema'],
  ) {
    const userId = data.userId ?? actorId

    await db.transaction(async (tx) => {
      assertPaymentAccount(data.akunId)
      const nilaiTransaksi = assertInputInteger(data.nilaiTransaksi)

      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)

      await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
      const [balance] = await tx
        .select({ saldoTabungan: saldoSimpanan.saldoTabungan })
        .from(saldoSimpanan)
        .where(eq(saldoSimpanan.userId, userId))
        .for('update')

      const [paymentAccount] = await tx
        .select({ id: akun.id, isActive: akun.isActive })
        .from(akun)
        .where(eq(akun.id, data.akunId))
        .for('share')

      if (!paymentAccount?.isActive) {
        throw new InvalidAccountError({ akunId: data.akunId })
      }

      const [pending] = await tx
        .select({
          total: sql<string>`coalesce(sum(${mutasiSimpanan.nilaiTransaksi}), 0)::text`,
        })
        .from(mutasiSimpanan)
        .where(
          and(
            eq(mutasiSimpanan.userId, userId),
            eq(mutasiSimpanan.jenisSimpanan, 'tabungan'),
            eq(mutasiSimpanan.jenisTransaksi, 'penarikan'),
            eq(mutasiSimpanan.statusApproved, 'pending'),
          ),
        )
      const available = BigInt(balance?.saldoTabungan ?? 0) - BigInt(pending?.total ?? '0')

      if (available < BigInt(nilaiTransaksi)) {
        throw new InsufficientBalanceError()
      }

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(mutasiSimpanan).values({
        kodeTransaksi,
        userId,
        akunId: data.akunId,
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

  async deleteMutasi(
    actorId: number,
    ids: number[],
  ) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx
        .select({ id: user.id })
        .from(user)
        .where(accessCondition)

      const deleted = await tx
        .delete(mutasiSimpanan)
        .where(
          and(
            inArray(mutasiSimpanan.id, ids),
            or(
              eq(mutasiSimpanan.userId, actorId),
              eq(mutasiSimpanan.createdBy, actorId),
            ),
            inArray(mutasiSimpanan.userId, accessibleUsers),
            eq(mutasiSimpanan.statusApproved, 'pending'),
          ),
        )
        .returning({
          id: mutasiSimpanan.id,
          kodeTransaksi: mutasiSimpanan.kodeTransaksi,
          tanggalTransaksi: mutasiSimpanan.tanggalTransaksi,
        })

      const deletedIds = new Set(deleted.map(item => item.id))
      const invalidIds = ids.filter(id => !deletedIds.has(id))

      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new MutasiSimpananNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'simpanan', deleted)
    })
  },

  async approveMutasi(
    id: number,
    adminId: number,
  ) {
    await db.transaction(async (tx) => {
      const [target] = await tx
        .select()
        .from(mutasiSimpanan)
        .where(eq(mutasiSimpanan.id, id))
        .for('update')

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
          const [otherPending] = await tx
            .select({
              total: sql<string>`coalesce(sum(${mutasiSimpanan.nilaiTransaksi}), 0)::text`,
            })
            .from(mutasiSimpanan)
            .where(
              and(
                eq(mutasiSimpanan.userId, target.userId),
                eq(mutasiSimpanan.jenisSimpanan, 'tabungan'),
                eq(mutasiSimpanan.jenisTransaksi, 'penarikan'),
                eq(mutasiSimpanan.statusApproved, 'pending'),
                ne(mutasiSimpanan.id, target.id),
              ),
            )
          const available = BigInt(balance?.saldoTabungan ?? 0)
            - BigInt(otherPending?.total ?? '0')

          if (available < BigInt(target.nilaiTransaksi)) {
            throw new InsufficientBalanceError()
          }

          nextSaldo = toPostgresInteger(
            BigInt(balance?.saldoTabungan ?? 0) - BigInt(target.nilaiTransaksi),
            'Hasil transaksi melebihi batas yang diizinkan',
          )
        }
        else {
          nextSaldo = toPostgresInteger(
            BigInt(balance?.saldoTabungan ?? 0) + BigInt(target.nilaiTransaksi),
            'Hasil transaksi melebihi batas yang diizinkan',
          )
        }
        saldoSetelahTransaksi = nextSaldo

        await tx
          .update(saldoSimpanan)
          .set({ saldoTabungan: nextSaldo })
          .where(eq(saldoSimpanan.userId, target.userId))
      }
      else {
        const nextJumlahSaham = toPostgresInteger(
          BigInt(balance?.jumlahSaham ?? 0) + BigInt(target.jumlahSaham),
          'Hasil transaksi melebihi batas yang diizinkan',
        )
        jumlahSahamSetelahTransaksi = nextJumlahSaham

        await tx
          .update(saldoSimpanan)
          .set({ jumlahSaham: nextJumlahSaham })
          .where(eq(saldoSimpanan.userId, target.userId))
      }

      const tanggalJurnal = target.tanggalTransaksi
      const kodeJurnal = await allocateTransactionCode(tx, 'jurnal', tanggalJurnal)

      const requiredAccountIds = target.jenisSimpanan === 'tabungan'
        ? [target.akunId, AkunId.SIMPANANBERJANGKA]
        : [
            target.akunId,
            AkunId.SAHAM50,
            ...(target.hargaPerSaham === target.hargaNominalPerSaham
              ? []
              : [AkunId.AGIOSAHAM]),
          ]
      const availableAccounts = await tx
        .select({ id: akun.id, isActive: akun.isActive })
        .from(akun)
        .where(inArray(akun.id, requiredAccountIds))
        .for('share')
      const availableAccountsById = new Map(availableAccounts.map(item => [item.id, item]))
      const invalidAccountId = requiredAccountIds.find(
        akunId => !availableAccountsById.get(akunId)?.isActive,
      )

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
          userId: target.userId,
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
            debit: isSetoran ? target.nilaiTransaksi : 0,
            kredit: isSetoran ? 0 : target.nilaiTransaksi,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.SIMPANANBERJANGKA,
            debit: isSetoran ? 0 : target.nilaiTransaksi,
            kredit: isSetoran ? target.nilaiTransaksi : 0,
          },
        ])
      }
      else {
        const amounts = calculateSahamAmounts(
          target.jumlahSaham,
          target.hargaPerSaham,
          target.hargaNominalPerSaham,
        )
        const nominalTotal = toPostgresInteger(
          amounts.nilaiNominal,
          'Hasil transaksi melebihi batas yang diizinkan',
        )
        const details = [
          {
            jurnalId: createdJournal.id,
            akunId: target.akunId,
            debit: target.nilaiTransaksi,
            kredit: 0,
          },
          {
            jurnalId: createdJournal.id,
            akunId: AkunId.SAHAM50,
            debit: 0,
            kredit: nominalTotal,
          },
        ]

        if (target.hargaPerSaham > target.hargaNominalPerSaham) {
          details.push({
            jurnalId: createdJournal.id,
            akunId: AkunId.AGIOSAHAM,
            debit: 0,
            kredit: target.agioSaham,
          })
        }
        else if (target.hargaPerSaham < target.hargaNominalPerSaham) {
          details.push({
            jurnalId: createdJournal.id,
            akunId: AkunId.AGIOSAHAM,
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
    id: number,
    adminId: number,
    reason: string,
  ) {
    const rejectionReason = reason.trim()

    if (!rejectionReason) {
      throw new InvalidRejectionReasonError()
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
