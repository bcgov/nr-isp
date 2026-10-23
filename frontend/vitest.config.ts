import { defineConfig } from 'vitest/config'

// https://vitest.dev/config/
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    exclude: ['**/node_modules/**', '**/e2e/**'],
    globals: true,
    environment: 'jsdom',
    setupFiles: 'src/test-setup.ts',
    // Parsing Carbon's CSS is slow and no test depends on it.
    css: false,
    // Page tests render Carbon data tables several times; CI runners need more than the default
    // 5 seconds. Matches the CGI rebuild.
    testTimeout: 15000,
    coverage: {
      reporter: ['lcov', 'text-summary', 'text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/**/__tests__/**',
        'src/test-setup.ts',
      ],
    },
  },
})
