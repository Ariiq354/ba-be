import Elysia from "elysia";
import { MasterAkunModules } from "./master-akun";
import { MasterMarginModules } from "./master-margin";
import { MasterSahamModules } from "./master-saham";
import { WilayahModules } from "./wilayah";
import { FilesModules } from "./files";
import { PenggunaModules } from "./pengguna";
import { KelompokModules } from "./kelompok";

export const Modules = new Elysia({ prefix: "api/v1" })
  .use(FilesModules)
  .use(MasterAkunModules)
  .use(MasterMarginModules)
  .use(MasterSahamModules)
  .use(KelompokModules)
  .use(PenggunaModules)
  .use(WilayahModules);
