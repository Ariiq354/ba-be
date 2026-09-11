import { AppError } from '#/utils/errors'

export class NotMemberError extends AppError {
  readonly userId: number

  constructor({ userId }: { userId: number }) {
    super({
      code: 'NOT_MEMBER_ERROR',
      message: 'Pengguna belum terdaftar sebagai anggota',
      status: 400,
    })
    this.userId = userId
  }
}

export class InvalidPaymentAccountError extends AppError {
  readonly akunId: number

  constructor({ akunId }: { akunId: number }) {
    super({
      code: 'INVALID_PAYMENT_ACCOUNT_ERROR',
      message: 'Akun pembayaran tidak valid',
      status: 400,
    })
    this.akunId = akunId
  }
}

export class InvalidAccountError extends AppError {
  readonly akunId: number

  constructor({ akunId, message = 'Akun pembayaran tidak tersedia' }: {
    akunId: number
    message?: string
  }) {
    super({
      code: 'INVALID_ACCOUNT_ERROR',
      message,
      status: 400,
    })
    this.akunId = akunId
  }
}

export class AmountOverflowError extends AppError {
  constructor(message = 'Nilai transaksi melebihi batas yang diizinkan') {
    super({
      code: 'AMOUNT_OVERFLOW_ERROR',
      message,
      status: 400,
    })
  }
}

export class HargaSahamNotFoundError extends AppError {
  constructor() {
    super({
      code: 'HARGA_SAHAM_NOT_FOUND_ERROR',
      message: 'Harga saham belum tersedia',
      status: 404,
    })
  }
}

export class InsufficientBalanceError extends AppError {
  constructor() {
    super({
      code: 'INSUFFICIENT_BALANCE_ERROR',
      message: 'Saldo efektif tidak mencukupi',
      status: 400,
    })
  }
}

export class MutasiSimpananNotFoundError extends AppError {
  readonly id: number

  constructor({ id }: { id: number }) {
    super({
      code: 'MUTASI_SIMPANAN_NOT_FOUND_ERROR',
      message: 'Mutasi simpanan tidak ditemukan',
      status: 404,
    })
    this.id = id
  }
}

export class MutasiSimpananAlreadyProcessedError extends AppError {
  readonly id: number

  constructor({ id }: { id: number }) {
    super({
      code: 'MUTASI_SIMPANAN_ALREADY_PROCESSED_ERROR',
      message: 'Mutasi simpanan sudah diproses',
      status: 409,
    })
    this.id = id
  }
}

export class MutasiSimpananNotDeletedError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'MUTASI_SIMPANAN_NOT_DELETED_ERROR',
      message: 'Mutasi simpanan pending tidak ditemukan',
      status: 404,
    })
    this.ids = ids
  }
}

export class InvalidRejectionReasonError extends AppError {
  constructor() {
    super({
      code: 'INVALID_REJECTION_REASON_ERROR',
      message: 'Alasan penolakan wajib diisi',
      status: 400,
    })
  }
}
