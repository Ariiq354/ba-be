import type { db } from '#/database'
import { and, eq, exists, or } from 'drizzle-orm'
import { user } from '#/database/schema/auth'
import { kelompokPenanggungJawab } from '#/database/schema/kelompok'
import { ItemNotFoundError, PenggunaAccessDeniedError } from './errors'

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0]
type Connection = typeof db | Transaction

export async function getPenggunaAccessCondition(connection: Connection, actorId: number) {
  const [actor] = await connection
    .select({ role: user.role, idKelompok: user.idKelompok })
    .from(user)
    .where(eq(user.id, actorId))
    .for('share')

  if (!actor) {
    throw new ItemNotFoundError({ id: actorId, message: 'Pengguna tidak ditemukan' })
  }

  if (actor.role === 'admin') {
    return undefined
  }

  if (actor.role === 'pj') {
    const assignment = connection
      .select({ userId: kelompokPenanggungJawab.userId })
      .from(kelompokPenanggungJawab)
      .where(and(
        eq(kelompokPenanggungJawab.userId, actorId),
        eq(kelompokPenanggungJawab.kelompokId, actor.idKelompok),
      ))

    return or(
      eq(user.id, actorId),
      and(eq(user.idKelompok, actor.idKelompok), exists(assignment)),
    )
  }

  return eq(user.id, actorId)
}

export async function assertPenggunaAccess(connection: Connection, actorId: number, targetId: number) {
  if (actorId === targetId) {
    return
  }

  const condition = await getPenggunaAccessCondition(connection, actorId)
  const [target] = await connection
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.id, targetId), condition))
    .for('share')

  if (!target) {
    throw new PenggunaAccessDeniedError()
  }
}
