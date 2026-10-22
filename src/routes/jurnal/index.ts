import Elysia, { status } from 'elysia'

import { ErrorSchema, SuccessSchema } from '#/libs/errors'
import { AuthMacro } from '#/plugins/macro'

import { jurnalModel } from './model'
import { JurnalService } from './service'

export const JurnalRoutes = new Elysia({ prefix: 'jurnal', tags: ['Jurnal'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: jurnalModel.getJurnalQuerySchema,
      response: {
        200: jurnalModel.getJurnalResponseSchema,
      },
    },
    ({ query }) => JurnalService.getPaginatedJurnal(query),
  )
  .get(
    '/:id',
    {
      admin: true,
      params: jurnalModel.getJurnalByIdParamsSchema,
      response: {
        200: jurnalModel.getJurnalByIdResponseSchema,
        404: ErrorSchema,
      },
    },
    ({ params }) => JurnalService.getJurnalById(params.id),
  )
  .post(
    '/',
    {
      admin: true,
      body: jurnalModel.createJurnalSchema,
      response: {
        201: SuccessSchema,
        400: ErrorSchema,
        404: ErrorSchema,
      },
    },
    async ({ body, user }) => {
      await JurnalService.createJurnal(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
  .delete(
    '/',
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
    async ({ body }) => {
      await JurnalService.deleteJurnal(body.ids)
      return status(200, { message: 'Success' })
    },
  )
