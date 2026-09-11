import Elysia from 'elysia'
import { kelompokModel } from './model'
import { KelompokService } from './service'

export const KelompokModules = new Elysia({ prefix: 'kelompok', tags: ['Kelompok'] }).get(
  '/options',
  () => KelompokService.getKelompokOptions(),
  {
    response: {
      200: kelompokModel.getKelompokOptionsResponseSchema,
    },
  },
)
