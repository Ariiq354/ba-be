import { HTTPError } from 'elysia'

export class InvalidShuError extends HTTPError.id('INVALID_SHU_ERROR', 400) {}

export class ShuAlreadyExistsError extends HTTPError.id('SHU_ALREADY_EXISTS_ERROR', 409) {
  constructor() {
    super('SHU untuk tahun tersebut sudah disimpan')
  }
}

export class ShuNotFoundError extends HTTPError.id('SHU_NOT_FOUND_ERROR', 404) {
  constructor() {
    super('Data SHU untuk tahun tersebut belum tersedia')
  }
}

export class ShuAlreadyTransferredError extends HTTPError.id('SHU_ALREADY_TRANSFERRED_ERROR', 409) {
  constructor() {
    super('SHU untuk tahun tersebut sudah dialihkan')
  }
}

export class InvalidShuHistoryError extends HTTPError.id('INVALID_SHU_HISTORY_ERROR', 409) {
  constructor(idUser: number, kodeTransaksi: string) {
    super(`Riwayat simpanan pengguna ${idUser} tidak mencukupi untuk transaksi ${kodeTransaksi}`)
  }
}

export class InvalidShuApprovalDateError extends HTTPError.id('INVALID_SHU_APPROVAL_DATE_ERROR', 409) {
  constructor(kodeTransaksi: string) {
    super(`Tanggal approval transaksi ${kodeTransaksi} tidak tersedia atau tidak valid`)
  }
}
