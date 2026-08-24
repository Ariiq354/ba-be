import Elysia from "elysia";
import { MasterAkunModules } from "./master-akun";

export const Modules = new Elysia({ prefix: "api/v1" }).use(MasterAkunModules);
