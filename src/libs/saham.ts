import { HARGA_NOMINAL_SAHAM } from './config'

export function calculateSahamAmounts(
  jumlahSaham: number,
  hargaPerSaham: number,
  hargaNominalPerSaham = HARGA_NOMINAL_SAHAM,
) {
  return {
    nilaiTransaksi: jumlahSaham * hargaPerSaham,
    nilaiNominal: jumlahSaham * hargaNominalPerSaham,
    agioSaham: jumlahSaham * Math.abs(hargaPerSaham - hargaNominalPerSaham),
  } as const
}
