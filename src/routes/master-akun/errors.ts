import { HTTPError } from 'elysia'

export class DuplicateKodeAkunError extends HTTPError.id('DUPLICATE_KODE_AKUN_ERROR', 409) {
  readonly kodeAkun: string

  constructor({ kodeAkun }: { kodeAkun: string }) {
    super(`Kode akun '${kodeAkun}' sudah digunakan`)
    this.kodeAkun = kodeAkun
  }
}

export class AkunUsedByTemplateError extends HTTPError.id('ACCOUNT_USED_BY_TEMPLATE_ERROR', 409) {
  readonly ids: number[]

  constructor({ ids }: { ids: number[] }) {
    super(`Akun dengan ID '${ids.join(', ')}' masih digunakan oleh template transaksi`)
    this.ids = ids
  }
}
