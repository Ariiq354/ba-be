import { HTTPError } from 'elysia'

export class AngsuranNotFoundError extends HTTPError.id('ANGSURAN_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Angsuran tidak ditemukan')
    this.id = id
  }
}

export class AngsuranAlreadyProcessedError extends HTTPError.id('ANGSURAN_ALREADY_PROCESSED_ERROR', 409) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Angsuran sudah diproses')
    this.id = id
  }
}

export class AngsuranNotDeletedError extends HTTPError.id('ANGSURAN_NOT_DELETED_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super('Pengajuan angsuran pending tidak ditemukan atau tidak dapat dibatalkan')
    this.ids = ids
  }
}

export class PembiayaanNotApprovedError extends HTTPError.id('PEMBIAYAAN_NOT_APPROVED_ERROR', 400) {
  constructor() {
    super('Angsuran hanya tersedia untuk pembiayaan yang sudah disetujui')
  }
}

export class AngsuranExceedsRemainingError extends HTTPError.id('ANGSURAN_EXCEEDS_REMAINING_ERROR', 409) {
  constructor() {
    super('Jumlah pembayaran melebihi sisa tagihan pembiayaan')
  }
}
