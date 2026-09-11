import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { jurnalModel } from './model'
import { JurnalService } from './service'

export const JurnalModules = new Elysia({ prefix: 'jurnal', tags: ['Jurnal'] })
  .use(AuthMacro)
  .get(
    '/',
    ({ query }) => JurnalService.getPaginatedJurnal(query),
    {
      admin: true,
      query: jurnalModel.getJurnalQuerySchema,
      response: {
        200: jurnalModel.getJurnalResponseSchema,
      },
    },
  )
  .get(
    '/:id',
    ({ params }) => JurnalService.getJurnalById(params.id),
    {
      admin: true,
      params: jurnalModel.getJurnalByIdParamsSchema,
      response: {
        200: jurnalModel.getJurnalByIdResponseSchema,
        404: ErrorSchema,
      },
    },
  )
  .post(
    '/',
    async ({ body, user }) => {
      await JurnalService.createJurnal(user.id, body)
      return status(201, { message: 'Success' })
    },
    {
      admin: true,
      body: jurnalModel.createJurnalSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
      },
    },
  )
  .delete(
    '/',
    async ({ body }) => {
      await JurnalService.deleteJurnal(body.ids)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      body: jurnalModel.deleteJurnalSchema,
      response: {
        200: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
    },
  )
