import Elysia, { status } from 'elysia'
import { ErrorSchema, SuccessSchema } from '#/utils/errors'
import { AuthMacro } from '#/utils/macro'
import { deleteBulkSchema, idParamsSchema } from '#/utils/schema'
import { masterMarginModel } from './model'
import { MasterMarginService } from './service'

export const MasterMarginModules = new Elysia({
  prefix: 'master-margin',
  tags: ['Master Margin'],
})
  .use(AuthMacro)
  .get(
    '/',
    async ({ query }) => MasterMarginService.getPaginatedMargin(query),
    {
      admin: true,
      query: masterMarginModel.getMarginQuerySchema,
      response: {
        200: masterMarginModel.getMarginResponseSchema,
        500: ErrorSchema,
      },
    },
  )
  .post(
    '/',
    async ({ body }) => {
      await MasterMarginService.createMargin(body)
      return status(201, { message: 'Success' })
    },
    {
      admin: true,
      body: masterMarginModel.createMarginSchema,
      response: {
        201: SuccessSchema,
        500: ErrorSchema,
      },
    },
  )
  .patch(
    '/:id',
    async ({ params, body }) => {
      await MasterMarginService.updateMargin(params.id, body)
      return status(200, { message: 'Success' })
    },
    {
      admin: true,
      params: idParamsSchema,
      body: masterMarginModel.updateMarginSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
        500: ErrorSchema,
      },
    },
  )
  .delete(
    '/',
    async ({ body }) => {
      await MasterMarginService.deleteMargin(body.ids)
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
