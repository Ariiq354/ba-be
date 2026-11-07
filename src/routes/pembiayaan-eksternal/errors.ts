import { HTTPError } from 'elysia'

export class PembiayaanEksternalNotFoundError extends HTTPError.id('PEMBIAYAAN_EKSTERNAL_NOT_FOUND', 404) {
  readonly id: number

  constructor({ id }: { id: number }) {
    super('Pembiayaan eksternal tidak ditemukan')
    this.id = id
  }
}

export class InvalidPembiayaanEksternalError extends HTTPError.id('INVALID_PEMBIAYAAN_EKSTERNAL', 400) {}

export class InvalidExternalAccountError extends HTTPError.id('INVALID_EXTERNAL_ACCOUNT', 400) {
  readonly akunId: number

  constructor({ akunId }: { akunId: number }) {
    super('Akun jurnal pembiayaan eksternal tidak tersedia, tidak aktif, atau kategori/saldo normal tidak sesuai')
    this.akunId = akunId
  }
}
