import Elysia from 'elysia'

import * as KelompokModel from './model'
import { KelompokService } from './service'

export const KelompokRoutes = new Elysia({ prefix: 'kelompok', tags: ['Kelompok'] }).get(
  '/options',
  {
    response: KelompokModel.OptionsGet.Response,
  },
  () => KelompokService.getKelompokOptions(),
)
