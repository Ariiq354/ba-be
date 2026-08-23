import Elysia from "elysia";
import { auth } from "../../utils/auth";

export const AuthModule = new Elysia({ prefix: "api/auth" }).mount(
  auth.handler,
);
