import Elysia, { status } from 'elysia'
import { ErrorSchema, ForbiddenSchema, SuccessSchema, UnauthorizedSchema, ValidationErrorSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { simpananModel } from './model'
import { SimpananService } from './service'

export const SimpananModules = new Elysia({ prefix: 'simpanan', tags: ['Simpanan'] })
  .use(AuthMacro)
  .get(
    '/saldo',
    ({ user }) => SimpananService.getSaldo(user.id),
    {
      auth: true,
      response: {
        200: simpananModel.getSaldoResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
      },
    },
  )
  .get(
    '/mutasi',
    ({ user, query }) => SimpananService.getMutasi(user.id, user.role === 'admin', query),
    {
      auth: true,
      query: simpananModel.getMutasiQuerySchema,
      response: {
        200: simpananModel.getMutasiResponseSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        422: ValidationErrorSchema,
      },
    },
  )
  .post(
    '/mutasi/setoran',
    async ({ user, body }) => {
      await SimpananService.createSetoran(user.id, body)
      return status(201, { message: 'Success' })
    },
    {
      auth: true,
      body: simpananModel.createSetoranSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        404: ErrorSchema,
        422: ValidationErrorSchema,
      },
    },
  )
  .post(
    '/mutasi/penarikan',
    async ({ user, body }) => {
      await SimpananService.createPenarikan(user.id, body)
      return status(201, { message: 'Success' })
    },
    {
      auth: true,
      body: simpananModel.createPenarikanSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        401: UnauthorizedSchema,
        422: ValidationErrorSchema,
      },
    },
  )
  .delete(
    '/mutasi',
    async ({ user, body }) => {
      await SimpananService.deleteMutasi(user.id, body.ids)
      return status(200, { message: 'Success' })
    },
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
    },
  )
  .patch(
    '/mutasi/:id/approve',
    async ({ user, params }) => {
      await SimpananService.approveMutasi(params.id, user.id)
      return status(200, { message: 'Success' })
    },
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
  )
  .patch(
    '/mutasi/:id/reject',
    async ({ user, params, body }) => {
      await SimpananService.rejectMutasi(params.id, user.id, body.alasanPenolakan)
      return status(200, { message: 'Success' })
    },
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
  )
