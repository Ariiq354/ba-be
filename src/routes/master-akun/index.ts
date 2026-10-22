import Elysia, { status } from 'elysia'

import { ErrorSchema, SuccessSchema } from '#/libs/errors'
import { deleteBulkSchema, idParamsSchema } from '#/libs/schema'
import { AuthMacro } from '#/plugins/macro'

import { masterAkunModel } from './model'
import { MasterAkunService } from './service'

export const MasterAkunRoutes = new Elysia({ prefix: 'master-akun', tags: ['Master Akun'] })
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: masterAkunModel.getAkunQuerySchema,
      response: {
        200: masterAkunModel.getAkunResponseSchema,
      },
    },
    async ({ query }) => MasterAkunService.getPaginatedAkun(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: masterAkunModel.createAkunSchema,
      response: {
        201: SuccessSchema,
        409: ErrorSchema,
      },
    },
    async ({ body }) => {
      await MasterAkunService.createAkun(body)
      return status(201, { message: 'Success' })
    },
  )
  .patch(
    '/:id',
    {
      admin: true,
      params: idParamsSchema,
      body: masterAkunModel.updateAkunSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
    },
    async ({ params, body }) => {
      await MasterAkunService.updateAkun(params.id, body)
      return status(200, { message: 'Success' })
    },
  )
  .delete(
    '/',
    {
      admin: true,
      body: deleteBulkSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
      },
    },
    async ({ body }) => {
      await MasterAkunService.deleteAkun(body.ids)
      return status(200, { message: 'Success' })
    },
  )
