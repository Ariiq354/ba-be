import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm'

import { AkunId, HARGA_NOMINAL_SAHAM } from '#/libs/config'
import { db } from '#/libs/database'
import { user } from '#/libs/database/schema/auth'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { saham as hargaSaham } from '#/libs/database/schema/master'
import { pemindahbukuan, saldoSimpanan } from '#/libs/database/schema/simpanan'
import { getJakartaDate } from '#/libs/date'
import { assertPenggunaAccess, getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { calculateSahamAmounts } from '#/libs/saham'
import { allocateTransactionCode, retainTransactionCodes } from '#/libs/transaction'

import type * as PemindahbukuanModel from './model'

import { HargaSahamNotFoundError, InvalidRejectionReasonError } from '../simpanan/errors'
import {
  PemindahbukuanAlreadyProcessedError,
  PemindahbukuanNotDeletedError,
  PemindahbukuanNotFoundError,
} from './errors'
import {
  approver,
  assertAccounts,
  assertAvailableBalance,
  assertMember,
  assertTransferDestination,
  creator,
  destinationAccount,
  destinationMember,
  getRequiredAccountIds,
  lockBalances,
  sourceAccount,
  sourceMember,
} from './utils'

export const PemindahbukuanService = {
  async getPemindahbukuan(actorId: number, query: PemindahbukuanModel.Get['Query']) {
    const accessCondition = await getPenggunaAccessCondition(db, actorId)
    if (accessCondition !== undefined) {
      await assertMember(db, actorId)
    }

    const conditions = []
    if (accessCondition !== undefined) {
      const accessibleUsers = db.select({ id: user.id }).from(user).where(accessCondition)
      conditions.push(
        or(
          inArray(pemindahbukuan.idUserSumber, accessibleUsers),
          inArray(pemindahbukuan.idUserTujuan, accessibleUsers),
        ),
      )
    }

    if (query.userId !== undefined) {
      await assertPenggunaAccess(db, actorId, query.userId)
      conditions.push(or(eq(pemindahbukuan.idUserSumber, query.userId), eq(pemindahbukuan.idUserTujuan, query.userId)))
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
    const data = rows.map((row) => ({
      ...row,
      approvedAt: row.approvedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }))

    return { total, data } satisfies PemindahbukuanModel.Get['Response'][200]
  },

  async createPemindahbukuan(actorId: number, data: PemindahbukuanModel.Post['Body']) {
    const idUserSumber = data.idUserSumber ?? actorId
    assertTransferDestination({ ...data, idUserSumber })

    await db.transaction(async (tx) => {
      await assertPenggunaAccess(tx, actorId, idUserSumber)
      for (const userId of [...new Set([idUserSumber, data.idUserTujuan])].toSorted((a, b) => a - b)) {
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
        nominal = data.nominal
      } else {
        jumlahSaham = data.jumlahSaham
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
          hargaPerSaham = latestPrice.hargaJual
        }

        const amounts = calculateSahamAmounts(jumlahSaham, hargaPerSaham, hargaNominalPerSaham)
        nominal = amounts.nilaiTransaksi
        agioSaham = amounts.agioSaham
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

  async deletePemindahbukuan(actorId: number, ids: PemindahbukuanModel.Delete['Body']['ids']) {
    await db.transaction(async (tx) => {
      const accessCondition = await getPenggunaAccessCondition(tx, actorId)
      const accessibleUsers = tx.select({ id: user.id }).from(user).where(accessCondition)
      const deleted = await tx
        .delete(pemindahbukuan)
        .where(
          and(
            inArray(pemindahbukuan.id, ids),
            or(eq(pemindahbukuan.idUserSumber, actorId), eq(pemindahbukuan.createdBy, actorId)),
            inArray(pemindahbukuan.idUserSumber, accessibleUsers),
            eq(pemindahbukuan.statusApproved, 'pending'),
          ),
        )
        .returning({
          id: pemindahbukuan.id,
          kodeTransaksi: pemindahbukuan.kodeTransaksi,
          tanggalTransaksi: pemindahbukuan.tanggalTransaksi,
        })

      const deletedIds = new Set(deleted.map((item) => item.id))
      const invalidIds = ids.filter((id) => !deletedIds.has(id))
      if (deleted.length === 0 || invalidIds.length > 0) {
        throw new PemindahbukuanNotDeletedError({ ids: invalidIds })
      }

      await retainTransactionCodes(tx, 'pemindahbukuan', deleted)
    })
  },

  async approvePemindahbukuan(id: PemindahbukuanModel.ByIdApprovePatch['Params']['id'], adminId: number) {
    await db.transaction(async (tx) => {
      const [target] = await tx.select().from(pemindahbukuan).where(eq(pemindahbukuan.id, id)).for('update')
      if (!target) {
        throw new PemindahbukuanNotFoundError({ id })
      }
      if (target.statusApproved !== 'pending') {
        throw new PemindahbukuanAlreadyProcessedError({ id })
      }

      assertTransferDestination(target)
      for (const userId of [...new Set([target.idUserSumber, target.idUserTujuan])].toSorted((a, b) => a - b)) {
        await assertMember(tx, userId)
      }
      const balances = await lockBalances(tx, [target.idUserSumber, target.idUserTujuan])
      const source = balances.get(target.idUserSumber)!
      const destination = balances.get(target.idUserTujuan)!

      await assertAvailableBalance(tx, target, source, target.id)
      await assertAccounts(tx, getRequiredAccountIds(target))

      if (target.tipePemindahbukuan === 'saham_ke_saham') {
        await tx
          .update(saldoSimpanan)
          .set({
            jumlahSaham: source.jumlahSaham - target.jumlahSaham,
          })
          .where(eq(saldoSimpanan.userId, target.idUserSumber))
      } else {
        await tx
          .update(saldoSimpanan)
          .set({
            saldoTabungan: source.saldoTabungan - target.nominal,
          })
          .where(eq(saldoSimpanan.userId, target.idUserSumber))
      }

      if (target.tipePemindahbukuan === 'tabungan_ke_tabungan') {
        await tx
          .update(saldoSimpanan)
          .set({
            saldoTabungan: destination.saldoTabungan + target.nominal,
          })
          .where(eq(saldoSimpanan.userId, target.idUserTujuan))
      } else {
        await tx
          .update(saldoSimpanan)
          .set({
            jumlahSaham: destination.jumlahSaham + target.jumlahSaham,
          })
          .where(eq(saldoSimpanan.userId, target.idUserTujuan))
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

      const nominalTujuan =
        target.tipePemindahbukuan === 'tabungan_ke_saham'
          ? target.jumlahSaham * target.hargaNominalPerSaham
          : target.nominal
      const details = [
        {
          jurnalId: createdJournal.id,
          akunId: target.akunIdSumber,
          userId: target.idUserSumber,
          debit: target.nominal,
          kredit: 0,
        },
        {
          jurnalId: createdJournal.id,
          akunId: target.akunIdTujuan,
          userId: target.idUserTujuan,
          debit: 0,
          kredit: nominalTujuan,
        },
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
      await tx
        .update(pemindahbukuan)
        .set({
          jurnalId: createdJournal.id,
          statusApproved: 'approved',
          alasanPenolakan: null,
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(pemindahbukuan.id, id))
    })
  },

  async rejectPemindahbukuan(
    id: PemindahbukuanModel.ByIdRejectPatch['Params']['id'],
    adminId: number,
    reason: PemindahbukuanModel.ByIdRejectPatch['Body']['alasanPenolakan'],
  ) {
    const rejectionReason = reason.trim()
    if (!rejectionReason) {
      return new InvalidRejectionReasonError()
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

      await tx
        .update(pemindahbukuan)
        .set({
          statusApproved: 'rejected',
          alasanPenolakan: rejectionReason,
          approvedBy: adminId,
          approvedAt: new Date(),
        })
        .where(eq(pemindahbukuan.id, id))
    })
  },
}
