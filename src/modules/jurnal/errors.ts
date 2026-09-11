import { AppError } from '#/utils/errors'

export class InvalidJurnalError extends AppError {
  readonly reason: 'invalid_date' | 'invalid_details' | 'non_positive_totals'

  constructor({ reason }: { reason: 'invalid_date' | 'invalid_details' | 'non_positive_totals' }) {
    super({
      code: 'INVALID_JURNAL_ERROR',
      message: reason === 'invalid_date'
        ? 'Format tanggal transaksi tidak valid'
        : reason === 'non_positive_totals'
          ? 'Total debit dan kredit harus lebih dari 0'
          : 'Detail jurnal tidak valid',
      status: 400,
    })
    this.reason = reason
  }
}

export class UnbalancedJurnalError extends AppError {
  readonly totalDebit: number
  readonly totalKredit: number

  constructor({ totalDebit, totalKredit }: { totalDebit: number, totalKredit: number }) {
    super({
      code: 'UNBALANCED_JURNAL_ERROR',
      message: `Total debit (${totalDebit}) harus sama dengan total kredit (${totalKredit})`,
      status: 400,
    })
    this.totalDebit = totalDebit
    this.totalKredit = totalKredit
  }
}

export class AccountsNotFoundError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'ACCOUNT_NOT_FOUND_ERROR',
      message: `Akun dengan ID '${ids.join(', ')}' tidak ditemukan`,
      status: 404,
    })
    this.ids = ids
  }
}

export class InactiveAccountsError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'INACTIVE_ACCOUNT_ERROR',
      message: `Akun dengan ID '${ids.join(', ')}' tidak aktif`,
      status: 400,
    })
    this.ids = ids
  }
}

export class JurnalNotFoundError extends AppError {
  readonly id: number

  constructor({ id }: { id: number }) {
    super({
      code: 'JURNAL_NOT_FOUND_ERROR',
      message: `Jurnal dengan ID '${id}' tidak ditemukan`,
      status: 404,
    })
    this.id = id
  }
}

export class JurnalsNotFoundError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'JURNAL_NOT_FOUND_ERROR',
      message: `Jurnal dengan ID '${ids.join(', ')}' tidak ditemukan`,
      status: 404,
    })
    this.ids = ids
  }
}

export class InvalidJurnalIdsError extends AppError {
  constructor() {
    super({
      code: 'INVALID_JURNAL_ERROR',
      message: 'Minimal satu ID jurnal harus diberikan',
      status: 400,
    })
  }
}

export class AutoJurnalsImmutableError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'AUTO_JURNAL_IMMUTABLE_ERROR',
      message: `Jurnal otomatis dengan ID '${ids.join(', ')}' tidak dapat dihapus`,
      status: 409,
    })
    this.ids = ids
  }
}
