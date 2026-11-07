import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as AngsuranEksternalModel from './model'
import { AngsuranEksternalService } from './service'

export const AngsuranEksternalRoutes = new Elysia({ prefix: 'angsuran-eksternal', tags: ['Angsuran Eksternal'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: AngsuranEksternalModel.Get.Query,
      response: AngsuranEksternalModel.Get.Response,
      detail: {
        description:
          'Riwayat pembayaran utang koperasi, khusus admin. Mendukung filter pembiayaanEksternalId dan pencarian kode angsuran atau kode pembiayaan. Semua pembayaran langsung dibukukan tanpa approval.',
      },
    },
    ({ query }) => AngsuranEksternalService.getAngsuran(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: AngsuranEksternalModel.Post.Body,
      response: AngsuranEksternalModel.Post.Response,
      detail: {
        description:
          'Langsung membukukan pembayaran utang eksternal tanpa approval. FE cukup mengirim jumlahPembayaran sebagai satu nominal total, tanpa metodePembayaran; akun pembayaran selalu BSI. Backend menghitung margin dari rasio margin kontrak / (pokok + margin kontrak), dengan pembulatan kumulatif rupiah agar pelunasan tepat; pokok adalah total pembayaran dikurangi margin tersebut. Mengikuti sistem lama: debit Hutang Pembiayaan dan kredit BSI sebesar total pembayaran. Jika ada margin, tambahkan debit Biaya Margin Pembiayaan dan kredit Hutang Margin Pembiayaan sebesar margin dalam jurnal yang sama. Pembayaran tidak boleh melebihi sisa pembiayaan. Tanggal default hari ini Jakarta, tidak boleh sebelum pembiayaan atau di masa depan. Mengunci kontrak untuk mencegah pembayaran bersamaan melebihi saldo. Pembayaran dan jurnal atomik, userId jurnal adalah admin pencatat. Tidak menyediakan edit/hapus.',
      },
    },
    async ({ user, body }) => {
      await AngsuranEksternalService.createAngsuran(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
