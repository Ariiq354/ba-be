import { cors } from '@elysia/cors'
import { FRONTEND_ORIGINS } from './config'

export const CorsPlugin = cors({
  origin: FRONTEND_ORIGINS,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
})
