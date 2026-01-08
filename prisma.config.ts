import { defineConfig } from '@prisma/client/generator-helper';

export default defineConfig({
    seed: {
        command: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.ts',
    },
});
