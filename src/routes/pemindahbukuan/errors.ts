import { HTTPError } from 'elysia'

export class InvalidTransferDestinationError extends HTTPError.id('INVALID_TRANSFER_DESTINATION_ERROR', 400) {
  constructor() {
    super('Pemindahbukuan sejenis harus dilakukan ke anggota lain')
  }
}

export class InvalidConversionDestinationError extends HTTPError.id('INVALID_CONVERSION_DESTINATION_ERROR', 400) {
  constructor() {
    super('Konversi tabungan ke saham hanya dapat dilakukan untuk anggota yang sama')
  }
}

export class InsufficientSharesError extends HTTPError.id('INSUFFICIENT_SHARES_ERROR', 400) {
  constructor() {
    super('Jumlah saham tersedia tidak mencukupi')
  }
}

export class PemindahbukuanNotFoundError extends HTTPError.id('PEMINDAHBUKUAN_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Pemindahbukuan tidak ditemukan')
    this.id = id
  }
}

export class PemindahbukuanAlreadyProcessedError extends HTTPError.id('PEMINDAHBUKUAN_ALREADY_PROCESSED_ERROR', 409) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Pemindahbukuan sudah diproses')
    this.id = id
  }
}

export class PemindahbukuanNotDeletedError extends HTTPError.id('PEMINDAHBUKUAN_NOT_DELETED_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super('Pemindahbukuan pending tidak ditemukan')
    this.ids = ids
  }
}
