import Elysia, { status } from 'elysia'

import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/libs/errors'
import { AuthMacro } from '#/plugins/macro'

import { simpananModel } from './model'
import { SimpananService } from './service'

export const SimpananRoutes = new Elysia({ prefix: 'simpanan', tags: ['Simpanan'] })
  .use(AuthMacro)
  .get(
    '/akun-pembayaran/options',
    {
      auth: true,
      response: {
        200: simpananModel.getPaymentAccountOptionsResponseSchema,
        401: UnauthorizedSchema,
      },
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
      query: simpananModel.getSaldoQuerySchema,
      response: {
        200: simpananModel.getSaldoResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
    },
    ({ user, query }) => SimpananService.getSaldo(user.id, query.userId),
  )
  .get(
    '/mutasi',
    {
      auth: true,
      query: simpananModel.getMutasiQuerySchema,
      response: {
        200: simpananModel.getMutasiResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
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
      body: simpananModel.createSetoranSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
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
      body: simpananModel.createPenarikanSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
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
      body: simpananModel.deleteMutasiSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
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
      params: simpananModel.idParamsSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ForbiddenSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        422: ValidationErrorSchema,
      },
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
      params: simpananModel.idParamsSchema,
      body: simpananModel.rejectMutasiSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ForbiddenSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        422: ValidationErrorSchema,
      },
    },
    async ({ user, params, body }) => {
      await SimpananService.rejectMutasi(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
  )
