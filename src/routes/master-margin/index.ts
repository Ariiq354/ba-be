import Elysia, { status } from 'elysia'

import { ErrorSchema, SuccessSchema } from '#/libs/errors'
import { deleteBulkSchema, idParamsSchema } from '#/libs/schema'
import { AuthMacro } from '#/plugins/macro'

import { masterMarginModel } from './model'
import { MasterMarginService } from './service'

export const MasterMarginRoutes = new Elysia({
  prefix: 'master-margin',
  tags: ['Master Margin'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: masterMarginModel.getMarginQuerySchema,
      response: {
        200: masterMarginModel.getMarginResponseSchema,
      },
    },
    async ({ query }) => MasterMarginService.getPaginatedMargin(query),
  )
  .post(
    '/',
    {
      admin: true,
      body: masterMarginModel.createMarginSchema,
      response: {
        201: SuccessSchema,
      },
    },
    async ({ body }) => {
      await MasterMarginService.createMargin(body)
      return status(201, { message: 'Success' })
    },
  )
  .patch(
    '/:id',
    {
      admin: true,
      params: idParamsSchema,
      body: masterMarginModel.updateMarginSchema,
      response: {
        200: SuccessSchema,
        404: ErrorSchema,
      },
    },
    async ({ params, body }) => {
      await MasterMarginService.updateMargin(params.id, body)
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
      await MasterMarginService.deleteMargin(body.ids)
      return status(200, { message: 'Success' })
    },
  )
