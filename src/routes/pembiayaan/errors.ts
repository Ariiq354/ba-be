import { HTTPError } from 'elysia'

export class PembiayaanNotFoundError extends HTTPError.id('PEMBIAYAAN_NOT_FOUND_ERROR', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Pembiayaan tidak ditemukan')
    this.id = id
  }
}

export class PembiayaanAlreadyProcessedError extends HTTPError.id('PEMBIAYAAN_ALREADY_PROCESSED_ERROR', 409) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Pembiayaan sudah diproses')
    this.id = id
  }
}

export class PembiayaanNotDeletedError extends HTTPError.id('PEMBIAYAAN_NOT_DELETED_ERROR', 404) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super('Pengajuan pembiayaan pending tidak ditemukan atau tidak dapat dibatalkan')
    this.ids = ids
  }
}

export class InvalidPembiayaanError extends HTTPError.id('INVALID_PEMBIAYAAN_ERROR', 400) {}

export class MarginPembiayaanNotFoundError extends HTTPError.id('MARGIN_PEMBIAYAAN_NOT_FOUND_ERROR', 404) {
  constructor() {
    super('Master margin untuk jumlah pokok tersebut belum tersedia')
  }
}

export class MarginOverrideForbiddenError extends HTTPError.id('MARGIN_OVERRIDE_FORBIDDEN_ERROR', 403) {
  constructor() {
    super('Hanya admin yang boleh mengirim persenMarginTahun')
  }
}
