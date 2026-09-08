import type { JurnalModel } from './model'
import { asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm'
import { Effect } from 'effect'
import { db } from '#/database'
import { akun } from '#/database/schema/akun'
import { user } from '#/database/schema/auth'
import { jurnal, jurnalDetail } from '#/database/schema/jurnal'
import { mutasiSimpanan } from '#/database/schema/simpanan'
import { DatabaseError } from '#/utils/errors'
import { getNextTransactionCode } from '#/utils/transaction'
import {
  AccountsNotFoundError,
  AutoJurnalsImmutableError,
  InactiveAccountsError,
  InvalidJurnalError,
  InvalidJurnalIdsError,
  JurnalNotFoundError,
  JurnalsNotFoundError,
  UnbalancedJurnalError,
} from './errors'

function isValidTransactionDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    return false
  }

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (year === 0) {
    return false
  }

  const date = new Date(0)
  date.setUTCHours(0, 0, 0, 0)
  date.setUTCFullYear(year, month - 1, day)

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day
}

export const JurnalService = {
  getPaginatedJurnal: Effect.fn('JurnalService.getPaginatedJurnal')(function* (
    query: JurnalModel['getJurnalQuerySchema'],
  ) {
    return yield* Effect.tryPromise({
      try: async () => {
        const condition = query.search
          ? ilike(jurnal.kodeTransaksi, `%${query.search}%`)
          : undefined
        const offset = (query.page - 1) * query.limit

        const [total, headers] = await Promise.all([
          db.$count(jurnal, condition),
          db
            .select({
              id: jurnal.id,
              kodeTransaksi: jurnal.kodeTransaksi,
              tanggalTransaksi: jurnal.tanggalTransaksi,
              keterangan: jurnal.keterangan,
              userId: jurnal.userId,
              userName: user.name,
              createdAt: jurnal.createdAt,
            })
            .from(jurnal)
            .leftJoin(user, eq(user.id, jurnal.userId))
            .where(condition)
            .orderBy(desc(jurnal.tanggalTransaksi), desc(jurnal.id))
            .limit(query.limit)
            .offset(offset),
        ])

        if (headers.length === 0) {
          return { total, data: [] }
        }

        const details = await db
          .select({
            id: jurnalDetail.id,
            jurnalId: jurnalDetail.jurnalId,
            akunId: jurnalDetail.akunId,
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            debit: jurnalDetail.debit,
            kredit: jurnalDetail.kredit,
          })
          .from(jurnalDetail)
          .innerJoin(akun, eq(akun.id, jurnalDetail.akunId))
          .where(inArray(jurnalDetail.jurnalId, headers.map(header => header.id)))
          .orderBy(asc(jurnalDetail.id))

        const detailsByJurnal = new Map<number, typeof details>()
        for (const detail of details) {
          const headerDetails = detailsByJurnal.get(detail.jurnalId)
          if (headerDetails) {
            headerDetails.push(detail)
          }
          else {
            detailsByJurnal.set(detail.jurnalId, [detail])
          }
        }

        const data = headers.flatMap(header =>
          (detailsByJurnal.get(header.id) ?? []).map(detail => ({
            id: detail.id,
            jurnalId: header.id,
            kodeTransaksi: header.kodeTransaksi,
            tanggalTransaksi: header.tanggalTransaksi,
            keterangan: header.keterangan,
            userId: header.userId,
            userName: header.userName,
            akunId: detail.akunId,
            kodeAkun: detail.kodeAkun,
            namaAkun: detail.namaAkun,
            debit: detail.debit,
            kredit: detail.kredit,
            createdAt: header.createdAt.toISOString(),
          })),
        )

        return { total, data }
      },
      catch: error => new DatabaseError({ error }),
    })
  }),

  getJurnalById: Effect.fn('JurnalService.getJurnalById')(function* (id: number) {
    const result = yield* Effect.tryPromise({
      try: async () => {
        const [header] = await db
          .select({
            id: jurnal.id,
            kodeTransaksi: jurnal.kodeTransaksi,
            tanggalTransaksi: jurnal.tanggalTransaksi,
            keterangan: jurnal.keterangan,
            userId: jurnal.userId,
            userName: user.name,
            createdAt: jurnal.createdAt,
          })
          .from(jurnal)
          .leftJoin(user, eq(user.id, jurnal.userId))
          .where(eq(jurnal.id, id))

        if (!header) {
          return undefined
        }

        const details = await db
          .select({
            id: jurnalDetail.id,
            jurnalId: jurnalDetail.jurnalId,
            akunId: jurnalDetail.akunId,
            kodeAkun: akun.kodeAkun,
            namaAkun: akun.namaAkun,
            debit: jurnalDetail.debit,
            kredit: jurnalDetail.kredit,
          })
          .from(jurnalDetail)
          .innerJoin(akun, eq(akun.id, jurnalDetail.akunId))
          .where(eq(jurnalDetail.jurnalId, id))
          .orderBy(asc(jurnalDetail.id))

        return {
          ...header,
          createdAt: header.createdAt.toISOString(),
          details,
        }
      },
      catch: error => new DatabaseError({ error }),
    })

    if (!result) {
      return yield* new JurnalNotFoundError({ id })
    }

    return result
  }),

  createJurnal: Effect.fn('JurnalService.createJurnal')(function* (
    userId: number,
    data: JurnalModel['createJurnalSchema'],
  ) {
    if (!isValidTransactionDate(data.tanggalTransaksi)) {
      return yield* new InvalidJurnalError({ reason: 'invalid_date' })
    }

    if (
      data.details.length < 2
      || data.details.some(detail =>
        !Number.isInteger(detail.akunId)
        || detail.akunId < 1
        || !Number.isInteger(detail.debit)
        || detail.debit < 0
        || !Number.isInteger(detail.kredit)
        || detail.kredit < 0,
      )
    ) {
      return yield* new InvalidJurnalError({ reason: 'invalid_details' })
    }

    const totalDebit = data.details.reduce((total, detail) => total + detail.debit, 0)
    const totalKredit = data.details.reduce((total, detail) => total + detail.kredit, 0)

    if (totalDebit <= 0 || totalKredit <= 0) {
      return yield* new InvalidJurnalError({ reason: 'non_positive_totals' })
    }

    if (totalDebit !== totalKredit) {
      return yield* new UnbalancedJurnalError({ totalDebit, totalKredit })
    }

    return yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const accountIds = [...new Set(data.details.map(detail => detail.akunId))]
          const accounts = await tx
            .select({
              id: akun.id,
              isActive: akun.isActive,
            })
            .from(akun)
            .where(inArray(akun.id, accountIds))
            .for('share')

          const accountsById = new Map(accounts.map(account => [account.id, account]))
          const missingAccountIds = accountIds.filter(id => !accountsById.has(id))
          if (missingAccountIds.length > 0) {
            throw new AccountsNotFoundError({ ids: missingAccountIds })
          }

          const inactiveAccountIds = accountIds.filter(id => !accountsById.get(id)?.isActive)
          if (inactiveAccountIds.length > 0) {
            throw new InactiveAccountsError({ ids: inactiveAccountIds })
          }

          const dateCode = data.tanggalTransaksi.replaceAll('-', '')
          const codePrefix = `TRX-${dateCode}-`
          await tx.execute(sql`
            select pg_advisory_xact_lock(
              hashtextextended(${`jurnal-code:${dateCode}`}, 0)
            )
          `)

          const existingCodes = await tx
            .select({ kodeTransaksi: jurnal.kodeTransaksi })
            .from(jurnal)
            .where(ilike(jurnal.kodeTransaksi, `${codePrefix}%`))

          const kodeTransaksi = getNextTransactionCode(
            codePrefix,
            existingCodes.map(item => item.kodeTransaksi),
          )
          const [header] = await tx
            .insert(jurnal)
            .values({
              kodeTransaksi,
              tanggalTransaksi: data.tanggalTransaksi,
              keterangan: data.keterangan ?? null,
              userId,
            })
            .returning({ id: jurnal.id })

          if (!header) {
            throw new Error('Jurnal header insert returned no row')
          }

          await tx.insert(jurnalDetail).values(
            data.details.map(detail => ({
              jurnalId: header.id,
              akunId: detail.akunId,
              debit: detail.debit,
              kredit: detail.kredit,
            })),
          )
        }),
      catch: (error) => {
        if (
          error instanceof AccountsNotFoundError
          || error instanceof InactiveAccountsError
        ) {
          return error
        }

        return new DatabaseError({ error })
      },
    })
  }),

  deleteJurnal: Effect.fn('JurnalService.deleteJurnal')(function* (ids: number[]) {
    const uniqueIds = [...new Set(ids)]

    if (uniqueIds.length === 0) {
      return yield* new InvalidJurnalIdsError()
    }

    return yield* Effect.tryPromise({
      try: () =>
        db.transaction(async (tx) => {
          const existing = await tx
            .select({ id: jurnal.id })
            .from(jurnal)
            .where(inArray(jurnal.id, uniqueIds))
            .for('update')

          const existingIds = new Set(existing.map(item => item.id))
          const missingIds = uniqueIds.filter(id => !existingIds.has(id))
          if (missingIds.length > 0) {
            throw new JurnalsNotFoundError({ ids: missingIds })
          }

          const references = await tx
            .select({ jurnalId: mutasiSimpanan.jurnalId })
            .from(mutasiSimpanan)
            .where(inArray(mutasiSimpanan.jurnalId, uniqueIds))

          const referencedIds = new Set(references.map(reference => reference.jurnalId))
          const protectedIds = uniqueIds.filter(id => referencedIds.has(id))
          if (protectedIds.length > 0) {
            throw new AutoJurnalsImmutableError({ ids: protectedIds })
          }

          await tx.delete(jurnal).where(inArray(jurnal.id, uniqueIds))
        }),
      catch: (error) => {
        if (
          error instanceof JurnalsNotFoundError
          || error instanceof AutoJurnalsImmutableError
        ) {
          return error
        }

        return new DatabaseError({ error })
      },
    })
  }),
}
