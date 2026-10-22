import { HTTPError } from 'elysia'

export class HargaSahamNotFoundError extends HTTPError.id('HARGA_SAHAM_NOT_FOUND_ERROR', 404) {
  constructor() {
    super('Harga saham belum tersedia')
  }
}
