import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as AngsuranModel from './model'
import { AngsuranService } from './service'

export const AngsuranRoutes = new Elysia({ prefix: 'angsuran', tags: ['Angsuran'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      auth: true,
      query: AngsuranModel.Get.Query,
      response: AngsuranModel.Get.Response,
      detail: {
        description:
          'Admin melihat semua angsuran; PJ melihat dirinya dan anggota kelompoknya; anggota hanya miliknya. Mendukung filter pembiayaan, anggota, dan status approval.',
      },
    },
    ({ user, query }) => AngsuranService.getAngsuran(user.id, query),
  )
  .get(
    '/ringkasan',
    {
      auth: true,
      query: AngsuranModel.RingkasanGet.Query,
      response: AngsuranModel.RingkasanGet.Response,
      detail: {
        description:
          'Ringkasan total tagihan dan pembayaran approved. Sugesti bulanan dihitung kumulatif mulai satu bulan setelah tanggal pembiayaan, pada tanggal yang sama (atau akhir bulan jika lebih pendek), menggunakan tanggal Jakarta. Semua pembayaran approved mengurangi target tanpa memandang bulan pembayarannya. Target berhenti bertambah setelah tenor berakhir. Pembagian pokok/margin tidak ditampilkan.',
      },
    },
    ({ user, query }) => AngsuranService.getRingkasan(user.id, query.pembiayaanId),
  )
  .post(
    '/',
    {
      auth: true,
      body: AngsuranModel.Post.Body,
      response: AngsuranModel.Post.Response,
      detail: {
        description:
          'Mengajukan angsuran pending untuk pembiayaan approved. Nominal bebas dan tidak boleh melebihi sisa tagihan approved. Pending tidak mencadangkan tagihan. Tanggal otomatis Jakarta; Transfer menggunakan BSI, Tunai menggunakan Kas. Belum ada jurnal sampai approval.',
      },
    },
    async ({ user, body }) => {
      await AngsuranService.createAngsuran(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      auth: true,
      body: AngsuranModel.Delete.Body,
      response: AngsuranModel.Delete.Response,
      detail: {
        description:
          'Membatalkan pending milik sendiri atau yang dibuat sendiri untuk anggota yang masih dapat diakses. Jika satu ID tidak valid, seluruh penghapusan dibatalkan.',
      },
    },
    async ({ user, body }) => {
      await AngsuranService.deleteAngsuran(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/approve',
    {
      admin: true,
      params: AngsuranModel.ByIdApprovePatch.Params,
      response: AngsuranModel.ByIdApprovePatch.Response,
      detail: {
        description:
          'Approval memvalidasi ulang sisa tagihan dan membuat jurnal penerimaan Kas/Bank, pengurangan piutang, serta pengakuan pendapatan margin dari margin ditangguhkan. Rasio margin = jumlah margin / total tagihan, dengan pembulatan kumulatif rupiah. Approval dan jurnal atomik; approval bersamaan tidak dapat melebihi sisa tagihan.',
      },
    },
    async ({ user, params }) => {
      await AngsuranService.approveAngsuran(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/reject',
    {
      admin: true,
      params: AngsuranModel.ByIdRejectPatch.Params,
      body: AngsuranModel.ByIdRejectPatch.Body,
      response: AngsuranModel.ByIdRejectPatch.Response,
    },
    async ({ user, params, body }) => {
      await AngsuranService.rejectAngsuran(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
  )
