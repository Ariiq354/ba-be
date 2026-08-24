import Elysia from "elysia";
import { MasterAkunModules } from "./master-akun";
import { WilayahModules } from "./wilayah";

export const Modules = new Elysia({ prefix: "api/v1" }).use(MasterAkunModules).use(WilayahModules);
