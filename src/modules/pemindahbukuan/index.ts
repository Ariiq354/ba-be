import Elysia, { status } from 'elysia'
import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { pemindahbukuanModel } from './model'
import { PemindahbukuanService } from './service'

export const PemindahbukuanModules = new Elysia({ prefix: 'pemindahbukuan', tags: ['Pemindahbukuan'] })
  .use(AuthMacro)
  .get(
    '/',
    ({ user, query }) => PemindahbukuanService.getPemindahbukuan(user.id, query),
    {
      auth: true,
      query: pemindahbukuanModel.getPemindahbukuanQuerySchema,
      response: {
        200: pemindahbukuanModel.getPemindahbukuanResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
      detail: {
        description: 'Admin melihat semua pemindahbukuan; PJ dan anggota melihat transaksi dengan sumber atau tujuan dalam cakupan aksesnya. userId memfilter sumber atau tujuan dalam cakupan tersebut.',
      },
    },
  )
  .post(
    '/',
    async ({ user, body }) => {
      await PemindahbukuanService.createPemindahbukuan(user.id, body)
      return status(201, { message: 'Success' })
    },
    {
      auth: true,
      body: pemindahbukuanModel.createPemindahbukuanSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
      detail: {
        description: 'Mengajukan pemindahbukuan pending dan mencadangkan saldo atau saham sumber. Akun ditentukan otomatis. Harga konversi tabungan ke saham dikunci saat pengajuan. Transfer sejenis harus antaranggota berbeda; konversi tabungan ke saham hanya untuk anggota yang sama.',
      },
    },
  )
  .delete(
    '/',
    async ({ user, body }) => {
      await PemindahbukuanService.deletePemindahbukuan(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
    {
      auth: true,
      body: pemindahbukuanModel.deletePemindahbukuanSchema,
      response: {
        200: SuccessSchema,
        401: UnauthorizedSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
      detail: {
        description: 'Membatalkan pending oleh pemilik sumber atau pembuat yang masih punya akses ke sumber. Jika satu ID tidak valid, seluruh penghapusan dibatalkan.',
      },
    },
  )
  .patch(
    '/:id/approve',
    async ({ user, params }) => {
      await PemindahbukuanService.approvePemindahbukuan(params.id, user.id)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      params: pemindahbukuanModel.idParamsSchema,
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
  )
  .patch(
    '/:id/reject',
    async ({ user, params, body }) => {
      await PemindahbukuanService.rejectPemindahbukuan(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      params: pemindahbukuanModel.idParamsSchema,
      body: pemindahbukuanModel.rejectPemindahbukuanSchema,
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
  )
