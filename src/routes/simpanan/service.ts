import { and, asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'

import { AkunId, HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { kelompok } from '#/libs/database/schema/kelompok'
import { saham as hargaSaham } from '#/libs/database/schema/master'
import { simpananRiwayat, simpananSaldo } from '#/libs/database/schema/simpanan'
import { userProfile } from '#/libs/database/schema/users'
import { getJakartaDate } from '#/libs/date'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { calculateSahamAmounts } from '#/libs/saham'
import { getPendingSimpanan } from '#/libs/simpananBalance'
import { allocateTransactionCode } from '#/libs/transaction'

import type * as SimpananModel from './model'

import { PemindahbukuanService } from '../pemindahbukuan/service'
import { PAYMENT_ACCOUNTS } from './constants'
import {
  HargaSahamNotFoundError,
  InsufficientBalanceError,
  InvalidRejectionReasonError,
  MutasiSimpananAlreadyProcessedError,
  MutasiSimpananNotDeletedError,
  MutasiSimpananNotFoundError,
  NotMemberError,
} from './errors'
import { approver, assertActiveAccounts, assertMember, assertPaymentAccount, creator, member } from './utils'

export const SimpananService = {
  async getMonitoring(query: SimpananModel.MonitoringGet['Query']) {
    const rows = await db
      .select({
        nama: user.name,
        noAnggota: userProfile.noAnggota,
        namaKelompok: kelompok.namaKelompok,
        saldoTabungan: sql`coalesce(${simpananSaldo.saldoTabungan}, 0)`.mapWith(Number),
        jumlahSaham: sql`coalesce(${simpananSaldo.jumlahSaham}, 0)`.mapWith(Number),
        totalSaham: sql`(select coalesce(sum(${simpananSaldo.jumlahSaham}), 0) from ${simpananSaldo})`.mapWith(Number),
      })
      .from(user)
      .innerJoin(kelompok, eq(kelompok.id, user.idKelompok))
      .leftJoin(userProfile, eq(userProfile.idUser, user.id))
      .leftJoin(simpananSaldo, eq(simpananSaldo.userId, user.id))
      .where(query.idKelompok === undefined ? undefined : eq(user.idKelompok, query.idKelompok))
      .orderBy(asc(user.name), asc(user.id))

    return {
      data: rows.map(({ totalSaham, ...row }) => ({
        ...row,
        persentaseKepemilikanSaham: totalSaham > 0 ? (row.jumlahSaham / totalSaham) * 100 : 0,
      })),
    } satisfies SimpananModel.MonitoringGet['Response'][200]
  },

  async getSaldo(actorId: number, userId: SimpananModel.SaldoGet['Query']['userId'] = actorId) {
    await assertPenggunaAccess(db, actorId, userId)

    const [result] = await db
      .select({
        noAnggota: userProfile.noAnggota,
        saldoTabungan: simpananSaldo.saldoTabungan,
        jumlahSaham: simpananSaldo.jumlahSaham,
      })
      .from(userProfile)
      .leftJoin(simpananSaldo, eq(simpananSaldo.userId, userProfile.idUser))
      .where(eq(userProfile.idUser, userId))

    if (!result?.noAnggota?.trim()) {
      throw new NotMemberError({ userId })
    }

    const saldoTabungan = result.saldoTabungan ?? 0
    const jumlahSaham = result.jumlahSaham ?? 0
    const pending = await getPendingSimpanan(db, userId)
    const totalPenarikanPending = pending.penarikan
    const totalPemindahbukuanPending = pending.pemindahbukuanTabungan
    const totalSahamPending = pending.pemindahbukuanSaham

    return {
      saldoTabungan,
      jumlahSaham,
      saldoEfektif: Math.max(0, saldoTabungan - totalPenarikanPending - totalPemindahbukuanPending),
      jumlahSahamEfektif: Math.max(0, jumlahSaham - totalSahamPending),
    } satisfies SimpananModel.SaldoGet['Response'][200]
  },

  async getPendingCount() {
    const total = await db.$count(simpananRiwayat, eq(simpananRiwayat.statusApproved, 'pending'))
    return { total } satisfies SimpananModel.PendingCountGet['Response'][200]
  },

  async getMutasi(actorId: number, query: SimpananModel.MutasiGet['Query']) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)

    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []

    if (accessCondition !== undefined) {
      const accessibleUsers = db.select({ id: user.id }).from(user).where(accessCondition)

      conditions.push(inArray(simpananRiwayat.userId, accessibleUsers))
    }

    if (query.userId !== undefined) {
      await assertPenggunaAccess(db, actorId, query.userId)
      conditions.push(eq(simpananRiwayat.userId, query.userId))
    }

    if (query.status !== 'all') {
      conditions.push(eq(simpananRiwayat.statusApproved, query.status))
    }

    if (query.jenisTransaksi !== 'all') {
      conditions.push(eq(simpananRiwayat.jenisTransaksi, query.jenisTransaksi))
    }

    if (query.jenisSimpanan !== 'all') {
      conditions.push(eq(simpananRiwayat.jenisSimpanan, query.jenisSimpanan))
    }

    if (query.search) {
      conditions.push(ilike(simpananRiwayat.kodeTransaksi, `%${query.search}%`))
    }

    const qb = db
      .select({
        id: simpananRiwayat.id,
        kodeTransaksi: simpananRiwayat.kodeTransaksi,
        userId: simpananRiwayat.userId,
        akunId: simpananRiwayat.akunId,
        jenisSimpanan: simpananRiwayat.jenisSimpanan,
        jenisTransaksi: simpananRiwayat.jenisTransaksi,
        nilaiTransaksi: simpananRiwayat.nilaiTransaksi,
        jumlahSaham: simpananRiwayat.jumlahSaham,
        hargaPerSaham: simpananRiwayat.hargaPerSaham,
        hargaNominalPerSaham: simpananRiwayat.hargaNominalPerSaham,
        agioSaham: simpananRiwayat.agioSaham,
        saldoSetelahTransaksi: simpananRiwayat.saldoSetelahTransaksi,
        jumlahSahamSetelahTransaksi: simpananRiwayat.jumlahSahamSetelahTransaksi,
        tanggalTransaksi: simpananRiwayat.tanggalTransaksi,
        statusApproved: simpananRiwayat.statusApproved,
        alasanPenolakan: simpananRiwayat.alasanPenolakan,
        keterangan: simpananRiwayat.keterangan,
        createdBy: simpananRiwayat.createdBy,
        approvedAt: simpananRiwayat.approvedAt,
        createdAt: simpananRiwayat.createdAt,
        memberName: member.name,
        creatorName: creator.name,
        approverName: approver.name,
      })
      .from(simpananRiwayat)
      .innerJoin(member, eq(member.id, simpananRiwayat.userId))
      .innerJoin(creator, eq(creator.id, simpananRiwayat.createdBy))
      .leftJoin(approver, eq(approver.id, simpananRiwayat.approvedBy))
      .where(and(...conditions))
      .orderBy(
        desc(eq(simpananRiwayat.statusApproved, 'pending')),
        desc(simpananRiwayat.createdAt),
        desc(simpananRiwayat.id),
      )

    const total = await db.$count(simpananRiwayat, and(...conditions))
    const rows = await qb.limit(query.limit).offset((query.page - 1) * query.limit)
    const data: SimpananModel.MutasiGet['Response'][200]['data'] = rows.map(({ akunId, ...row }) => ({
      ...row,
      metodePembayaran: akunId === AkunId.KAS ? 'Tunai' : 'Transfer',
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    }))

    return { total, data } satisfies SimpananModel.MutasiGet['Response'][200]
  },

  async createSetoranTabungan(actorId: number, data: SimpananModel.MutasiSetoranTabunganPost['Body']) {
    const userId = data.userId ?? actorId
    const akunId = PAYMENT_ACCOUNTS[data.metodePembayaran]

    await db.transaction(async (tx) => {
      await assertPenggunaAccess(tx, actorId, userId)
      await assertMember(tx, userId)
      await tx.insert(simpananSaldo).values({ userId }).onConflictDoNothing()
      await assertPaymentAccount(tx, akunId)

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(simpananRiwayat).values({
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
      await tx.insert(simpananSaldo).values({ userId }).onConflictDoNothing()
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

      await tx.insert(simpananRiwayat).values({
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

      await tx.insert(simpananSaldo).values({ userId }).onConflictDoNothing()
      const [balance] = await tx
        .select({ saldoTabungan: simpananSaldo.saldoTabungan })
        .from(simpananSaldo)
        .where(eq(simpananSaldo.userId, userId))
        .for('update')

      await assertPaymentAccount(tx, akunId)

      const pending = await getPendingSimpanan(tx, userId)
      const available = (balance?.saldoTabungan ?? 0) - pending.penarikan - pending.pemindahbukuanTabungan

      if (available < nilaiTransaksi) {
        throw new InsufficientBalanceError()
      }

      const tanggalTransaksi = getJakartaDate()
      const kodeTransaksi = await allocateTransactionCode(tx, 'simpanan', tanggalTransaksi)

      await tx.insert(simpananRiwayat).values({
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
        .delete(simpananRiwayat)
        .where(
          and(
            inArray(simpananRiwayat.id, ids),
            or(eq(simpananRiwayat.userId, actorId), eq(simpananRiwayat.createdBy, actorId)),
            inArray(simpananRiwayat.userId, accessibleUsers),
            eq(simpananRiwayat.statusApproved, 'pending'),
          ),
        )
        .returning({
          id: simpananRiwayat.id,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))

      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new MutasiSimpananNotDeletedError({ ids: invalidIds })
      }
    })
  },

  async approveMutasi(id: SimpananModel.MutasiByIdApprovePatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(simpananRiwayat).where(eq(simpananRiwayat.id, id)).for('update')

      if (!target) {
        throw new MutasiSimpananNotFoundError({ id })
      }

      if (target.statusApproved !== 'pending') {
        throw new MutasiSimpananAlreadyProcessedError({ id })
      }

      await tx.insert(simpananSaldo).values({ userId: target.userId }).onConflictDoNothing()
      const [balance] = await tx
        .select({
          saldoTabungan: simpananSaldo.saldoTabungan,
          jumlahSaham: simpananSaldo.jumlahSaham,
        })
        .from(simpananSaldo)
        .where(eq(simpananSaldo.userId, target.userId))
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

        await tx.update(simpananSaldo).set({ saldoTabungan: nextSaldo }).where(eq(simpananSaldo.userId, target.userId))
      } else {
        const nextJumlahSaham = (balance?.jumlahSaham ?? 0) + target.jumlahSaham
        jumlahSahamSetelahTransaksi = nextJumlahSaham

        await tx
          .update(simpananSaldo)
          .set({ jumlahSaham: nextJumlahSaham })
          .where(eq(simpananSaldo.userId, target.userId))
      }

      const tanggalJurnal = target.tanggalTransaksi

      const requiredAccountIds =
        target.jenisSimpanan === 'tabungan'
          ? [target.akunId, AkunId.SIMPANANBERJANGKA]
          : [
              target.akunId,
              AkunId.SAHAM50,
              ...(target.hargaPerSaham === target.hargaNominalPerSaham ? [] : [AkunId.AGIOSAHAM]),
            ]
      await assertActiveAccounts(tx, requiredAccountIds)

      const [createdJournal] = await tx
        .insert(jurnal)
        .values({
          kodeTransaksi: target.kodeTransaksi,
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
        .update(simpananRiwayat)
        .set({
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt: new Date(),
          saldoSetelahTransaksi,
          jumlahSahamSetelahTransaksi,
        })
        .where(eq(simpananRiwayat.id, id))
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
        .select({ statusApproved: simpananRiwayat.statusApproved })
        .from(simpananRiwayat)
        .where(eq(simpananRiwayat.id, id))
        .for('update')

      if (!target) {
        throw new MutasiSimpananNotFoundError({ id })
      }

      if (target.statusApproved !== 'pending') {
        throw new MutasiSimpananAlreadyProcessedError({ id })
      }

      await tx
        .update(simpananRiwayat)
        .set({
          statusApproved: 'rejected',
          alasanPenolakan: rejectionReason,
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(simpananRiwayat.id, id))
    })
  },
}
