import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  // Check if TiDB adapter should be used
  const useTiDB = process.env.USE_TIDB_ADAPTER === "true";
  
  if (useTiDB) {
    try {
      // Dynamic import for TiDB adapter
      const { PrismaTiDBCloud } = require("@tidbcloud/prisma-adapter");
      const adapter = new PrismaTiDBCloud({ url: process.env.DATABASE_URL! });
      return new PrismaClient({ 
        adapter,
        log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
      });
    } catch (error) {
      console.warn("TiDB adapter not available, using standard PrismaClient");
    }
  }
  
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown
if (typeof process !== "undefined") {
  process.on("beforeExit", async () => {
    await prisma.$disconnect();
  });
}