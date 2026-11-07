import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as PembiayaanEksternalModel from './model'
import { PembiayaanEksternalService } from './service'

export const PembiayaanEksternalRoutes = new Elysia({
  prefix: 'pembiayaan-eksternal',
  tags: ['Pembiayaan Eksternal'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: PembiayaanEksternalModel.Get.Query,
      response: PembiayaanEksternalModel.Get.Response,
      detail: {
        description:
          'Daftar utang koperasi kepada pihak luar, khusus admin. Pencarian berdasarkan kode, pemberi pembiayaan, nomor akad, atau tujuan. Saldo dihitung dari seluruh angsuran eksternal yang langsung dibukukan; tidak ada status approval.',
      },
    },
    ({ query }) => PembiayaanEksternalService.getPembiayaan(query),
  )
  .get(
    '/options',
    {
      admin: true,
      response: PembiayaanEksternalModel.OptionsGet.Response,
      detail: { description: 'Pilihan pembiayaan eksternal yang belum lunas untuk pencatatan angsuran, khusus admin.' },
    },
    () => PembiayaanEksternalService.getOptions(),
  )
  .post(
    '/',
    {
      admin: true,
      body: PembiayaanEksternalModel.Post.Body,
      response: PembiayaanEksternalModel.Post.Response,
      detail: {
        description:
          'Langsung membukukan penerimaan dana/barang dan utang koperasi, tanpa pengajuan atau approval. Debit akun aktiva pilihan, kredit Hutang Pembiayaan sebesar pokok. Margin diisi nominal sesuai kontrak (nol untuk nonmargin), bukan master margin anggota; diakui sebagai biaya ketika dibayar. Tanggal default hari ini Jakarta, tidak boleh masa depan. Jurnal memakai userId admin pencatat. Semua disimpan atomik; tidak menyediakan edit/hapus transaksi yang sudah dibukukan.',
      },
    },
    async ({ user, body }) => {
      await PembiayaanEksternalService.createPembiayaan(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
