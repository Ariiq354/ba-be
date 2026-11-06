import { eq } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { AkunId } from '#/libs/config'
import { jurnal, jurnalDetail } from '#/libs/database/schema/jurnal'
import { pembiayaan } from '#/libs/database/schema/pembiayaan'
import { getJakartaDate } from '#/libs/date'

import { assertActiveAccounts, assertMember } from '../simpanan/utils'

export async function recordWakalahTransfer(tx: Transaction, target: typeof pembiayaan.$inferSelect, adminId: number) {
  await assertMember(tx, target.userId)
  await assertActiveAccounts(tx, [target.akunId, AkunId.UANGMUKAPEMBELIAN])

  const transferredAt = new Date()
  const tanggalTransfer = getJakartaDate(transferredAt)
  const [createdJournal] = await tx
    .insert(jurnal)
    .values({
      kodeTransaksi: target.kodeTransaksi,
      tanggalTransaksi: tanggalTransfer,
      keterangan: 'Akad wakalah',
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
