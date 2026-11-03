import Elysia, { status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as PembiayaanModel from './model'
import { PembiayaanService } from './service'

export const PembiayaanRoutes = new Elysia({ prefix: 'pembiayaan', tags: ['Pembiayaan'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      auth: true,
      query: PembiayaanModel.Get.Query,
      response: PembiayaanModel.Get.Response,
      detail: {
        description:
          'Admin melihat semua pembiayaan; PJ melihat dirinya dan anggota kelompoknya; anggota hanya miliknya. userId memfilter anggota dalam cakupan akses tersebut.',
      },
    },
    ({ user, query }) => PembiayaanService.getPembiayaan(user.id, query),
  )
  .post(
    '/simulasi-margin',
    {
      auth: true,
      body: PembiayaanModel.SimulasiMarginPost.Body,
      response: PembiayaanModel.SimulasiMarginPost.Response,
      detail: {
        description:
          'Simulasi margin tanpa menyimpan data dan tanpa pembatasan peran. Jika jumlahPokok tidak dikirim, respons kosong tanpa mencari master margin. Jika persenMarginTahun dikirim, langsung menggunakan persen tersebut tanpa mencari master margin. Jika tidak dikirim, persen mengikuti master margin berdasarkan jumlah pokok. Jika jangkaWaktuBulan belum dikirim, jumlahMargin tidak disertakan. Jika diisi, margin flat tahunan dikalikan tenor bulan/12 dan dibulatkan ke rupiah terdekat.',
      },
    },
    ({ body }) => PembiayaanService.simulasiMargin(body),
  )
  .post(
    '/',
    {
      auth: true,
      body: PembiayaanModel.Post.Body,
      response: PembiayaanModel.Post.Response,
      detail: {
        description:
          'Mengajukan pembiayaan pending. Master margin dan biaya akad otomatis berdasarkan jumlah pokok; persenMarginTahun opsional khusus admin dan harus bilangan bulat. Margin flat tahunan dikalikan tenor bulan/12, dibulatkan ke rupiah terdekat, lalu dikunci bersama biaya akad. Transfer menggunakan BSM; Tunai menggunakan Kas. Belum ada jurnal sampai approval.',
      },
    },
    async ({ user, body }) => {
      await PembiayaanService.createPembiayaan(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      auth: true,
      body: PembiayaanModel.Delete.Body,
      response: PembiayaanModel.Delete.Response,
      detail: {
        description:
          'Membatalkan pending milik sendiri atau yang dibuat sendiri untuk anggota yang masih dapat diakses. Jika satu ID tidak valid, seluruh penghapusan dibatalkan.',
      },
    },
    async ({ user, body }) => {
      await PembiayaanService.deletePembiayaan(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/approve',
    {
      admin: true,
      params: PembiayaanModel.ByIdApprovePatch.Params,
      response: PembiayaanModel.ByIdApprovePatch.Response,
      detail: {
        description:
          'Approval sekaligus mencatat pencairan, piutang pokok + margin, dan margin ditangguhkan. Biaya akad dicatat sebagai penerimaan Kas/Bank dan pendapatan administrasi akad, tanpa mengurangi pokok atau menambah tagihan. Semua jurnal dan status disimpan atomik; transaksi yang sudah diproses tidak dapat diproses ulang.',
      },
    },
    async ({ user, params }) => {
      await PembiayaanService.approvePembiayaan(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/reject',
    {
      admin: true,
      params: PembiayaanModel.ByIdRejectPatch.Params,
      body: PembiayaanModel.ByIdRejectPatch.Body,
      response: PembiayaanModel.ByIdRejectPatch.Response,
    },
    async ({ user, params, body }) => {
      await PembiayaanService.rejectPembiayaan(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
  )
