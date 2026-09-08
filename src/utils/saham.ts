export const HARGA_NOMINAL_SAHAM = 50_000

export function calculateSahamAmounts(
  jumlahSaham: number,
  hargaPerSaham: number,
  hargaNominalPerSaham = HARGA_NOMINAL_SAHAM,
) {
  const jumlah = jumlahSaham
  const hargaJual = hargaPerSaham
  const hargaNominal = hargaNominalPerSaham
  const selisihHarga = hargaJual - hargaNominal

  return {
    nilaiTransaksi: jumlah * hargaJual,
    nilaiNominal: jumlah * hargaNominal,
    agioSaham: jumlah * (selisihHarga < 0 ? -selisihHarga : selisihHarga),
    posisiAgio: selisihHarga > 0 ? 'kredit' : selisihHarga < 0 ? 'debit' : null,
  } as const
}
