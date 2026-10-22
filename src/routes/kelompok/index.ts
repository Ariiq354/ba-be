import Elysia from 'elysia'

import { kelompokModel } from './model'
import { KelompokService } from './service'

export const KelompokRoutes = new Elysia({ prefix: 'kelompok', tags: ['Kelompok'] }).get(
  '/options',
  {
    response: {
      200: kelompokModel.getKelompokOptionsResponseSchema,
    },
  },
  () => KelompokService.getKelompokOptions(),
)
