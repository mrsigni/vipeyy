import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client WITHOUT Adapter (Direct TCP to bypass Proxy restrictions)
const prisma = new PrismaClient();

async function main() {
    console.log('[Info] Verifying database connections...');

    try {
        // 1. Get all active processes
        const processes: any[] = await prisma.$queryRaw`
      SELECT ID, USER, HOST, DB, COMMAND, TIME, STATE, INFO 
      FROM INFORMATION_SCHEMA.PROCESSLIST 
      WHERE ID != CONNECTION_ID()
      AND TIME > 30
    `;

        console.log(`[Info] Active processes found: ${processes.length}`);

        if (processes.length === 0) {
            console.log('[Info] No hanging connections detected.');
            return;
        }

        console.log('[Info] Terminating connections...');
        let killedCount = 0;

        for (const p of processes) {
            const info = p.INFO ? p.INFO.substring(0, 50) + '...' : 'No info';
            console.log(`[Processing] ID: ${p.ID} | Time: ${p.TIME}s | State: ${p.STATE} | Info: ${info}`);

            try {
                await prisma.$executeRawUnsafe(`KILL ${p.ID}`);
                console.log(`[Success] Terminated process ID: ${p.ID}`);
                killedCount++;
            } catch (err: any) {
                console.error(`[Error] Failed to terminate ID: ${p.ID} - ${err.message}`);
            }
        }

        console.log(`\n[Complete] Successfully terminated ${killedCount} connections.`);

        // Verification
        const remaining: any[] = await prisma.$queryRaw`
      SELECT count(*) as count FROM INFORMATION_SCHEMA.PROCESSLIST WHERE COMMAND != 'Sleep'
    `;
        console.log(`[Status] Remaining active threads: ${remaining[0].count.toString()}`);

    } catch (error) {
        console.error('[Fatal] Execution failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
