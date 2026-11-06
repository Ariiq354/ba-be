import { asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { Transaction } from '#/libs/database'
import type { pemindahbukuan } from '#/libs/database/schema/simpanan'

import { AkunId } from '#/libs/config'
import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { saldoSimpanan } from '#/libs/database/schema/simpanan'
import { getPendingSimpanan } from '#/libs/simpananBalance'

import { InsufficientBalanceError } from '../simpanan/errors'
import { InsufficientSharesError, InvalidConversionDestinationError, InvalidTransferDestinationError } from './errors'

type Transfer = typeof pemindahbukuan.$inferSelect

export const sourceMember = alias(user, 'source_member')
export const destinationMember = alias(user, 'destination_member')
export const creator = alias(user, 'creator')
export const approver = alias(user, 'approver')
export const sourceAccount = alias(akun, 'source_account')
export const destinationAccount = alias(akun, 'destination_account')

export function assertTransferDestination(
  target: Pick<Transfer, 'idUserSumber' | 'idUserTujuan' | 'tipePemindahbukuan'>,
) {
  const sameMember = target.idUserSumber === target.idUserTujuan
  if (target.tipePemindahbukuan === 'tabungan_ke_saham') {
    if (!sameMember) {
      throw new InvalidConversionDestinationError()
    }
  } else if (sameMember) {
    throw new InvalidTransferDestinationError()
  }
}

export async function lockBalances(tx: Transaction, userIds: number[]) {
  // Consistent ordering also covers opposite-direction transfers and new balances.
  const ids = [...new Set(userIds)].toSorted((a, b) => a - b)
  for (const userId of ids) {
    await tx.insert(saldoSimpanan).values({ userId }).onConflictDoNothing()
  }

  const balances = await tx
    .select()
    .from(saldoSimpanan)
    .where(inArray(saldoSimpanan.userId, ids))
    .orderBy(asc(saldoSimpanan.userId))
    .for('update')

  return new Map(balances.map((balance) => [balance.userId, balance]))
}

export async function assertAvailableBalance(
  tx: Transaction,
  target: Pick<Transfer, 'idUserSumber' | 'tipePemindahbukuan' | 'nominal' | 'jumlahSaham'>,
  balance: typeof saldoSimpanan.$inferSelect,
  excludeId?: number,
) {
  const pending = await getPendingSimpanan(tx, target.idUserSumber, { pemindahbukuanId: excludeId })

  if (target.tipePemindahbukuan === 'saham_ke_saham') {
    const available = balance.jumlahSaham - pending.pemindahbukuanSaham
    if (available < target.jumlahSaham) {
      throw new InsufficientSharesError()
    }
  } else {
    const available = balance.saldoTabungan - pending.penarikan - pending.pemindahbukuanTabungan
    if (available < target.nominal) {
      throw new InsufficientBalanceError()
    }
  }
}

export function getRequiredAccountIds(
  target: Pick<Transfer, 'akunIdSumber' | 'akunIdTujuan' | 'tipePemindahbukuan' | 'agioSaham'>,
) {
  return [
    target.akunIdSumber,
    target.akunIdTujuan,
    ...(target.tipePemindahbukuan === 'tabungan_ke_saham' && target.agioSaham > 0 ? [AkunId.AGIOSAHAM] : []),
  ]
}
