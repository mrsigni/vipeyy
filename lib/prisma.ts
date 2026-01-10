import { PrismaClient } from '@prisma/client'
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter'
import { connect } from '@tidbcloud/serverless'

// Pastikan ada fallback string kosong agar build tidak error saat ENV belum load
const connectionString = process.env.DATABASE_URL || ''

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// FIX: Tambahkan "as any" di dalam kurung connection
const connection = connect({ url: connectionString })
const adapter = new PrismaTiDBCloud(connection as any) 

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
