import Elysia from 'elysia'

import { FilesRoutes } from './files'
import { JurnalRoutes } from './jurnal'
import { KelompokRoutes } from './kelompok'
import { MasterAkunRoutes } from './master-akun'
import { MasterMarginRoutes } from './master-margin'
import { MasterSahamRoutes } from './master-saham'
import { PemindahbukuanRoutes } from './pemindahbukuan'
import { PenggunaRoutes } from './pengguna'
import { SimpananRoutes } from './simpanan'
import { WilayahRoutes } from './wilayah'

export const Routes = new Elysia({ prefix: 'api/v1' })
  .use(FilesRoutes)
  .use(JurnalRoutes)
  .use(MasterAkunRoutes)
  .use(MasterMarginRoutes)
  .use(MasterSahamRoutes)
  .use(KelompokRoutes)
  .use(PenggunaRoutes)
  .use(PemindahbukuanRoutes)
  .use(SimpananRoutes)
  .use(WilayahRoutes)
