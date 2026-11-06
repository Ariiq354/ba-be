import { eq, inArray } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

import type { db, Transaction } from '#/libs/database'

import { akun } from '#/libs/database/schema/akun'
import { user } from '#/libs/database/schema/auth'
import { userProfile } from '#/libs/database/schema/users'

import { InvalidAccountError, NotMemberError } from './errors'

export const member = alias(user, 'member')
export const creator = alias(user, 'creator')
export const approver = alias(user, 'approver')

export async function assertMember(connection: typeof db | Transaction, userId: number) {
  const [profile] = await connection
    .select({ noAnggota: userProfile.noAnggota })
    .from(userProfile)
    .where(eq(userProfile.idUser, userId))

  if (!profile?.noAnggota?.trim()) {
    throw new NotMemberError({ userId })
  }
}

export async function assertPaymentAccount(tx: Transaction, akunId: number) {
  const [paymentAccount] = await tx
    .select({ id: akun.id, isActive: akun.isActive })
    .from(akun)
    .where(eq(akun.id, akunId))

  if (!paymentAccount?.isActive) {
    throw new InvalidAccountError({ akunId })
  }
}

export async function assertActiveAccounts(tx: Transaction, accountIds: number[]) {
  const accounts = await tx
    .select({ id: akun.id, isActive: akun.isActive })
    .from(akun)
    .where(inArray(akun.id, accountIds))
  const activeIds = new Set(accounts.filter((account) => account.isActive).map((account) => account.id))
  const invalidId = accountIds.find((id) => !activeIds.has(id))

  if (invalidId !== undefined) {
    throw new InvalidAccountError({
      akunId: invalidId,
      message: 'Akun jurnal yang diperlukan tidak tersedia',
    })
  }
}
