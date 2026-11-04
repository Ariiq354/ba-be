import { HTTPError } from 'elysia'

export class InvalidNamaTemplateError extends HTTPError.id('INVALID_NAMA_TEMPLATE_ERROR', 400) {
  constructor() {
    super('Nama template transaksi tidak boleh kosong')
  }
}

export class InactiveAkunError extends HTTPError.id('INACTIVE_ACCOUNT_ERROR', 400) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Akun dengan ID '${ids.join(', ')}' tidak aktif`)
    this.ids = ids
  }
}
