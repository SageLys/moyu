import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves this repository as a project site at /moyu/.
  base: '/moyu/',
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
