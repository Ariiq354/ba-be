import Elysia, { HTTPError, status } from 'elysia'

import { AuthMacro } from '#/plugins/macro'

import * as SimpananModel from './model'
import { SimpananService } from './service'

export const SimpananRoutes = new Elysia({ prefix: 'simpanan', tags: ['Simpanan'] })
  .use(AuthMacro)
  .get(
    '/akun-pembayaran/options',
    {
      auth: true,
      response: SimpananModel.AkunPembayaranOptionsGet.Response,
      detail: {
        description: 'Pilihan akun kas/bank aktif yang dapat digunakan untuk setoran dan penarikan simpanan.',
      },
    },
    () => SimpananService.getPaymentAccountOptions(),
  )
  .get(
    '/saldo',
    {
      auth: true,
      query: SimpananModel.SaldoGet.Query,
      response: SimpananModel.SaldoGet.Response,
    },
    ({ user, query }) => SimpananService.getSaldo(user.id, query.userId),
  )
  .get(
    '/mutasi',
    {
      auth: true,
      query: SimpananModel.MutasiGet.Query,
      response: SimpananModel.MutasiGet.Response,
      detail: {
        description:
          'Admin melihat semua mutasi; PJ melihat mutasi kelompok yang ditanggung dan dirinya sendiri; anggota biasa hanya miliknya. userId memfilter anggota dalam cakupan akses tersebut.',
      },
    },
    ({ user, query }) => SimpananService.getMutasi(user.id, query),
  )
  .post(
    '/mutasi/setoran',
    {
      auth: true,
      body: SimpananModel.MutasiSetoranPost.Body,
      response: SimpananModel.MutasiSetoranPost.Response,
    },
    async ({ user, body }) => {
      await SimpananService.createSetoran(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .post(
    '/mutasi/penarikan',
    {
      auth: true,
      body: SimpananModel.MutasiPenarikanPost.Body,
      response: SimpananModel.MutasiPenarikanPost.Response,
    },
    async ({ user, body }) => {
      await SimpananService.createPenarikan(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/mutasi',
    {
      auth: true,
      body: SimpananModel.MutasiDelete.Body,
      response: SimpananModel.MutasiDelete.Response,
      detail: {
        description:
          'Membatalkan pengajuan pending milik sendiri atau yang dibuat sendiri untuk anggota yang masih berada dalam cakupan akses. Seluruh ID harus valid; jika satu gagal, seluruh penghapusan dibatalkan.',
      },
    },
    async ({ user, body }) => {
      await SimpananService.deleteMutasi(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/mutasi/:id/approve',
    {
      admin: true,
      params: SimpananModel.MutasiByIdApprovePatch.Params,
      response: SimpananModel.MutasiByIdApprovePatch.Response,
    },
    async ({ user, params }) => {
      await SimpananService.approveMutasi(params.id, user.id)
      return status(200, { message: 'Success' })
    },
  )
  .patch(
    '/mutasi/:id/reject',
    {
      admin: true,
      params: SimpananModel.MutasiByIdRejectPatch.Params,
      body: SimpananModel.MutasiByIdRejectPatch.Body,
      response: SimpananModel.MutasiByIdRejectPatch.Response,
    },
    async ({ user, params, body }) => {
      const result = await SimpananService.rejectMutasi(params.id, user.id, body.alasanPenolakan)
      if (result instanceof HTTPError) return result
      return status(200, { message: 'Success' })
    },
  )
