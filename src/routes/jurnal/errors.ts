import { HTTPError } from 'elysia'

const invalidJurnalMessages = {
  invalid_date: 'Format tanggal transaksi tidak valid',
  invalid_details: 'Detail jurnal tidak valid',
  non_positive_totals: 'Total debit dan kredit harus lebih dari 0',
} as const

type InvalidJurnalReason = keyof typeof invalidJurnalMessages

export class InvalidJurnalError extends HTTPError.id('INVALID_JURNAL_ERROR', 400) {
  readonly reason: InvalidJurnalReason

  constructor({ reason }: { reason: InvalidJurnalReason }) {
    super(invalidJurnalMessages[reason])
    this.reason = reason
  }
}

export class UnbalancedJurnalError extends HTTPError.id('UNBALANCED_JURNAL_ERROR', 400) {
  readonly totalDebit: number
  readonly totalKredit: number

  constructor({ totalDebit, totalKredit }: { totalDebit: number; totalKredit: number }) {
    super(`Total debit (${totalDebit}) harus sama dengan total kredit (${totalKredit})`)
    this.totalDebit = totalDebit
    this.totalKredit = totalKredit
  }
}

export class AkunNotFoundError extends HTTPError.id('ACCOUNT_NOT_FOUND_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Akun dengan ID '${ids.join(', ')}' tidak ditemukan`)
    this.ids = ids
  }
}

export class InactiveAkunError extends HTTPError.id('INACTIVE_ACCOUNT_ERROR', 400) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Akun dengan ID '${ids.join(', ')}' tidak aktif`)
    this.ids = ids
  }
}

export class JurnalNotFoundError extends HTTPError.id('JURNAL_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super(`Jurnal dengan ID '${id}' tidak ditemukan`)
    this.id = id
  }
}

export class JurnalsNotFoundError extends HTTPError.id('JURNAL_NOT_FOUND_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Jurnal dengan ID '${ids.join(', ')}' tidak ditemukan`)
    this.ids = ids
  }
}

export class InvalidJurnalIdsError extends HTTPError.id('INVALID_JURNAL_ERROR', 400) {
  constructor() {
    super('Minimal satu ID jurnal harus diberikan')
  }
}

export class AutoJurnalsImmutableError extends HTTPError.id('AUTO_JURNAL_IMMUTABLE_ERROR', 409) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Jurnal otomatis dengan ID '${ids.join(', ')}' tidak dapat dihapus`)
    this.ids = ids
  }
}
