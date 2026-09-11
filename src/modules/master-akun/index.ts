import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { deleteBulkSchema, idParamsSchema } from '#/utils/schema'
import { masterAkunModel } from './model'
import { MasterAkunService } from './service'

export const MasterAkunModules = new Elysia({ prefix: 'master-akun', tags: ['Master Akun'] })
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => MasterAkunService.getPaginatedAkun(query),
    {
      admin: true,
      query: masterAkunModel.getAkunQuerySchema,
      response: {
        200: masterAkunModel.getAkunResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .post(
    '/',
    async ({ body }) => {
      await MasterAkunService.createAkun(body)
      return status(201, { message: 'Success' })
    },
    {
      admin: true,
      body: masterAkunModel.createAkunSchema,
      response: {
        201: SuccessSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body }) => {
      await MasterAkunService.updateAkun(params.id, body)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      params: idParamsSchema,
      body: masterAkunModel.updateAkunSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        409: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .delete(
    '/',
    async ({ body }) => {
      await MasterAkunService.deleteAkun(body.ids)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      body: deleteBulkSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
