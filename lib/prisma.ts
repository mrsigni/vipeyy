import { PrismaClient } from '@prisma/client'
import { PrismaTiDBCloud } from '@tidbcloud/prisma-adapter'
import { connect } from '@tidbcloud/serverless'

const connectionString = `${process.env.DATABASE_URL}`

// Setup Adapter
const connection = connect({ url: connectionString })
const adapter = new PrismaTiDBCloud(connection)

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter, // <--- Gunakan adapter
    log: ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
