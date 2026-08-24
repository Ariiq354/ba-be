import { cors } from "@elysia/cors";

export const CorsPlugin = cors({
  origin: ["http://localhost:3000", "https://ubberkahamanah.my.id"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
});
