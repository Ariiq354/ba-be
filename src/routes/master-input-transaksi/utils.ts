import { asc, inArray } from 'drizzle-orm'

import type { Transaction } from '#/libs/database'

import { akun } from '#/libs/database/schema/akun'
import { ItemsNotFoundError } from '#/libs/errors'

import { InactiveAkunError } from './errors'

export async function validateTemplateAkun(tx: Transaction, akunDebitId: number, akunKreditId: number) {
  const ids = [...new Set([akunDebitId, akunKreditId])]
  const rows = await tx
    .select({ id: akun.id, isActive: akun.isActive })
    .from(akun)
    .where(inArray(akun.id, ids))
    .orderBy(asc(akun.id))

  const existingIds = new Set(rows.map((row) => row.id))
  const missingIds = ids.filter((id) => !existingIds.has(id))
  if (missingIds.length > 0) {
    throw new ItemsNotFoundError({
      ids: missingIds,
      message: `Akun dengan ID '${missingIds.join(', ')}' tidak ditemukan`,
    })
  }

  const inactiveIds = rows.filter((row) => !row.isActive).map((row) => row.id)
  if (inactiveIds.length > 0) {
    throw new InactiveAkunError({ ids: inactiveIds })
  }
}
