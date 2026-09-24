import { cors } from '@elysia/cors'

export const CorsPlugin = cors({
  origin: [
    'http://localhost:3000',
    'https://ubberkahamanah.my.id',
    'https://ba-fe-production.up.railway.app',
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
})
