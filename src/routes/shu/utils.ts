import type { db, Transaction } from '#/libs/database'

import { getJakartaDate } from '#/libs/date'

import { buildLaporanAkun, buildRingkasanLabaRugi, getMutasiBulanan } from '../jurnal/utils'
import { InvalidShuApprovalDateError, InvalidShuError, InvalidShuHistoryError } from './errors'

export interface ShuMutation {
  idUser: number
  approvedAt: Date | null
  kodeTransaksi: string
  jumlah: number
}

export function calculateBobot(tahun: number, mutations: ShuMutation[]) {
  const year = String(tahun).padStart(4, '0')
  const start = Date.parse(`${year}-01-01T00:00:00Z`) / 86400000
  const end = Date.parse(`${year}-12-31T00:00:00Z`) / 86400000 + 1
  const histories = new Map<number, { bobot: bigint; lots: Array<{ jumlah: bigint; mulai: number }> }>()
  const ordered = mutations
    .map((mutation) => {
      if (!mutation.approvedAt || !Number.isFinite(mutation.approvedAt.getTime())) {
        throw new InvalidShuApprovalDateError(mutation.kodeTransaksi)
      }
      return { ...mutation, approvedAt: mutation.approvedAt }
    })
    .toSorted(
      (a, b) => a.approvedAt.getTime() - b.approvedAt.getTime() || a.kodeTransaksi.localeCompare(b.kodeTransaksi),
    )

  for (const mutation of ordered) {
    const day = Date.parse(`${getJakartaDate(mutation.approvedAt)}T00:00:00Z`) / 86400000
    if (day >= end) continue

    let history = histories.get(mutation.idUser)
    if (!history) {
      history = { bobot: 0n, lots: [] }
      histories.set(mutation.idUser, history)
    }

    if (mutation.jumlah > 0) {
      history.lots.push({ jumlah: BigInt(mutation.jumlah), mulai: Math.max(start, day) })
      continue
    }

    let remaining = -BigInt(mutation.jumlah)
    while (remaining > 0n) {
      const lot = history.lots.at(-1)
      if (!lot) {
        throw new InvalidShuHistoryError(mutation.idUser, mutation.kodeTransaksi)
      }

      const taken = remaining < lot.jumlah ? remaining : lot.jumlah
      // Preserve the contribution already earned by the withdrawn portion.
      history.bobot += taken * BigInt(Math.max(0, day - lot.mulai))
      lot.jumlah -= taken
      remaining -= taken
      if (lot.jumlah === 0n) history.lots.pop()
    }
  }

  return new Map(
    [...histories].map(([idUser, history]) => [
      idUser,
      history.lots.reduce((total, lot) => total + lot.jumlah * BigInt(end - lot.mulai), history.bobot),
    ]),
  )
}

export function allocateShu(total: number, bobot: Map<number, bigint>) {
  const totalBobot = [...bobot.values()].reduce((sum, value) => sum + value, 0n)
  if (total > 0 && totalBobot === 0n) {
    throw new InvalidShuError('Bagian SHU tidak dapat dibagikan karena tidak ada bobot simpanan')
  }

  const allocations = [...bobot].map(([idUser, weight]) => {
    const numerator = BigInt(total) * weight
    return {
      idUser,
      jumlah: totalBobot === 0n ? 0 : Number(numerator / totalBobot),
      remainder: totalBobot === 0n ? 0n : numerator % totalBobot,
    }
  })
  allocations.sort((a, b) => (a.remainder === b.remainder ? a.idUser - b.idUser : a.remainder > b.remainder ? -1 : 1))
  const remaining = total - allocations.reduce((sum, row) => sum + row.jumlah, 0)
  for (let index = 0; index < remaining; index++) {
    allocations[index]!.jumlah++
  }
  return new Map(allocations.map((row) => [row.idUser, row.jumlah]))
}

export async function getLabaShu(connection: typeof db | Transaction, tahun: number) {
  const rows = await getMutasiBulanan(tahun, ['pendapatan', 'biaya'], connection)
  return buildRingkasanLabaRugi(buildLaporanAkun(rows, ['pendapatan', 'biaya'])).totalLabaRugi
}
