import Elysia from 'elysia'
import { FilesModules } from './files'
import { KelompokModules } from './kelompok'
import { MasterAkunModules } from './master-akun'
import { MasterMarginModules } from './master-margin'
import { MasterSahamModules } from './master-saham'
import { PenggunaModules } from './pengguna'
import { WilayahModules } from './wilayah'

export const Modules = new Elysia({ prefix: 'api/v1' })
  .use(FilesModules)
  .use(MasterAkunModules)
  .use(MasterMarginModules)
  .use(MasterSahamModules)
  .use(KelompokModules)
  .use(PenggunaModules)
  .use(WilayahModules)
