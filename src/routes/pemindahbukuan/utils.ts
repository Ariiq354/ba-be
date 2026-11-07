import { asc, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { db, Transaction } from '#/libs/database'
import type { pemindahbukuan } from '#/libs/database/schema/simpanan'

import { AkunId } from '#/libs/config'
import { akunKeuangan } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { simpananSaldo } from '#/libs/database/schema/simpanan'
import { ForbiddenError } from '#/libs/errors'
import { getPenggunaAccessCondition } from '#/libs/penggunaAccess'
import { getPendingSimpanan } from '#/libs/simpananBalance'

import { InsufficientBalanceError } from '../simpanan/errors'
import {
  InsufficientSharesError,
  InvalidConversionDestinationError,
  InvalidPemindahbukuanDestinationError,
  InvalidTransferDestinationError,
} from './errors'

type Transfer = typeof pemindahbukuan.$inferSelect

export const sourceMember = alias(user, 'source_member')
export const destinationMember = alias(user, 'destination_member')
export const creator = alias(user, 'creator')
export const approver = alias(user, 'approver')
export const sourceAccount = alias(akunKeuangan, 'source_account')
export const destinationAccount = alias(akunKeuangan, 'destination_account')

export async function assertBuybackAdmin(connection: typeof db | Transaction, actorId: number) {
  if ((await getPenggunaAccessCondition(connection, actorId)) !== undefined) {
    throw new ForbiddenError()
  }
}

export function assertTransferDestination(
  target: Pick<Transfer, 'idUserSumber' | 'idUserTujuan' | 'tipePemindahbukuan'>,
) {
  if (target.tipePemindahbukuan === 'pembelian_kembali_saham') {
    if (target.idUserTujuan !== null) {
      throw new InvalidPemindahbukuanDestinationError()
    }
    return
  }
  if (target.idUserTujuan === null) {
    throw new InvalidPemindahbukuanDestinationError()
  }
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
    await tx.insert(simpananSaldo).values({ userId }).onConflictDoNothing()
  }

  const balances = await tx
    .select()
    .from(simpananSaldo)
    .where(inArray(simpananSaldo.userId, ids))
    .orderBy(asc(simpananSaldo.userId))
    .for('update')

  return new Map(balances.map((balance) => [balance.userId, balance]))
}

export async function assertAvailableBalance(
  tx: Transaction,
  target: Pick<Transfer, 'idUserSumber' | 'tipePemindahbukuan' | 'nominal' | 'jumlahSaham'>,
  balance: typeof simpananSaldo.$inferSelect,
  excludeId?: number,
) {
  const pending = await getPendingSimpanan(tx, target.idUserSumber, { pemindahbukuanId: excludeId })

  if (target.tipePemindahbukuan === 'saham_ke_saham' || target.tipePemindahbukuan === 'pembelian_kembali_saham') {
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
    ...((target.tipePemindahbukuan === 'tabungan_ke_saham' ||
      target.tipePemindahbukuan === 'pembelian_kembali_saham') &&
    target.agioSaham > 0
      ? [AkunId.AGIOSAHAM]
      : []),
  ]
}
