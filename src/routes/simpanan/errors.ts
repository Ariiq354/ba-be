import { HTTPError } from 'elysia'

export class NotMemberError extends HTTPError.id('NOT_MEMBER_ERROR', 400) {
  readonly userId: number

  constructor({ userId }: { userId: number }) {
    super('Pengguna belum terdaftar sebagai anggota')
    this.userId = userId
  }
}

export class InvalidPaymentAccountError extends HTTPError.id('INVALID_PAYMENT_ACCOUNT_ERROR', 400) {
  readonly akunId: number

  constructor({ akunId }: { akunId: number }) {
    super('Akun pembayaran tidak valid')
    this.akunId = akunId
  }
}

export class InvalidAccountError extends HTTPError.id('INVALID_ACCOUNT_ERROR', 400) {
  readonly akunId: number

  constructor({ akunId, message = 'Akun pembayaran tidak tersedia' }: { akunId: number; message?: string }) {
    super(message)
    this.akunId = akunId
  }
}

export class HargaSahamNotFoundError extends HTTPError.id('HARGA_SAHAM_NOT_FOUND_ERROR', 404) {
  constructor() {
    super('Harga saham belum tersedia')
  }
}

export class InsufficientBalanceError extends HTTPError.id('INSUFFICIENT_BALANCE_ERROR', 400) {
  constructor() {
    super('Saldo efektif tidak mencukupi')
  }
}

export class MutasiSimpananNotFoundError extends HTTPError.id('MUTASI_SIMPANAN_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Mutasi simpanan tidak ditemukan')
    this.id = id
  }
}

export class MutasiSimpananAlreadyProcessedError extends HTTPError.id('MUTASI_SIMPANAN_ALREADY_PROCESSED_ERROR', 409) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Mutasi simpanan sudah diproses')
    this.id = id
  }
}

export class MutasiSimpananNotDeletedError extends HTTPError.id('MUTASI_SIMPANAN_NOT_DELETED_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super('Mutasi simpanan pending tidak ditemukan')
    this.ids = ids
  }
}

export class InvalidRejectionReasonError extends HTTPError.id('INVALID_REJECTION_REASON_ERROR', 400) {
  constructor() {
    super('Alasan penolakan wajib diisi')
  }
}
