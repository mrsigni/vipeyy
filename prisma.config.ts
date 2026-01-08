export default {
    datasources: {
        db: {
            url: process.env.DATABASE_URL,
        },
    },
    seed: {
        command: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
    },
};
