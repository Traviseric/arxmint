// ============================================================
// ArxMint — Prisma Client Singleton
// ============================================================
// Use only in server-side code (API routes, Server Components).
// Never import in 'use client' components.

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export { db }
