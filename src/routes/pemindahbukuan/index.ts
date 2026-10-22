import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as PemindahbukuanModel from './model'
import { PemindahbukuanService } from './service'

export const PemindahbukuanRoutes = new Elysia({
  prefix: 'pemindahbukuan',
  tags: ['Pemindahbukuan'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      auth: true,
      query: PemindahbukuanModel.Get.Query,
      response: PemindahbukuanModel.Get.Response,
      detail: {
        description:
          'Admin melihat semua pemindahbukuan; PJ dan anggota melihat transaksi dengan sumber atau tujuan dalam cakupan aksesnya. userId memfilter sumber atau tujuan dalam cakupan tersebut.',
      },
    },
    ({ user, query }) => PemindahbukuanService.getPemindahbukuan(user.id, query),
  )
  .post(
    '/',
    {
      auth: true,
      body: PemindahbukuanModel.Post.Body,
      response: PemindahbukuanModel.Post.Response,
      detail: {
        description:
          'Mengajukan pemindahbukuan pending dan mencadangkan saldo atau saham sumber. Akun ditentukan otomatis. Harga konversi tabungan ke saham dikunci saat pengajuan. Transfer sejenis harus antaranggota berbeda; konversi tabungan ke saham hanya untuk anggota yang sama.',
      },
    },
    async ({ user, body }) => {
      await PemindahbukuanService.createPemindahbukuan(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      auth: true,
      body: PemindahbukuanModel.Delete.Body,
      response: PemindahbukuanModel.Delete.Response,
      detail: {
        description:
          'Membatalkan pending oleh pemilik sumber atau pembuat yang masih punya akses ke sumber. Jika satu ID tidak valid, seluruh penghapusan dibatalkan.',
      },
    },
    async ({ user, body }) => {
      await PemindahbukuanService.deletePemindahbukuan(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/approve',
    {
      admin: true,
      params: PemindahbukuanModel.ByIdApprovePatch.Params,
      response: PemindahbukuanModel.ByIdApprovePatch.Response,
    },
    async ({ user, params }) => {
      await PemindahbukuanService.approvePemindahbukuan(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/:id/reject',
    {
      admin: true,
      params: PemindahbukuanModel.ByIdRejectPatch.Params,
      body: PemindahbukuanModel.ByIdRejectPatch.Body,
      response: PemindahbukuanModel.ByIdRejectPatch.Response,
    },
    async ({ user, params, body }) => {
      const result = await PemindahbukuanService.rejectPemindahbukuan(params.id, user.id, body.alasanPenolakan)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
