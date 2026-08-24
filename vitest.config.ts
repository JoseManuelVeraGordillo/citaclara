import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config as loadEnv } from 'dotenv';

// Mismo patrón que prisma.config.ts y prisma/seed.ts: los tests de
// integración necesitan DATABASE_URL_TEST/DATABASE_URL, que no llegan por
// defecto al proceso de Vitest.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    globals: true,
  },
});
