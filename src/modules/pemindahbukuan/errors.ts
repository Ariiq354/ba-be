import { AppError } from '#/utils/errors'

export class InvalidTransferDestinationError extends AppError {
  constructor() {
    super({
      code: 'INVALID_TRANSFER_DESTINATION_ERROR',
      message: 'Pemindahbukuan sejenis harus dilakukan ke anggota lain',
      status: 400,
    })
  }
}

export class InvalidConversionDestinationError extends AppError {
  constructor() {
    super({
      code: 'INVALID_CONVERSION_DESTINATION_ERROR',
      message: 'Konversi tabungan ke saham hanya dapat dilakukan untuk anggota yang sama',
      status: 400,
    })
  }
}

export class InsufficientSharesError extends AppError {
  constructor() {
    super({
      code: 'INSUFFICIENT_SHARES_ERROR',
      message: 'Jumlah saham tersedia tidak mencukupi',
      status: 400,
    })
  }
}

export class PemindahbukuanNotFoundError extends AppError {
  readonly id: number

  constructor({ id }: { id: number }) {
    super({
      code: 'PEMINDAHBUKUAN_NOT_FOUND_ERROR',
      message: 'Pemindahbukuan tidak ditemukan',
      status: 404,
    })
    this.id = id
  }
}

export class PemindahbukuanAlreadyProcessedError extends AppError {
  readonly id: number

  constructor({ id }: { id: number }) {
    super({
      code: 'PEMINDAHBUKUAN_ALREADY_PROCESSED_ERROR',
      message: 'Pemindahbukuan sudah diproses',
      status: 409,
    })
    this.id = id
  }
}

export class PemindahbukuanNotDeletedError extends AppError {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super({
      code: 'PEMINDAHBUKUAN_NOT_DELETED_ERROR',
      message: 'Pemindahbukuan pending tidak ditemukan',
      status: 404,
    })
    this.ids = ids
  }
}
