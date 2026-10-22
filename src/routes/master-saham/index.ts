import Elysia, { status } from 'elysia'

import { ErrorSchema, SuccessSchema } from '#/libs/errors'
import { AuthMacro } from '#/plugins/macro'

import { masterSahamModel } from './model'
import { MasterSahamService } from './service'

export const MasterSahamRoutes = new Elysia({
  prefix: 'master-saham',
  tags: ['Master Saham'],
})
  .use(AuthMacro)
  .get(
    '/',
    {
      admin: true,
      query: masterSahamModel.getHargaSahamQuerySchema,
      response: {
        200: masterSahamModel.getHargaSahamResponseSchema,
      },
    },
    async ({ query }) => MasterSahamService.getPaginatedHargaSaham(query),
  )
  .get(
    '/latest',
    {
      auth: true,
      response: {
        200: masterSahamModel.getLatestHargaSahamResponseSchema,
        404: ErrorSchema,
      },
    },
    async () => MasterSahamService.getLatestHargaSaham(),
  )
  .post(
    '/',
    {
      admin: true,
      body: masterSahamModel.createHargaSahamSchema,
      response: {
        201: SuccessSchema,
      },
    },
    async ({ body, user }) => {
      await MasterSahamService.createHargaSaham(user.id, body)
      return status(201, { message: 'Success' })
    },
  )
