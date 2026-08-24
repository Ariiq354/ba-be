import Elysia from "elysia";
import { MasterAkunModules } from "./master-akun";
import { MasterMarginModules } from "./master-margin";
import { MasterSahamModules } from "./master-saham";
import { WilayahModules } from "./wilayah";

export const Modules = new Elysia({ prefix: "api/v1" })
  .use(MasterAkunModules)
  .use(MasterMarginModules)
  .use(MasterSahamModules)
  .use(WilayahModules);
