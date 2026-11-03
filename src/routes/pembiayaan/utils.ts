import { eq, inArray } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { AkunId } from '#/libs/config'
import { akun } from '#/libs/database/schema/akun'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'

import { InvalidAccountError } from '../simpanan/errors'
import { assertMember } from '../simpanan/utils'

export async function assertJournalAccounts(tx: Transaction, requiredAccountIds: number[]) {
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
}

export async function recordWakalahTransfer(tx: Transaction, target: typeof pembiayaan.$inferSelect, adminId: number) {
  await assertMember(tx, target.userId)
  await assertJournalAccounts(tx, [target.akunId, AkunId.UANGMUKAPEMBELIAN])

  const transferredAt = new Date()
  const tanggalTransfer = getJakartaDate(transferredAt)
  const [createdJournal] = await tx
    .insert(jurnal)
    .values({
      kodeTransaksi: target.kodeTransaksi,
      tanggalTransaksi: tanggalTransfer,
      keterangan: `Akad wakalah ${target.kodeTransaksi}: ${target.tujuan}`,
    })
    .returning({ id: jurnal.id })
  if (!createdJournal) {
    throw new Error('Jurnal wakalah gagal dibuat')
  }

  await tx.insert(jurnalDetail).values([
    {
      jurnalId: createdJournal.id,
      userId: target.userId,
      akunId: AkunId.UANGMUKAPEMBELIAN,
      debit: target.jumlahPokok,
      kredit: 0,
    },
    {
      jurnalId: createdJournal.id,
      userId: target.userId,
      akunId: target.akunId,
      debit: 0,
      kredit: target.jumlahPokok,
    },
  ])
  await tx
    .update(pembiayaan)
    .set({ tanggalTransfer, transferredBy: adminId, transferredAt })
    .where(eq(pembiayaan.id, target.id))
}
